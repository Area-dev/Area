const { google } = require('googleapis');
const ServiceInterface = require('../ServiceInterface');
const GoogleWatcher = require('./watchers');
const config = require('./configs/calendar');
const actions = require('./actions/calendar')
const reactions = require('./reactions/calendar')

class CalendarService extends ServiceInterface {
  constructor() {
    super();
    this.name = config.name;
    this.actions = actions;
    this.reactions = reactions;
  }

  get config() {
    return config;
  }

  async checkPermissions(accessToken) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth });
      
      await calendar.calendars.get({ calendarId: 'primary' });
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

    // Validation des champs requis à partir de la configuration du service
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

    // Validation des champs requis à partir de la configuration du service
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

module.exports = CalendarService; 