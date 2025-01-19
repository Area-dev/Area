const { google } = require('googleapis');
const webhookManager = require('../webhooks');
const User = require('../../../models/User');
const Webhook = require('../../../models/Webhook');

class GoogleWatcher {
  constructor() {
    this.watchers = new Map();
    this.intervals = new Map();
  }

  async getAuthClient(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const googleConnection = user.serviceConnections.find(
        conn => conn.service === 'google'
      );

      if (!googleConnection) {
        throw new Error('Google connection not found');
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      );

      oauth2Client.setCredentials({
        access_token: googleConnection.accessToken,
        refresh_token: googleConnection.refreshToken
      });

      return oauth2Client;
    } catch (error) {
      console.error('Error getting auth client:', error);
      throw error;
    }
  }

  async startWatch(userId, service, config) {
    console.log('Starting watch for:', {
      userId,
      service,
      config
    });
    
    const webhook = await webhookManager.setupWebhook(service, userId, config);
    console.log('Webhook setup:', webhook);
    
    try {
      switch (service) {
        case 'gmail':
          await this.watchGmail(userId, webhook, config);
          break;
        case 'calendar':
          await this.watchCalendar(userId, webhook, config);
          break;
        case 'drive':
          await this.watchDrive(userId, webhook, config);
          break;
        default:
          throw new Error(`Unsupported service: ${service}`);
      }

      this.setupAutoRenewal(userId, service, webhook.id);
      console.log('Watch started successfully');
      return webhook;
    } catch (error) {
      console.error('Failed to start watch:', error);
      throw error;
    }
  }

  async watchGmail(userId, webhook, config) {
    const gmail = google.gmail({ version: 'v1', auth: await this.getAuthClient(userId) });
    console.log("TOPIC: " + process.env.TOPIC_NAME)
    
    try {
      const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          topicName: process.env.TOPIC_NAME,
          labelFilterAction: 'include'
        }
      });

      this.watchers.set(webhook.id, {
        type: 'gmail',
        historyId: response.data.historyId,
        expiration: response.data.expiration,
        config
      });
    } catch (error) {
      console.error('Gmail watch error:', error);
      throw new Error('Failed to setup Gmail watch');
    }
  }

  async watchCalendar(userId, webhook, config) {
    console.log('Setting up calendar watch:', {
      userId,
      webhook,
      config
    });
    
    const calendar = google.calendar({ version: 'v3', auth: await this.getAuthClient(userId) });
    
    try {
      const response = await calendar.events.watch({
        calendarId: config.calendarId || 'primary',
        requestBody: {
          id: webhook.id,
          type: 'web_hook',
          address: webhook.address
        }
      });

      console.log('Calendar watch response:', response.data);

      this.watchers.set(webhook.id, {
        type: 'calendar',
        resourceId: response.data.resourceId,
        expiration: response.data.expiration,
        config
      });
    } catch (error) {
      console.error('Calendar watch error:', error);
      throw new Error('Failed to setup Calendar watch: ' + error.message);
    }
  }

  async watchDrive(userId, webhook, config) {
    const drive = google.drive({ version: 'v3', auth: await this.getAuthClient(userId) });
    
    try {
      let pageToken;
      let targetId;

      // Find the target file or folder to watch
      if (config.folderName) {
        const folderResponse = await drive.files.list({
          q: `name = '${config.folderName}' and mimeType = 'application/vnd.google-apps.folder'`,
          fields: 'files(id)'
        });
        
        if (folderResponse.data.files.length > 0) {
          targetId = folderResponse.data.files[0].id;
        }
      }

      console.log('Setting up Drive watch with webhook:', webhook);
      const response = await drive.changes.watch({
        pageToken: await this.getDriveStartPageToken(drive),
        requestBody: {
          id: webhook.id,
          type: 'web_hook',
          address: webhook.address,
          ...(targetId && { resourceId: targetId })
        }
      });
      console.log('Drive watch response:', response.data);

      this.watchers.set(webhook.id, {
        type: 'drive',
        resourceId: response.data.resourceId,
        expiration: response.data.expiration,
        config
      });
    } catch (error) {
      console.error('Drive watch error:', error);
      throw new Error('Failed to setup Drive watch: ' + error.message);
    }
  }

  async getDriveStartPageToken(drive) {
    try {
      const response = await drive.changes.getStartPageToken({});
      return response.data.startPageToken;
    } catch (error) {
      console.error('Error getting Drive start page token:', error);
      throw error;
    }
  }

  setupAutoRenewal(userId, service, watcherId) {
    const interval = setInterval(async () => {
      const watcher = this.watchers.get(watcherId);
      if (watcher && Date.now() > watcher.expiration - 3600000) {
        await this.renewWatch(userId, service, watcherId);
      }
    }, 3600000);

    this.intervals.set(watcherId, interval);
  }

  async renewWatch(userId, service, watcherId) {
    const watcher = this.watchers.get(watcherId);
    if (!watcher) return;

    await this.stopWatch(watcherId);
    await this.startWatch(userId, service, watcher.config);
  }

  async stopWatch(watcherId) {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      await webhookManager.stopWebhook(watcherId, watcher.resourceId);
      this.watchers.delete(watcherId);
      
      const interval = this.intervals.get(watcherId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(watcherId);
      }
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
  }
}

module.exports = new GoogleWatcher();