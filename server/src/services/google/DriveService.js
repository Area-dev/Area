const { google } = require('googleapis');
const ServiceInterface = require('../ServiceInterface');
const GoogleWatcher = require('./watchers');
const config = require('./configs/drive');
const driveActions = require('./actions/drive');
const driveReactions = require('./reactions/drive');

class DriveService extends ServiceInterface {
  constructor() {
    super();
    this.name = config.name;
    this.actions = driveActions;
    this.reactions = driveReactions;
  }

  get config() {
    return config;
  }

  async checkPermissions(accessToken) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth });
      
      await drive.files.list({ pageSize: 1 });
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
  }

  async initializeTrigger(userId, trigger, automationId) {
    const service = trigger.action.split('_')[0];
    console.log("Initialize Trigger for service:", service);
    return GoogleWatcher.startWatch(userId, service, {
      automationId,
      ...trigger.params
    });
  }

  async stopTrigger(userId, trigger, automationId) {
    const service = trigger.action.split('_')[0];
    return GoogleWatcher.stopWatch(automationId);
  }
}

module.exports = DriveService;