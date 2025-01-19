module.exports = {
  name: 'calendar',
  displayName: 'Google Calendar',
  description: 'Calendar service for managing events and appointments',
  category: 'productivity',
  
  auth: {
    type: 'oauth2',
    credentials: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.SERVER_URL}/auth/google/callback`
    },
    scopes: ['https://www.googleapis.com/auth/calendar']
  },
  
  actions: [
    {
      id: 'calendar_new_event',
      name: 'New event created',
      description: 'Triggered when a new event is created in your calendar',
      fields: [
        {
          name: 'calendarId',
          type: 'string',
          description: 'Which calendar to monitor (use "primary" for main calendar)',
          required: true,
          default: 'primary'
        }
      ]
    },
    {
      id: 'calendar_event_starting_soon',
      name: 'Event starting soon',
      description: 'Triggered when an event is about to start',
      fields: [
        {
          name: 'calendarId',
          type: 'string',
          description: 'Which calendar to monitor (use "primary" for main calendar)',
          required: true,
          default: 'primary'
        },
        {
          name: 'minutesBefore',
          type: 'number',
          description: 'How many minutes before the event should this trigger',
          required: true,
          default: 15
        }
      ]
    },
    {
      id: 'calendar_event_updated',
      name: 'Event modified or cancelled',
      description: 'Triggered when an event is modified or cancelled',
      fields: [
        {
          name: 'calendarId',
          type: 'string',
          description: 'Which calendar to monitor (use "primary" for main calendar)',
          required: true,
          default: 'primary'
        },
        {
          name: 'trackCancellations',
          type: 'boolean',
          description: 'Also trigger when events are cancelled',
          required: false,
          default: true
        }
      ]
    }
  ],
  
  reactions: [
    {
      id: 'calendar_create_event',
      name: 'Create new event',
      description: 'Creates a new event in your calendar',
      fields: [
        {
          name: 'title',
          type: 'string',
          description: 'Title of the event',
          required: true
        },
        {
          name: 'description',
          type: 'string',
          description: 'Description of the event',
          required: true
        },
        {
          name: 'startDateTime',
          type: 'datetime',
          description: 'When the event starts',
          required: true
        },
        {
          name: 'endDateTime',
          type: 'datetime',
          description: 'When the event ends',
          required: true
        }
      ]
    },
    {
      id: 'calendar_modify_event',
      name: 'Modify existing event',
      description: 'Modify an existing event by its title',
      fields: [
        {
          name: 'currentTitle',
          type: 'string',
          description: 'Current title of the event to modify',
          required: true
        },
        {
          name: 'newTitle',
          type: 'string',
          description: 'New title for the event',
          required: false
        },
        {
          name: 'newStartDateTime',
          type: 'datetime',
          description: 'New start time for the event',
          required: false
        },
        {
          name: 'newEndDateTime',
          type: 'datetime',
          description: 'New end time for the event',
          required: false
        }
      ]
    },
    {
      id: 'calendar_send_invitation',
      name: 'Send event invitation',
      description: 'Create an event and send invitations to participants',
      fields: [
        {
          name: 'title',
          type: 'string',
          description: 'Title of the event',
          required: true
        },
        {
          name: 'description',
          type: 'string',
          description: 'Description of the event',
          required: true
        },
        {
          name: 'startDateTime',
          type: 'datetime',
          description: 'When the event starts',
          required: true
        },
        {
          name: 'endDateTime',
          type: 'datetime',
          description: 'When the event ends',
          required: true
        },
        {
          name: 'attendees',
          type: 'array',
          description: 'Email addresses of people to invite',
          required: true,
          items: {
            type: 'string'
          }
        },
        {
          name: 'message',
          type: 'text',
          description: 'Additional message for the invitation',
          required: false
        }
      ]
    }
  ]
}; 