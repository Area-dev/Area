module.exports = {
  name: 'gmail',
  displayName: 'Gmail',
  description: 'Email service for sending and receiving emails',
  category: 'communication',
  
  auth: {
    type: 'oauth2',
    credentials: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.SERVER_URL}/auth/google/callback`
    },
    scopes: ['https://www.googleapis.com/auth/gmail.modify']
  },
  
  actions: [
    {
      id: 'gmail_new_email',
      name: 'New email received',
      description: 'Triggered when a new email is received',
      fields: [
        {
          name: 'fromEmail',
          type: 'string',
          description: 'Email address of the sender',
          required: false
        },
        {
          name: 'subject',
          type: 'string',
          description: 'Subject of the email contains',
          required: false
        }
      ]
    },
    {
      id: 'gmail_new_email_with_attachment',
      name: 'New email with attachment',
      description: 'Triggered when a new email containing attachments is received',
      fields: [
        {
          name: 'fromEmail',
          type: 'string',
          description: 'Email address of the sender',
          required: false
        },
        {
          name: 'subject',
          type: 'string',
          description: 'Subject of the email contains',
          required: false
        }
      ]
    },
    {
      id: 'gmail_new_email_with_keywords',
      name: 'New email with keywords',
      description: 'Triggered when receiving an email containing specific keywords',
      fields: [
        {
          name: 'keywords',
          type: 'string',
          description: 'Keywords to search for (comma separated)',
          required: true
        },
        {
          name: 'searchIn',
          type: 'string',
          description: 'Where to search for keywords',
          required: true,
          enum: ['subject', 'body', 'both']
        }
      ]
    }
  ],
  
  reactions: [
    {
      id: 'gmail_send_email',
      name: 'Send an email',
      description: 'Send an email via Gmail',
      fields: [
        {
          name: 'to',
          type: 'string',
          description: 'Recipient email address',
          required: true
        },
        {
          name: 'subject',
          type: 'string',
          description: 'Subject of the email',
          required: true
        },
        {
          name: 'body',
          type: 'text',
          description: 'Content of the email',
          required: true
        }
      ]
    },
    {
      id: 'gmail_archive_email',
      name: 'Archive email',
      description: 'Archive an email based on its subject',
      fields: [
        {
          name: 'subject',
          type: 'string',
          description: 'Subject of the email to archive',
          required: true
        }
      ]
    },
    {
      id: 'gmail_mark_as_read',
      name: 'Mark email as read',
      description: 'Mark an email as read based on its subject',
      fields: [
        {
          name: 'subject',
          type: 'string',
          description: 'Subject of the email to mark as read',
          required: true
        }
      ]
    }
  ]
}; 