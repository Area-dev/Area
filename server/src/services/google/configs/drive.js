module.exports = {
  name: 'drive',
  displayName: 'Google Drive',
  description: 'File storage and synchronization service',
  category: 'productivity',
  
  auth: {
    type: 'oauth2',
    credentials: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.SERVER_URL}/auth/google/callback`
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/presentations'
    ]
  },
  
  actions: [
    {
      id: 'drive_new_file',
      name: 'New file created',
      description: 'Triggered when a new file is created in Drive',
      fields: [
        {
          name: 'folderName',
          type: 'string',
          description: 'Name of the folder to monitor',
          required: false
        },
        {
          name: 'fileType',
          type: 'string',
          description: 'Type of file to monitor',
          required: false,
          enum: [
            'document',
            'spreadsheet',
            'presentation',
            'image',
            'video',
            'audio',
            'pdf'
          ]
        }
      ]
    },
    {
      id: 'drive_file_modified',
      name: 'File modified',
      description: 'Triggered when a file is modified',
      fields: [
        {
          name: 'fileName',
          type: 'string',
          description: 'Name of the file to monitor',
          required: false
        },
        {
          name: 'folderName',
          type: 'string',
          description: 'Name of the folder to monitor',
          required: false
        }
      ]
    },
    {
      id: 'drive_file_shared',
      name: 'File shared',
      description: 'Triggered when a file is shared with you',
      fields: [
        {
          name: 'fileType',
          type: 'string',
          description: 'Type of file to monitor',
          required: false,
          enum: [
            'document',
            'spreadsheet',
            'presentation',
            'image',
            'video',
            'audio',
            'pdf'
          ]
        }
      ]
    }
  ],
  
  reactions: [
    {
      id: 'drive_create_file',
      name: 'Create file',
      description: 'Create a new file in Drive',
      fields: [
        {
          name: 'name',
          type: 'string',
          description: 'Name of the file to create',
          required: true
        },
        {
          name: 'content',
          type: 'text',
          description: 'Content of the file',
          required: true
        },
        {
          name: 'mimeType',
          type: 'string',
          description: 'Type of file to create',
          required: true,
          enum: [
            'Text Document',
            'Spreadsheet',
            'Presentation'
          ],
          enumValues: {
            'Text Document': 'application/vnd.google-apps.document',
            'Spreadsheet': 'application/vnd.google-apps.spreadsheet',
            'Presentation': 'application/vnd.google-apps.presentation'
          }
        },
        {
          name: 'folderName',
          type: 'string',
          description: 'Name of the folder to create the file in',
          required: false
        }
      ]
    },
    {
      id: 'drive_share_file',
      name: 'Share file',
      description: 'Share a file with someone',
      fields: [
        {
          name: 'fileName',
          type: 'string',
          description: 'Name of the file to share',
          required: true
        },
        {
          name: 'folderName',
          type: 'string',
          description: 'Name of the folder containing the file',
          required: false
        },
        {
          name: 'email',
          type: 'string',
          description: 'Email of the person to share with',
          required: true
        },
        {
          name: 'role',
          type: 'string',
          description: 'Access level to grant',
          required: true,
          enum: [
            'Reader',
            'Commenter',
            'Editor'
          ],
          enumValues: {
            'Reader': 'reader',
            'Commenter': 'commenter',
            'Editor': 'writer'
          }
        }
      ]
    },
    {
      id: 'drive_copy_file',
      name: 'Copy file',
      description: 'Create a copy of a file',
      fields: [
        {
          name: 'fileName',
          type: 'string',
          description: 'Name of the file to copy',
          required: true
        },
        {
          name: 'sourceFolderName',
          type: 'string',
          description: 'Name of the folder containing the file',
          required: false
        },
        {
          name: 'newName',
          type: 'string',
          description: 'New name for the copied file',
          required: false
        },
        {
          name: 'destinationFolderName',
          type: 'string',
          description: 'Name of the folder to copy the file to',
          required: false
        }
      ]
    }
  ]
}; 