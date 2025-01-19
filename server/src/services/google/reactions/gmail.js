const { google } = require('googleapis');

const gmailReactions = {
  gmail_send_email: {
    handler: async (params, auth, triggerData) => {
      const gmail = await getGmailClient(auth.access_token);
      let { to, subject, body } = params;

      // Si on a des triggerData, on les utilise intelligemment selon leur type
      if (triggerData) {
        // Pour les emails
        if (triggerData.messageId) {
          to = triggerData.to || to;
          subject = triggerData.subject ? `Re: ${triggerData.subject}` : subject;
          body = triggerData.body ? `Original message:\n${triggerData.body}\n\n${body}` : body;
        }
        
        // Pour les fichiers Drive
        if (triggerData.fileId) {
          subject = subject.replace('{{filename}}', triggerData.name);
          body = body.replace('{{fileLink}}', triggerData.webViewLink)
                    .replace('{{modifiedBy}}', triggerData.modifiedBy || '')
                    .replace('{{sharedBy}}', triggerData.sharedBy || '')
                    .replace('{{sharedWith}}', triggerData.sharedWith || '');
        }

        // Pour les événements Calendar
        if (triggerData.eventId) {
          subject = subject.replace('{{eventTitle}}', triggerData.summary);
          body = body.replace('{{eventDescription}}', triggerData.description || '')
                    .replace('{{eventLink}}', triggerData.htmlLink)
                    .replace('{{startTime}}', triggerData.start)
                    .replace('{{endTime}}', triggerData.end)
                    .replace('{{attendees}}', triggerData.attendees?.map(a => a.email).join(', ') || '');
        }

        // Remplacement générique pour tout autre champ
        Object.entries(triggerData).forEach(([key, value]) => {
          if (typeof value === 'string') {
            const placeholder = `{{${key}}}`;
            subject = subject.replace(placeholder, value);
            body = body.replace(placeholder, value);
          }
        });
      }

      const message = [
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\r\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      try {
        const res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });

        return {
          messageId: res.data.id,
          threadId: res.data.threadId,
          subject,
          to
        };
      } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email: ' + error.message);
      }
    }
  },

  gmail_archive_email: {
    handler: async (params, auth) => {
      const gmail = google.gmail({ version: 'v1', auth });
      
      try {
        const searchResponse = await gmail.users.messages.list({
          userId: 'me',
          q: `subject:${params.subject}`
        });

        if (!searchResponse.data.messages || searchResponse.data.messages.length === 0) {
          throw new Error('No email found with the specified subject');
        }

        const messageId = searchResponse.data.messages[0].id;

        const response = await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['INBOX']
          }
        });

        return {
          messageId: response.data.id,
          threadId: response.data.threadId,
          labelIds: response.data.labelIds
        };
      } catch (error) {
        console.error('Error archiving email:', error);
        throw new Error('Failed to archive email: ' + error.message);
      }
    }
  },

  gmail_mark_as_read: {
    handler: async (params, auth) => {
      const gmail = google.gmail({ version: 'v1', auth });
      
      try {
        const searchResponse = await gmail.users.messages.list({
          userId: 'me',
          q: `subject:${params.subject}`
        });

        if (!searchResponse.data.messages || searchResponse.data.messages.length === 0) {
          throw new Error('No email found with the specified subject');
        }

        const messageId = searchResponse.data.messages[0].id;

        const response = await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });

        return {
          messageId: response.data.id,
          threadId: response.data.threadId,
          labelIds: response.data.labelIds
        };
      } catch (error) {
        console.error('Error marking email as read:', error);
        throw new Error('Failed to mark email as read: ' + error.message);
      }
    }
  }
};

module.exports = gmailReactions; 