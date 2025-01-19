const { google } = require('googleapis');

const calendarReactions = {
  calendar_create_event: {
    handler: async (params, auth, triggerData) => {
      const calendar = await getCalendarClient(auth.access_token);
      let { summary, description, start, end, attendees } = params;

      // Si on a des triggerData, on les utilise intelligemment selon leur type
      if (triggerData) {
        // Pour les emails
        if (triggerData.messageId) {
          summary = summary.replace('{{emailSubject}}', triggerData.subject);
          description = description ? description.replace('{{emailBody}}', triggerData.body) : triggerData.body;
          if (triggerData.from) {
            attendees = attendees ? `${attendees},${triggerData.from}` : triggerData.from;
          }
        }

        // Pour les fichiers Drive
        if (triggerData.fileId) {
          summary = summary.replace('{{filename}}', triggerData.name);
          description = description ? description.replace('{{fileLink}}', triggerData.webViewLink) : `File: ${triggerData.webViewLink}`;
          if (triggerData.sharedWith) {
            attendees = attendees ? `${attendees},${triggerData.sharedWith}` : triggerData.sharedWith;
          }
        }

        // Remplacement générique pour tout autre champ
        Object.entries(triggerData).forEach(([key, value]) => {
          if (typeof value === 'string') {
            const placeholder = `{{${key}}}`;
            summary = summary.replace(placeholder, value);
            if (description) {
              description = description.replace(placeholder, value);
            }
          }
        });
      }

      const event = {
        summary,
        description,
        start: { dateTime: start },
        end: { dateTime: end }
      };

      if (attendees) {
        event.attendees = attendees.split(',').map(email => ({ email: email.trim() }));
      }

      try {
        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          sendUpdates: 'all'  // Envoie des invitations aux participants
        });

        return {
          eventId: res.data.id,
          htmlLink: res.data.htmlLink,
          summary: res.data.summary,
          attendees: res.data.attendees || []
        };
      } catch (error) {
        console.error('Error creating calendar event:', error);
        throw new Error('Failed to create calendar event: ' + error.message);
      }
    }
  },

  calendar_modify_event: {
    handler: async (params, auth) => {
      const calendar = google.calendar({ version: 'v3', auth });
      
      try {
        const existingEvent = await calendar.events.get({
          calendarId: params.calendarId || 'primary',
          q: params.summary
        });

        const updatedEvent = {
          ...existingEvent.data,
          summary: params.summary || existingEvent.data.summary,
          description: params.description || existingEvent.data.description,
        };

        if (params.startDateTime) {
          updatedEvent.start = {
            dateTime: params.startDateTime,
            timeZone: params.timeZone || existingEvent.data.start.timeZone || 'UTC'
          };
        }
        if (params.endDateTime) {
          updatedEvent.end = {
            dateTime: params.endDateTime,
            timeZone: params.timeZone || existingEvent.data.end.timeZone || 'UTC'
          };
        }

        const response = await calendar.events.update({
          calendarId: params.calendarId || 'primary',
          eventId: params.eventId,
          resource: updatedEvent
        });

        return {
          eventId: response.data.id,
          status: response.data.status,
          htmlLink: response.data.htmlLink
        };
      } catch (error) {
        console.error('Error modifying Calendar event:', error);
        throw new Error('Failed to modify Calendar event: ' + error.message);
      }
    }
  },

  calendar_send_invitation: {
    handler: async (params, auth) => {
      const calendar = google.calendar({ version: 'v3', auth });
      
      try {
        // const existingEvent = await calendar.events.list({
        //   calendarId: params.calendarId || 'primary',
        //   q: params.summary,
        //   maxResults: 1,
        //   orderBy: 'startTime',
        //   singleEvents: true
        // });

        // const updatedEvent = {
        //   ...existingEvent.data,
        //   attendees: [
        //     ...(existingEvent.data.attendees || []),
        //     ...params.attendees.map(email => ({ email }))
        //   ]
        // };

        // const response = await calendar.events.patch({
        //   calendarId: params.calendarId || 'primary',
        //   eventId: existingEvent.data.id,
        //   sendUpdates: 'all',
        //   requestBody: updatedEvent
        // });

        // return {
        //   eventId: response.data.id,
        //   status: response.data.status,
        //   htmlLink: response.data.htmlLink,
        //   attendees: response.data.attendees || []
        // };

        const eventList = await calendar.events.list({
          calendarId: 'primary',
          q: params.summary,
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime'
        });

        console.log('Found events:', eventList.data.items?.length || 0);

        if (!eventList.data.items || eventList.data.items.length === 0) {
          throw new Error(`No event found with summary: ${params.summary}`);
        }
  
        // 2. Find exact match
        const matchingEvent = eventList.data.items.find(
          event => event.summary === params.summary
        );
  
        if (!matchingEvent) {
          throw new Error(`No exact match found for event: ${params.summary}`);
        }
  
        console.log('Found matching event:', {
          id: matchingEvent.id,
          summary: matchingEvent.summary
        });
  
        // 3. Update attendees
        const updatedEvent = {
          ...matchingEvent,
          attendees: [
            ...(matchingEvent.attendees || []),
            ...params.attendees.map(email => ({
              email,
              responseStatus: 'needsAction'
            }))
          ]
        };
  
        // 4. Send invitations
        console.log('Sending invitations to:', params.attendees);
        const response = await calendar.events.patch({
          calendarId: 'primary',
          eventId: matchingEvent.id,
          sendUpdates: 'all',
          requestBody: updatedEvent
        });
        return {
          eventId: response.data.id,
          summary: response.data.summary,
          status: response.data.status,
          htmlLink: response.data.htmlLink,
          attendees: response.data.attendees || []
        };
      } catch (error) {
        console.error('Error sending Calendar invitation:', error);
        throw new Error('Failed to send Calendar invitation: ' + error.message);
      }
    }
  }
};

module.exports = calendarReactions; 