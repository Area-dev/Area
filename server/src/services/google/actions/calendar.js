const { google } = require('googleapis');

const calendarActions = {
  calendar_new_event: {
    handler: async (params, auth) => {
      const calendar = google.calendar({ version: 'v3', auth });
      
      try {
        const response = await calendar.events.list({
          calendarId: params.calendarId || 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 1,
          singleEvents: true,
          orderBy: 'startTime'
        });

        if (!response.data.items || response.data.items.length === 0) {
          return null;
        }

        const event = response.data.items[0];
        return {
          eventId: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees || []
        };
      } catch (error) {
        console.error('Error checking Calendar:', error);
        throw new Error('Failed to check Calendar: ' + error.message);
      }
    }
  },

  // calendar_event_starting_soon: {
  //   handler: async (params, auth) => {
  //     const calendar = google.calendar({ version: 'v3', auth });
  //     const minutesBefore = params.minutesBefore || 15;
      
  //     try {
  //       const now = new Date();
  //       const timeMin = now.toISOString();
  //       const timeMax = new Date(now.getTime() + (minutesBefore * 60 * 1000)).toISOString();

  //       const response = await calendar.events.list({
  //         calendarId: params.calendarId || 'primary',
  //         timeMin,
  //         timeMax,
  //         maxResults: 10,
  //         singleEvents: true,
  //         orderBy: 'startTime'
  //       });

  //       if (!response.data.items || response.data.items.length === 0) {
  //         return null;
  //       }

  //       const upcomingEvents = response.data.items.filter(event => {
  //         const startTime = new Date(event.start.dateTime || event.start.date);
  //         const timeUntilStart = (startTime.getTime() - now.getTime()) / (60 * 1000);
  //         return timeUntilStart <= minutesBefore && timeUntilStart > 0;
  //       });

  //       if (upcomingEvents.length === 0) {
  //         return null;
  //       }

  //       const event = upcomingEvents[0];
  //       return {
  //         eventId: event.id,
  //         summary: event.summary,
  //         description: event.description,
  //         start: event.start,
  //         end: event.end,
  //         minutesUntilStart: Math.round((new Date(event.start.dateTime || event.start.date).getTime() - now.getTime()) / (60 * 1000)),
  //         attendees: event.attendees || []
  //       };
  //     } catch (error) {
  //       console.error('Error checking upcoming events:', error);
  //       throw new Error('Failed to check upcoming events: ' + error.message);
  //     }
  //   }
  // },

  calendar_event_starting_soon: {
    handler: async (params, auth) => {
      const calendar = google.calendar({ version: 'v3', auth });
      const minutesBefore = params.minutesBefore || 15;
      const toleranceMinutes = 1;
      
      try {
        const now = new Date();
        const targetTime = new Date(now.getTime() + (minutesBefore * 60 * 1000));
        
        const response = await calendar.events.list({
          calendarId: params.calendarId || 'primary',
          timeMin: now.toISOString(),
          timeMax: targetTime.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 10
        });
  
        if (!response.data.items?.length) return null;

        const upcomingEvent = response.data.items.find(event => {
          const startTime = new Date(event.start.dateTime || event.start.date);
          const minutesUntilStart = (startTime.getTime() - now.getTime()) / (60 * 1000);
          return Math.abs(minutesUntilStart - minutesBefore) <= toleranceMinutes;
        });
  
        if (!upcomingEvent) return null;
  
        return {
          eventId: upcomingEvent.id,
          summary: upcomingEvent.summary,
          description: upcomingEvent.description,
          start: upcomingEvent.start,
          end: upcomingEvent.end,
          minutesUntilStart: minutesBefore,
          attendees: upcomingEvent.attendees || []
        };
      } catch (error) {
        console.error('Error checking upcoming events:', error);
        throw new Error('Failed to check upcoming events: ' + error.message);
      }
    }
  },

  calendar_event_updated: {
    handler: async (params, auth) => {
      const calendar = google.calendar({ version: 'v3', auth });
      
      try {
        const response = await calendar.events.list({
          calendarId: params.calendarId || 'primary',
          updatedMin: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 dernières minutes
          showDeleted: params.trackCancellations !== false,
          singleEvents: true,
          orderBy: 'updated'
        });

        if (!response.data.items || response.data.items.length === 0) {
          return null;
        }

        const event = response.data.items[0];

        if (event.status === 'cancelled') {
          return {
            eventId: event.id,
            summary: event.summary,
            status: 'cancelled',
            updated: event.updated
          };
        }

        return {
          eventId: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          status: event.status,
          updated: event.updated,
          attendees: event.attendees || []
        };
      } catch (error) {
        console.error('Error checking updated events:', error);
        throw new Error('Failed to check updated events: ' + error.message);
      }
    }
  }
};

module.exports = calendarActions; 