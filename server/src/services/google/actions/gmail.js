const { google } = require('googleapis');

const gmailActions = {
  gmail_new_email: {
    handler: async (params, auth) => {
      const gmail = google.gmail({ version: 'v1', auth });
      
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: params.query || '',
          maxResults: 1
        });

        if (!response.data.messages || response.data.messages.length === 0) {
          return null;
        }

        const message = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.messages[0].id
        });

        const headers = message.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value;
        const from = headers.find(h => h.name === 'From')?.value;

        if (params.fromEmail && !from.includes(params.fromEmail)) {
          return null;
        }
        if (params.subject && !subject.includes(params.subject)) {
          return null;
        }

        return {
          messageId: message.data.id,
          threadId: message.data.threadId,
          subject,
          from
        };
      } catch (error) {
        console.error('Error checking Gmail:', error);
        throw new Error('Failed to check Gmail: ' + error.message);
      }
    }
  },

  gmail_new_email_with_attachment: {
    handler: async (params, auth) => {
      const gmail = google.gmail({ version: 'v1', auth });
  
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'has:attachment',
          maxResults: 1
        });

        if (!response.data.messages || response.data.messages.length === 0) {
          return null;
        }

        const message = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.messages[0].id
        });

        const headers = message.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value;
        const from = headers.find(h => h.name === 'From')?.value;

        if (params.fromEmail && !from.includes(params.fromEmail)) {
          return null;
        }
        if (params.subject && !subject.includes(params.subject)) {
          return null;
        }

        return {
          messageId: message.data.id,
          threadId: message.data.threadId,
          subject,
          from,
          attachments
        };
      } catch (error) {
        console.error('Error checking Gmail for attachments:', error);
        throw new Error('Failed to check Gmail for attachments: ' + error.message);
      }
    }
  },

  gmail_new_email_with_keywords: {
    handler: async (params, auth) => {
      const gmail = google.gmail({ version: 'v1', auth });
      
      try {
        if (!params.keywords) {
          throw new Error('Keywords parameter is required');
        }

        const keywords = params.keywords.split(',').map(k => k.trim());
        const searchIn = params.searchIn || 'both';

        let query = '';
        if (searchIn === 'subject' || searchIn === 'both') {
          query = keywords.map(k => `subject:${k}`).join(' OR ');
        }
        if (searchIn === 'body' || searchIn === 'both') {
          const bodyQuery = keywords.join(' OR ');
          query = query ? `(${query}) OR (${bodyQuery})` : bodyQuery;
        }

        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 1
        });

        if (!response.data.messages || response.data.messages.length === 0) {
          return null;
        }

        const message = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.messages[0].id,
          format: 'full'
        });

        const headers = message.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value;
        const from = headers.find(h => h.name === 'From')?.value;

        let body = '';
        if (message.data.payload.parts) {
          body = message.data.payload.parts
            .filter(part => part.mimeType === 'text/plain')
            .map(part => Buffer.from(part.body.data, 'base64').toString())
            .join('\n');
        } else if (message.data.payload.body.data) {
          body = Buffer.from(message.data.payload.body.data, 'base64').toString();
        }

        const foundKeywords = keywords.filter(keyword => {
          const keywordLower = keyword.toLowerCase();
          if (searchIn === 'subject') {
            return subject.toLowerCase().includes(keywordLower);
          }
          if (searchIn === 'body') {
            return body.toLowerCase().includes(keywordLower);
          }
          return subject.toLowerCase().includes(keywordLower) || 
                 body.toLowerCase().includes(keywordLower);
        });

        if (foundKeywords.length === 0) {
          return null;
        }

        return {
          messageId: message.data.id,
          threadId: message.data.threadId,
          subject,
          from,
          foundKeywords,
          searchedIn: searchIn
        };
      } catch (error) {
        console.error('Error checking Gmail for keywords:', error);
        throw new Error('Failed to check Gmail for keywords: ' + error.message);
      }
    }
  }
};

module.exports = gmailActions; 