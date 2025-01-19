const express = require('express');
const router = express.Router();
const { verifyGoogleWebhook } = require('../../middleware/webhookAuth');
const Automation = require('../../models/Automation');
const User = require('../../models/User');
const { google } = require('googleapis');
const ServiceManager = require('../../services/ServiceManager');
const Webhook = require('../../models/Webhook');
const GoogleWatcher = require('../../services/google/watchers');
const webhookManager = require('../../services/google/webhooks');

const GOOGLE_SERVICES = {
  'gmail': 'google',
  'calendar': 'google',
  'drive': 'google'
};

const getParentService = (serviceName) => {
  return GOOGLE_SERVICES[serviceName] || serviceName;
};

const getLatestCalendarEvents = async (auth, calendarId) => {
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    const timeMin = new Date(Date.now() - 60 * 1000);
    
    console.log('Fetching calendar events with params:', {
      calendarId,
      timeMin: timeMin.toISOString()
    });

    const response = await calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: timeMin.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'updated',
      showDeleted: false,
      updatedMin: timeMin.toISOString()
    });

    console.log('Calendar API response:', {
      itemsCount: response.data.items?.length,
      nextPageToken: response.data.nextPageToken,
      nextSyncToken: response.data.nextSyncToken
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.log('No events found in the specified time range');
      return null;
    }

    const events = response.data.items;
    const latestEvent = events.reduce((latest, current) => {
      const latestCreated = new Date(latest.created);
      const currentCreated = new Date(current.created);
      return currentCreated > latestCreated ? current : latest;
    }, events[0]);

    console.log('Found latest event: id -> ' + latestEvent.id);

    return latestEvent;
  } catch (error) {
    console.error('Error getting calendar events:', error);
    throw error;
  }
};

const executeAutomationReactions = async (automation, triggerData, user) => {
  const connection = user.serviceConnections.find(conn => conn.service === getParentService(automation.trigger.service));
  
  if (!connection) {
    throw new Error('Google service not connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken
  });

  for (const reaction of automation.reactions) {
    try {
      console.log("Service Reaction " + reaction.service);

      const service = ServiceManager.getService(reaction.service);
      const reactionHandler = service.reactions[reaction.action];
      if (!reactionHandler || !reactionHandler.handler) {
        throw new Error(`Unsupported reaction: ${reaction.action}`);
      }

      const result = await reactionHandler.handler(reaction.params, oauth2Client, triggerData);
      
      automation.executionHistory = automation.executionHistory || [];
      automation.executionHistory.push({
        timestamp: new Date(),
        status: 'success',
        details: { reaction: reaction.action, triggerEvent: triggerData.id, result }
      });
    } catch (error) {
      console.error(`Reaction error (${reaction.action}):`, error);
      automation.executionHistory.push({
        timestamp: new Date(),
        status: 'error',
        details: { reaction: reaction.action, error: error.message }
      });
    }
  }
  
  await automation.save();
};

const processedMessages = new Map();

setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, timestamp] of processedMessages.entries()) {
    if (timestamp < fiveMinutesAgo) {
      processedMessages.delete(key);
    }
  }
}, 60 * 1000);

router.post('/calendar', verifyGoogleWebhook, async (req, res) => {
  console.log('Calendar webhook received');
  
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const resourceId = req.headers['x-goog-resource-id'];
    
    console.log('Webhook details: channelId -> ', channelId);
    
    if (!channelId) {
      return res.status(400).send('Missing channelId');
    }

    const automation = await Automation.findById(channelId);
    console.log('Found automation:', automation);
    
    if (!automation) {
      return res.status(404).send('Automation not found');
    }

    if (!automation.active) {
      console.log('Automation is not active, ignoring event');
      return res.status(200).send('Automation is not active');
    }

    if (resourceState !== 'exists' && resourceState !== 'sync') {
      console.log('Ignored non-create event:', resourceState);
      return res.status(200).send('Ignored non-create event');
    }

    const user = await User.findById(automation.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const connection = user.serviceConnections.find(
      conn => conn.service === getParentService('calendar')
    );

    if (!connection) {
      throw new Error('Google connection not found');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    });

    console.log('Fetching latest calendar events...');
    const latestEvent = await getLatestCalendarEvents(
      oauth2Client,
      automation.trigger.params?.calendarId || 'primary'
    );

    if (!latestEvent) {
      console.log('No new events found');
      return res.status(200).send('No new events');
    }

    console.log('Latest event found: id=' + latestEvent.id);

    console.log('Executing reactions...');
    await executeAutomationReactions(automation, latestEvent, user);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Calendar webhook error:', error);
    res.status(200).send('Processed with errors');
  }
});

