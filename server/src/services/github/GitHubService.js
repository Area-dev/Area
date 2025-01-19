const ServiceInterface = require('../ServiceInterface');
const config = require('./configs/github');
const githubActions = require('./actions/github');
const githubReactions = require('./reactions/github');
const GitHubWebhookManager = require('./webhooks');

class GitHubService extends ServiceInterface {
  constructor() {
    super();
    this.name = config.name;
    this.actions = githubActions;
    this.reactions = githubReactions;
  }

  get config() {
    return config;
  }

  async checkPermissions(accessToken) {
    try {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: accessToken,
        userAgent: 'area-app/v1.0.0'
      });
      await octokit.rest.users.getAuthenticated();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateTrigger(trigger) {
    const action = this.actions[trigger.action];
    if (!action) {
      throw new Error(`Invalid action: ${trigger.action}`);
    }

    const actionConfig = config.actions.find(a => a.id === trigger.action);
    if (actionConfig) {
      for (const field of actionConfig.fields) {
        if (field.required && !trigger.params[field.name]) {
          throw new Error(`Missing required field: ${field.name}`);
        }
      }
    }

    if (!trigger.params.repository || !/^[^/]+\/[^/]+$/.test(trigger.params.repository)) {
      throw new Error('Invalid repository format. Must be owner/repo');
    }
  }

  async validateReaction(reaction) {
    const reactionHandler = this.reactions[reaction.action];
    if (!reactionHandler) {
      throw new Error(`Invalid reaction: ${reaction.action}`);
    }

    const reactionConfig = config.reactions.find(r => r.id === reaction.action);
    if (reactionConfig) {
      for (const field of reactionConfig.fields) {
        if (field.required && !reaction.params[field.name]) {
          throw new Error(`Missing required field: ${field.name}`);
        }
      }
    }

    if (reaction.params.repository && !/^[^/]+\/[^/]+$/.test(reaction.params.repository)) {
      throw new Error('Invalid repository format. Must be owner/repo');
    }
  }

  async initializeTrigger(userId, trigger, automationId) {
    console.log(`Initializing GitHub webhook for automation ${automationId}`);
    
    try {
      const result = await GitHubWebhookManager.setupWebhook(
        userId,
        trigger.params.repository,
        {
          automationId,
          ...trigger.params
        }
      );

      console.log('GitHub webhook initialized:', result);
      return result;
    } catch (error) {
      console.error('Error initializing GitHub webhook:', error);
      throw new Error('Failed to initialize GitHub webhook: ' + error.message);
    }
  }

  async stopTrigger(userId, trigger, automationId) {
    console.log(`Stopping GitHub webhook for automation ${automationId}`);
    
    try {
      await GitHubWebhookManager.stopWebhook(automationId);
      console.log('GitHub webhook stopped successfully');
      return true;
    } catch (error) {
      console.error('Error stopping GitHub webhook:', error);
      throw new Error('Failed to stop GitHub webhook: ' + error.message);
    }
  }
}

module.exports = GitHubService; 