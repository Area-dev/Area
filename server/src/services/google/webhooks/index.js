const { google } = require('googleapis');
const crypto = require('crypto');
const Webhook = require('../../../models/Webhook');
const User = require('../../../models/User');

class GoogleWebhookManager {
  constructor() {
    this.processedEvents = new Map();

    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.processedEvents.entries()) {
        if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
          this.processedEvents.delete(key);
        }
      }
    }, 7 * 60 * 1000);
  }

  generateChannelId() {
    return crypto.randomBytes(32).toString('hex');
  }

  getWebhookBaseUrl() {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:8000';
    console.log('Using webhook base URL:', baseUrl);
    return baseUrl;
  }

  async setupWebhook(service, userId, config) {
    console.log('Setting up webhook for service:', service, 'with config:', config);
    const channelId = config.automationId.toString();
    
    const webhook = {
      id: channelId,
      address: `${this.getWebhookBaseUrl()}/webhooks/google/${service}`,
      type: 'web_hook',
      params: {
        ttl: '3600'
      }
    };

    console.log('Created webhook configuration:', webhook);

    await this.stopWebhook(channelId);
    await Webhook.deleteOne({ channelId });

    const newWebhook = await Webhook.create({
      channelId,
      userId,
      service,
      automationId: config.automationId,
      config,
      expiration: Date.now() + (3600 * 1000)
    });
    console.log('Saved webhook to database:', newWebhook);

    return webhook;
  }

  isEventProcessed(eventKey) {
    return this.processedEvents.has(eventKey);
  }

  async stopWebhook(channelId, resourceId) {
    console.log('Stopping webhook:', { channelId, resourceId });
    const webhook = await Webhook.findOne({ channelId });
    if (webhook) {
      await this.stopServiceWatch(webhook.service, channelId, resourceId);
      await Webhook.deleteOne({ channelId });
    }
  }

  async stopServiceWatch(service, channelId, resourceId) {
    const webhook = await Webhook.findOne({ channelId });
    if (!webhook) return;

    const user = await User.findById(webhook.userId);
    if (!user) return;

    const googleConnection = user.serviceConnections.find(
      conn => conn.service === 'google'
    );

    if (!googleConnection) return;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: googleConnection.accessToken,
      refresh_token: googleConnection.refreshToken
    });

    try {
      switch (service) {
        case 'gmail':
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          await gmail.users.stop({
            userId: 'me',
            resource: { resourceId }
          });
          break;
        
        case 'calendar':
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          await calendar.channels.stop({
            resource: {
              id: channelId,
              resourceId
            }
          });
          break;

        case 'drive':
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          await drive.channels.stop({
            resource: {
              id: channelId,
              resourceId
            }
          });
          break;
      }
    } catch (error) {
      console.error(`Error stopping ${service} watch:`, error);
    }
  }

  async cleanupExpiredWebhooks() {
    const expiredWebhooks = await Webhook.find({
      expiration: { $lt: Date.now() }
    });

    for (const webhook of expiredWebhooks) {
      await this.stopWebhook(webhook.channelId, webhook.resourceId);
    }
  }
}

module.exports = new GoogleWebhookManager(); 