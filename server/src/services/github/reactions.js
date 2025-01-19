const githubReactions = {
  github_create_issue: {
    handler: async (params, auth, triggerData) => {
      console.log('Creating issue with auth:', {
        hasToken: !!auth.access_token,
        params,
        triggerData
      });

      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: auth.access_token,
        userAgent: 'area-app/v1.0.0'
      });

      try {
        const { data: user } = await octokit.rest.users.getAuthenticated();
        console.log('Authenticated as:', user.login);
      } catch (error) {
        console.error('Authentication test failed:', error);
        throw new Error('Authentication failed: ' + error.message);
      }

      const [owner, repo] = params.repository.split('/');
      console.log('Creating issue in repository:', { owner, repo });

      try {
        let title = params.title;
        let body = params.body;

        if (triggerData) {
          Object.entries(triggerData).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            title = title.replace(placeholder, value);
            body = body.replace(placeholder, value);
          });
        }

        console.log('Prepared issue:', { title, body, labels: params.labels });

        const response = await octokit.rest.issues.create({
          owner,
          repo,
          title,
          body,
          labels: params.labels ? params.labels.split(',').map(label => label.trim()) : []
        });

        console.log('Issue created successfully:', response.data.html_url);

        return {
          issueNumber: response.data.number,
          title: response.data.title,
          url: response.data.html_url
        };
      } catch (error) {
        console.error('Error creating issue:', error);
        if (error.response) {
          console.error('API Response:', {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data
          });
        }
        throw new Error('Failed to create issue: ' + error.message);
      }
    }
  },

  github_create_comment: {
    handler: async (params, auth, triggerData) => {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: auth.access_token,
        userAgent: 'area-app/v1.0.0'
      });
      const [owner, repo] = params.repository.split('/');

      try {
        let body = params.body;

        if (triggerData) {
          Object.entries(triggerData).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            body = body.replace(placeholder, value);
          });
        }
        let issueNumber;
        if (params.issue_number === undefined) {
          if (triggerData.issueNumber !== undefined && triggerData.issueNumber !== params.issue_number)
            issueNumber = triggerData.issueNumber;
          else if (triggerData.prNumber !== undefined && triggerData.prNumber !== params.issue_number)
            issueNumber = triggerData.prNumber;
        }
        const response = await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body
        });

        return {
          commentId: response.data.id,
          body: response.data.body,
          url: response.data.html_url
        };
      } catch (error) {
        console.error('Error creating comment:', error);
        throw new Error('Failed to create comment: ' + error.message);
      }
    }
  },

  github_add_labels: {
    handler: async (params, auth, triggerData) => {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: auth.access_token,
        userAgent: 'area-app/v1.0.0'
      });
      const [owner, repo] = params.repository.split('/');

      try {
        const labels = params.labels.split(',').map(label => label.trim());
        
        let issue_number;
        if (params.issue_number === undefined || triggerData.issueNumber !== params.issue_number) {
          issue_number = triggerData.issueNumber;
        }

        const response = await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: params.issue_number,
          labels
        });

        return {
          issueNumber: params.issue_number,
          addedLabels: response.data.map(label => label.name)
        };
      } catch (error) {
        console.error('Error adding labels:', error);
        throw new Error('Failed to add labels: ' + error.message);
      }
    }
  }
};

module.exports = githubReactions; 