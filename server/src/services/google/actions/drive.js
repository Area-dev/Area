const { google } = require('googleapis');

const driveActions = {
  drive_new_file: {
    handler: async (params, auth) => {
      const drive = google.drive({ version: 'v3', auth });
      
      try {
        let query = 'trashed = false';
        
        if (params.folderName) {
          const folderResponse = await drive.files.list({
            q: `name = '${params.folderName}' and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)'
          });
          
          if (folderResponse.data.files.length > 0) {
            query += ` and '${folderResponse.data.files[0].id}' in parents`;
          }
        }

        if (params.fileType) {
          const mimeTypes = {
            'document': 'application/vnd.google-apps.document',
            'spreadsheet': 'application/vnd.google-apps.spreadsheet',
            'presentation': 'application/vnd.google-apps.presentation',
            'pdf': 'application/pdf',
            'image': 'image/',
            'video': 'video/',
            'audio': 'audio/'
          };

          if (mimeTypes[params.fileType]) {
            query += ` and mimeType ${params.fileType === 'image' || params.fileType === 'video' || params.fileType === 'audio' ? 'contains' : '='} '${mimeTypes[params.fileType]}'`;
          }
        }

        const response = await drive.files.list({
          q: query,
          orderBy: 'createdTime desc',
          pageSize: 1,
          fields: 'files(id, name, mimeType, webViewLink, createdTime, parents)'
        });

        if (!response.data.files || response.data.files.length === 0) {
          return null;
        }

        const file = response.data.files[0];
        return {
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          createdTime: file.createdTime
        };
      } catch (error) {
        console.error('Error checking Drive for new files:', error);
        throw new Error('Failed to check Drive for new files: ' + error.message);
      }
    }
  },

  drive_file_modified: {
    handler: async (params, auth) => {
      const drive = google.drive({ version: 'v3', auth });
      
      try {
        let query = 'trashed = false';

        const timeMin = new Date(Date.now() - (5 * 60 * 1000));
        const formattedTime = timeMin.toISOString();
        query += ` and modifiedTime > '${formattedTime}'`;

        if (params.fileName) {
          query += ` and name = '${params.fileName}'`;
        }

        if (params.folderName) {
          console.log('Looking for folder:', params.folderName);
          const folderResponse = await drive.files.list({
            q: `name = '${params.folderName}' and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name)'
          });
          
          console.log('Folder search response:', folderResponse.data);
          if (folderResponse.data.files.length > 0) {
            const folderId = folderResponse.data.files[0].id;
            query += ` and '${folderId}' in parents`;
          } else {
            console.log('Folder not found:', params.folderName);
            return null;
          }
        }

        const response = await drive.files.list({
          q: query,
          orderBy: 'modifiedTime desc',
          pageSize: 1,
          fields: 'files(id, name, mimeType, webViewLink, modifiedTime, lastModifyingUser)'
        });

        if (!response.data.files || response.data.files.length === 0) {
          console.log('No matching modified files found');
          return null;
        }

        const file = response.data.files[0];
        console.log('Found modified file:', {
          id: file.id,
          name: file.name,
          modifiedTime: file.modifiedTime,
          mimeType: file.mimeType
        });
        
        return {
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          modifiedTime: file.modifiedTime,
          lastModifyingUser: file.lastModifyingUser
        };
      } catch (error) {
        console.error('Error checking Drive for modified files:', error);
        throw new Error('Failed to check Drive for modified files: ' + error.message);
      }
    }
  },

  drive_file_shared: {
    handler: async (params, auth) => {
      const drive = google.drive({ version: 'v3', auth });
      
      try {
        let query = 'trashed = false and sharedWithMe';

        if (params.fileType) {
          const mimeTypes = {
            'document': 'application/vnd.google-apps.document',
            'spreadsheet': 'application/vnd.google-apps.spreadsheet',
            'presentation': 'application/vnd.google-apps.presentation',
            'pdf': 'application/pdf',
            'image': 'image/',
            'video': 'video/',
            'audio': 'audio/'
          };

          if (mimeTypes[params.fileType]) {
            query += ` and mimeType ${params.fileType === 'image' || params.fileType === 'video' || params.fileType === 'audio' ? 'contains' : '='} '${mimeTypes[params.fileType]}'`;
          }
        }

        const response = await drive.files.list({
          q: query,
          orderBy: 'sharedWithMeTime desc',
          pageSize: 1,
          fields: 'files(id, name, mimeType, webViewLink, sharingUser, sharedWithMeTime)'
        });

        if (!response.data.files || response.data.files.length === 0) {
          return null;
        }

        const file = response.data.files[0];
        return {
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          sharedBy: file.sharingUser,
          sharedTime: file.sharedWithMeTime
        };
      } catch (error) {
        console.error('Error checking Drive for shared files:', error);
        throw new Error('Failed to check Drive for shared files: ' + error.message);
      }
    }
  }
};

module.exports = driveActions;
