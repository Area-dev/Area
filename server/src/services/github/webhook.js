const crypto = require('crypto');
const Webhook = require('../../models/Webhook');
const User = require('../../models/User');

class GitHubWebhookManager {
  constructor() {
    this.processedEvents = new Map();

    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.processedEvents.entries()) {
        if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
          this.processedEvents.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  getWebhookBaseUrl() {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:8000';
    return baseUrl;
  }

  async setupWebhook(userId, repository, config) {
    console.log('Setting up GitHub webhook for repository:', repository);
    const [owner, repo] = repository.split('/');
    const webhookSecret = this.generateWebhookSecret();

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const githubConnection = user.serviceConnections.find(
      conn => conn.service === 'github'
    );

    if (!githubConnection) {
      throw new Error('GitHub connection not found');
    }

    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ 
      auth: githubConnection.accessToken,
      userAgent: 'area-app/v1.0.0'
    });

    try {
      // Check if webhook already exists
      const { data: existingWebhooks } = await octokit.rest.repos.listWebhooks({
        owner,
        repo
      });

      const webhookUrl = `${this.getWebhookBaseUrl()}/webhooks/github`;
      let webhookId;

      console.log('Creating new webhook');
      const response = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: webhookSecret
        },
        events: ['issues', 'pull_request', 'push']
      });
      webhookId = response.data.id;

      console.log('Creating webhook in database');
      await Webhook.create({
        channelId: config.automationId,
        userId,
        service: 'github',
        automationId: config.automationId,
        config: {
          ...config,
          webhookId,
          webhookSecret,
          repository
        }
      });

      console.log('GitHub webhook setup completed:', {
        webhookId,
        repository
      });

      return {
        webhookId,
        webhookSecret
      };
    } catch (error) {
      console.error('Error setting up GitHub webhook:', error);
      throw new Error('Failed to setup GitHub webhook: ' + error.message);
    }
  }

  async stopWebhook(automationId) {
    console.log('Stopping GitHub webhook for automation:', automationId);
    const webhook = await Webhook.findOne({ automationId });
    
    if (!webhook) {
      console.log('No webhook found for automation:', automationId);
      return;
    }

    const user = await User.findById(webhook.userId);
    if (!user) {
      console.log('User not found for webhook:', webhook.userId);
      return;
    }

    const githubConnection = user.serviceConnections.find(
      conn => conn.service === 'github'
    );

    if (!githubConnection) {
      console.log('GitHub connection not found for user:', user._id);
      return;
    }

    try {
      const [owner, repo] = webhook.config.repository.split('/');
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: githubConnection.accessToken,
        userAgent: 'area-app/v1.0.0'
      });

      // Check if other automations are using this webhook
      const otherWebhooks = await Webhook.find({
        'config.repository': webhook.config.repository,
        automationId: { $ne: automationId }
      });

      if (otherWebhooks.length === 0) {
        console.log('No other automations using this webhook, deleting it');
        await octokit.rest.repos.deleteWebhook({
          owner,
          repo,
          hook_id: webhook.config.webhookId
        });
      } else {
        console.log('Other automations are using this webhook, keeping it active');
      }

      await Webhook.deleteOne({ automationId });
      console.log('GitHub webhook cleanup completed');
    } catch (error) {
      console.error('Error cleaning up GitHub webhook:', error);
      throw new Error('Failed to cleanup GitHub webhook: ' + error.message);
    }
  }

  isEventProcessed(eventKey) {
    return this.processedEvents.has(eventKey);
  }

  markEventProcessed(eventKey) {
    this.processedEvents.set(eventKey, Date.now());
  }

  verifyWebhookSignature(payload, signature, secret) {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(payload).digest('hex');
      const result = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
      
      console.log('Signature verification result:', result);
      return result;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

module.exports = new GitHubWebhookManager(); 