router.post('/gmail', verifyGoogleWebhook, async (req, res) => {
  console.log('Gmail webhook received');

  try {
    const message = req.body?.message;
    if (!message) {
      return res.status(200).json({
        status: 'invalid',
        error: 'No message found'
      });
    }

    if (processedMessages.has(message.messageId)) {
      console.log(`Message ${message.messageId} already processed, acknowledging`);
      return res.status(200).json({ 
        status: 'acknowledged',
        reason: 'already_processed' 
      });
    }

    const publishTime = new Date(message.publishTime).getTime();
    const now = Date.now();
    if (now - publishTime > 5 * 60 * 1000) {
      console.log(`Message ${message.messageId} too old, acknowledging`);
      return res.status(200).json({ 
        status: 'acknowledged',
        reason: 'too_old' 
      });
    }

    let data;
    try {
      const decodedData = Buffer.from(message.data, 'base64').toString();
      data = JSON.parse(decodedData);
      console.log('Decoded Pub/Sub data:', data);
    } catch (error) {
      console.error('Error decoding message:', error);
      return res.status(200).json({
        status: 'acknowledged',
        error: 'Invalid message format'
      });
    }

    const automations = await Automation.find({
      active: true,
      'trigger.service': 'gmail'
    });

    console.log(`Found ${automations.length} active Gmail automations`);

    let processedSuccessfully = false;

    for (const automation of automations) {
      try {
        const alreadyProcessed = automation.executionHistory?.some(
          history => history.details?.messageId === message.messageId
        );

        if (alreadyProcessed) {
          console.log(`Message ${message.messageId} already processed by automation ${automation._id}`);
          continue;
        }

        const user = await User.findById(automation.userId);
        if (!user) continue;

        const connection = user.serviceConnections.find(
          conn => conn.service === getParentService('gmail')
        );

        if (!connection) continue;

        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_CALLBACK_URL
        );

        oauth2Client.setCredentials({
          access_token: connection.accessToken,
          refresh_token: connection.refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 1,
          q: `newer_than:1m`
        });

        if (!response.data.messages || response.data.messages.length === 0) {
          console.log('No recent messages found');
          continue;
        }

        const emailMessage = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.messages[0].id
        });

        const headers = emailMessage.data.payload.headers;
        const from = headers.find(h => h.name === 'From')?.value;
        const subject = headers.find(h => h.name === 'Subject')?.value;

        if (automation.trigger.params?.fromEmail && 
            !from?.includes(automation.trigger.params.fromEmail)) {
          console.log('Email filtered out: sender does not match');
          continue;
        }

        await executeAutomationReactions(automation, emailMessage.data, user);
        processedSuccessfully = true;

      } catch (error) {
        console.error(`Error processing automation ${automation._id}:`, error);
      }
    }

    if (processedSuccessfully) {
      processedMessages.set(message.messageId, Date.now());
    }

    res.status(200).json({ 
      status: 'acknowledged',
      processed: processedSuccessfully 
    });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    res.status(200).json({
      status: 'acknowledged',
      error: error.message
    });
  }
});

router.post('/drive', async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    console.log('Drive webhook received: ' + channelId);

    if (!channelId) {
      console.log('Missing channel ID in request');
      return res.status(400).send('Missing channel ID');
    }

    const automation = await Automation.findById(channelId);
    
    if (!automation) {
      console.log('No automation found for channelId:', channelId);
      return res.status(404).send('Automation not found');
    }

    if (!automation.active) {
      console.log('Automation is not active, ignoring event');
      return res.status(200).send('Automation is not active');
    }

    const eventKey = `${channelId}:${resourceId}:${resourceState}`;
    if (webhookManager.isEventProcessed(eventKey)) {
      console.log('Event already processed, skipping. Event key:', eventKey);
      return res.status(200).send('Event already processed');
    }

    const user = await User.findById(automation.userId);
    if (!user) {
      console.log('User not found for automation:', automation.userId);
      return res.status(200).send('User not found');
    }

    const googleConnection = user.serviceConnections.find(
      conn => conn.service === 'google'
    );

    if (!googleConnection) {
      console.log('No Google connection found for user:', user._id);
      return res.status(200).send('Google connection not found');
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    auth.setCredentials({
      access_token: googleConnection.accessToken,
      refresh_token: googleConnection.refreshToken
    });

    webhookManager.processedEvents.set(eventKey, Date.now());

    switch (resourceState) {
      case 'sync':
        console.log('Drive webhook sync received');
        break;

      case 'add':
      case 'change':
      case 'update':
        console.log('Processing Drive change event');
        const actionHandler = require('../../services/google/actions/drive')[automation.trigger.action];
        if (!actionHandler) {
          console.error('Action handler not found:', automation.trigger.action);
          return res.status(200).send('Invalid action');
        }

        console.log('Checking action conditions for:', automation.trigger.action);
        const actionResult = await actionHandler.handler(automation.trigger.params, auth);
        console.log('Action result:', actionResult);
        
        if (actionResult) {
          console.log('Action conditions met, executing reactions');
          try {
            await executeAutomationReactions(automation, actionResult, user);
            console.log('Reactions executed successfully');
          } catch (error) {
            console.error('Error executing reactions:', error);
            console.error('Error details:', error.response?.data || error);
          }
        } else {
          console.log('Action conditions not met, skipping reactions');
        }
        break;

      case 'remove':
        console.log('Drive file removed');
        break;

      default:
        console.warn('Unknown Drive resource state:', resourceState);
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing Drive webhook:', error);
    console.error('Error details:', error.response?.data || error);
    res.status(200).send('Webhook processed with errors');
  }
});

module.exports = router;