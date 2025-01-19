const { google } = require('googleapis');

const driveReactions = {
  drive_create_file: {
    handler: async (params, auth, triggerData) => {
      const drive = await getDriveClient(auth.access_token);
      let { name, content, mimeType, folderId } = params;

      // Si on a des triggerData, on les utilise intelligemment selon leur type
      if (triggerData) {
        // Pour les emails
        if (triggerData.messageId) {
          name = name.replace('{{emailSubject}}', triggerData.subject);
          content = content ? content.replace('{{emailBody}}', triggerData.body) : triggerData.body;
          // Si on a des pièces jointes
          if (triggerData.attachments && triggerData.attachments.length > 0) {
            name = triggerData.attachments[0].name;
            content = triggerData.attachments[0].content;
            mimeType = triggerData.attachments[0].mimeType;
          }
        }

        // Pour les événements Calendar
        if (triggerData.eventId) {
          name = name.replace('{{eventTitle}}', triggerData.summary);
          const eventContent = [
            `Event: ${triggerData.summary}`,
            `When: ${triggerData.start} - ${triggerData.end}`,
            `Description: ${triggerData.description || 'No description'}`,
            `Attendees: ${triggerData.attendees?.map(a => a.email).join(', ') || 'None'}`,
            `Link: ${triggerData.htmlLink}`
          ].join('\n');
          content = content ? content.replace('{{eventDetails}}', eventContent) : eventContent;
        }

        // Remplacement générique pour tout autre champ
        Object.entries(triggerData).forEach(([key, value]) => {
          if (typeof value === 'string') {
            const placeholder = `{{${key}}}`;
            name = name.replace(placeholder, value);
            if (content) {
              content = content.replace(placeholder, value);
            }
          }
        });
      }

      const fileMetadata = {
        name,
        mimeType: mimeType || 'text/plain'
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      try {
        const res = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: fileMetadata.mimeType,
            body: content
          }
        });

        return {
          fileId: res.data.id,
          name: res.data.name,
          webViewLink: res.data.webViewLink,
          mimeType: res.data.mimeType
        };
      } catch (error) {
        console.error('Error creating file:', error);
        throw new Error('Failed to create file: ' + error.message);
      }
    }
  },

  drive_share_file: {
    handler: async (params, auth, triggerData) => {
      const drive = await getDriveClient(auth.access_token);
      let { fileId, email, role } = params;

      // Si on a des triggerData, on utilise les emails pertinents
      if (triggerData) {
        // Pour les emails
        if (triggerData.messageId && !email) {
          email = triggerData.from || triggerData.to;
        }

        // Pour les événements Calendar
        if (triggerData.eventId && !email && triggerData.attendees) {
          email = triggerData.attendees.map(a => a.email).join(',');
        }

        // Si le fileId n'est pas fourni, on le prend du triggerData
        if (!fileId && triggerData.fileId) {
          fileId = triggerData.fileId;
        }
      }

      if (!fileId) {
        throw new Error('No file ID provided');
      }

      if (!email) {
        throw new Error('No email address provided');
      }

      try {
        const emails = email.split(',');
        const shareResults = [];

        for (const emailAddress of emails) {
          const res = await drive.permissions.create({
            fileId,
            requestBody: {
              type: 'user',
              role: role || 'reader',
              emailAddress: emailAddress.trim()
            },
            sendNotificationEmail: true
          });

          shareResults.push({
            permissionId: res.data.id,
            email: emailAddress.trim(),
            role: res.data.role
          });
        }

        return {
          fileId,
          shares: shareResults
        };
      } catch (error) {
        console.error('Error sharing file:', error);
        throw new Error('Failed to share file: ' + error.message);
      }
    }
  },

  drive_copy_file: {
    handler: async (params, auth) => {
      const drive = google.drive({ version: 'v3', auth });
      
      try {
        let query = `name = '${params.fileName}' and trashed = false`;
        
        if (params.sourceFolderName) {
          const folderResponse = await drive.files.list({
            q: `name = '${params.sourceFolderName}' and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)'
          });
          
          if (folderResponse.data.files.length > 0) {
            query += ` and '${folderResponse.data.files[0].id}' in parents`;
          }
        }

        const fileResponse = await drive.files.list({
          q: query,
          fields: 'files(id)'
        });

        if (fileResponse.data.files.length === 0) {
          throw new Error(`Source file not found: ${params.fileName}`);
        }

        const sourceFileId = fileResponse.data.files[0].id;

        let destinationFolderId = null;
        if (params.destinationFolderName) {
          const folderResponse = await drive.files.list({
            q: `name = '${params.destinationFolderName}' and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)'
          });
          
          if (folderResponse.data.files.length === 0) {
            const folderMetadata = {
              name: params.destinationFolderName,
              mimeType: 'application/vnd.google-apps.folder'
            };
            const newFolder = await drive.files.create({
              resource: folderMetadata,
              fields: 'id'
            });
            destinationFolderId = newFolder.data.id;
          } else {
            destinationFolderId = folderResponse.data.files[0].id;
          }
        }

        const copyMetadata = {};
        if (params.newName) {
          copyMetadata.name = params.newName;
        }
        if (destinationFolderId) {
          copyMetadata.parents = [destinationFolderId];
        }

        const copiedFile = await drive.files.copy({
          fileId: sourceFileId,
          resource: copyMetadata,
          fields: 'id, name, webViewLink'
        });

        return {
          fileId: copiedFile.data.id,
          fileName: copiedFile.data.name,
          webViewLink: copiedFile.data.webViewLink
        };
      } catch (error) {
        console.error('Error copying file in Drive:', error);
        throw new Error('Failed to copy file in Drive: ' + error.message);
      }
    }
  }
};

module.exports = driveReactions;
