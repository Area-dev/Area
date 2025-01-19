module.exports = {
  name: 'github',
  displayName: 'GitHub',
  description: 'GitHub service for repository and issue management',
  category: 'development',
  auth: {
    type: 'oauth2',
    scopes: ['repo', 'user', 'notifications']
  },
  actions: [
    {
      id: 'github_new_issue',
      name: 'New Issue Created',
      description: 'Triggered when a new issue is created in a repository',
      fields: [
        {
          name: 'repository',
          type: 'string',
          description: 'Repository name (format: owner/repo)',
          required: true
        }
      ]
    },
    {
      id: 'github_new_pr',
      name: 'New Pull Request',
      description: 'Triggered when a new pull request is created',
      fields: [
        {
          name: 'repository',
          type: 'string',
          description: 'Repository name (format: owner/repo)',
          required: true
        }
      ]
    },
    {
      id: 'github_push',
      name: 'New Push',
      description: 'Triggered when code is pushed to a repository',
      fields: [
        {
          name: 'repository',
          type: 'string',
          description: 'Repository name (format: owner/repo)',
          required: true
        },
        {
          name: 'branch',
          type: 'string',
          description: 'Branch name to watch (default: main)',
          required: false
        }
      ]
    }
  ],
  reactions: [
    {
      id: 'github_create_issue',
      name: 'Create Issue',
      description: 'Create a new issue in a repository',
      fields: [
        {
          name: 'repository',
          type: 'string',
          description: 'Repository name (format: owner/repo)',
          required: true
        },
        {
          name: 'title',
          type: 'string',
          description: 'Issue title',
          required: true
        },
        {
          name: 'body',
          type: 'string',
          description: 'Issue description',
          required: true
        },
        {
          name: 'labels',
          type: 'string',
          description: 'Comma-separated list of labels',
          required: false
        }
      ]
    },
    {
      id: 'github_create_comment',
      name: 'Create Comment',
      description: 'Create a comment on an issue or pull request',
      fields: [
        {
          name: 'repository',
          type: 'string',
          description: 'Repository name (format: owner/repo)',
          required: true
        },
        {
          name: 'issue_number',
          type: 'number',
          description: 'Issue or pull request number',
          required: true
        },
        {
          name: 'body',
          type: 'string',
          description: 'Comment content',
          required: true
        }
      ]
    },
    {
      id: 'github_add_labels',
      name: 'Add Labels',
      description: 'Add labels to an issue or pull request',
      fields: [
        {
          name: 'repository',
          type: 'string',
          description: 'Repository name (format: owner/repo)',
          required: true
        },
        {
          name: 'issue_number',
          type: 'number',
          description: 'Issue or pull request number',
          required: true
        },
        {
          name: 'labels',
          type: 'string',
          description: 'Comma-separated list of labels to add',
          required: true
        }
      ]
    }
  ]
}; 