const githubActions = {
  github_new_issue: {
    handler: async (params, auth) => {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: auth.access_token,
        userAgent: 'area-app/v1.0.0'
      });
      const [owner, repo] = params.repository.split('/');

      try {
        const response = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          sort: 'created',
          direction: 'desc',
          per_page: 1
        });

        if (!response.data || response.data.length === 0) {
          return null;
        }

        const issue = response.data[0];
        const createdAt = new Date(issue.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (createdAt < fiveMinutesAgo) {
          return null;
        }

        return {
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body,
          author: issue.user.login,
          labels: issue.labels.map(label => label.name),
          createdAt: issue.created_at,
          url: issue.html_url
        };
      } catch (error) {
        console.error('Error checking for new issues:', error);
        throw new Error('Failed to check for new issues: ' + error.message);
      }
    }
  },

  github_new_pr: {
    handler: async (params, auth) => {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: auth.access_token,
        userAgent: 'area-app/v1.0.0'
      });
      const [owner, repo] = params.repository.split('/');

      try {
        const response = await octokit.rest.pulls.list({
          owner,
          repo,
          sort: 'created',
          direction: 'desc',
          per_page: 1
        });

        if (!response.data || response.data.length === 0) {
          return null;
        }

        const pr = response.data[0];
        const createdAt = new Date(pr.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (createdAt < fiveMinutesAgo) {
          return null;
        }

        return {
          prNumber: pr.number,
          title: pr.title,
          body: pr.body,
          author: pr.user.login,
          branch: pr.head.ref,
          baseBranch: pr.base.ref,
          createdAt: pr.created_at,
          url: pr.html_url
        };
      } catch (error) {
        console.error('Error checking for new pull requests:', error);
        throw new Error('Failed to check for new pull requests: ' + error.message);
      }
    }
  },

  github_push: {
    handler: async (params, auth) => {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ 
        auth: auth.access_token,
        userAgent: 'area-app/v1.0.0'
      });
      const [owner, repo] = params.repository.split('/');
      const branch = params.branch || 'main';

      try {
        const response = await octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: branch,
          per_page: 1
        });

        if (!response.data || response.data.length === 0) {
          return null;
        }

        const commit = response.data[0];
        const commitDate = new Date(commit.commit.author.date);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (commitDate < fiveMinutesAgo) {
          return null;
        }

        return {
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author.name,
          authorEmail: commit.commit.author.email,
          date: commit.commit.author.date,
          url: commit.html_url,
          branch
        };
      } catch (error) {
        console.error('Error checking for new pushes:', error);
        throw new Error('Failed to check for new pushes: ' + error.message);
      }
    }
  }
};

module.exports = githubActions; 