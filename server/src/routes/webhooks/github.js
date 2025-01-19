const express = require('express');
const router = express.Router();
const Webhook = require('../../models/Webhook');
const User = require('../../models/User');
const GitHubWebhookManager = require('../../services/github/webhooks');
const ServiceManager = require('../../services/ServiceManager');

// Test route to check token scopes
router.post('/test-token', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const githubConnection = user.serviceConnections.find(
      conn => conn.service === 'github'
    );

    if (!githubConnection) {
      return res.status(400).json({ message: 'GitHub connection not found' });
    }

    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ 
      auth: githubConnection.accessToken,
      userAgent: 'area-app/v1.0.0'
    });

    // Test user authentication
    const { data: userData } = await octokit.rest.users.getAuthenticated();
    
    // Test repository access
    const [owner, repo] = "Area-dev/Area".split('/');
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo
    });

    res.json({ 
      message: 'Token test successful',
      details: {
        user: userData.login,
        scopes: req.headers['x-oauth-scopes'],
        rateLimit: {
          limit: req.headers['x-ratelimit-limit'],
          remaining: req.headers['x-ratelimit-remaining']
        },
        repository: {
          fullName: repoData.full_name,
          private: repoData.private,
          permissions: repoData.permissions
        }
      }
    });
  } catch (error) {
    console.error('Token test error:', error);
    res.status(400).json({
      message: 'Token test failed',
      error: error.message,
      headers: {
        scopes: req.headers['x-oauth-scopes'],
        rateLimit: {
          limit: req.headers['x-ratelimit-limit'],
          remaining: req.headers['x-ratelimit-remaining']
        }
      }
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const deliveryId = req.headers['x-github-delivery'];

    console.log('GitHub webhook received:', {
      event,
      deliveryId
    });

    if (!event || !signature || !deliveryId) {
      console.log('Missing required headers');
      return res.status(400).send('Missing required headers');
    }

    const payload = req.body;
    const repository = payload.repository.full_name;
    
    // Find all webhooks for this repository
    const webhooks = await Webhook.find({
      'config.repository': repository,
      service: 'github'
    });

    if (!webhooks || webhooks.length === 0) {
      console.log('No webhooks found for repository:', repository);
      return res.status(404).send('Webhook not found');
    }

    // Process each webhook
    for (const webhook of webhooks) {
      console.log('Processing webhook for automation:', webhook.automationId);

      const rawBody = JSON.stringify(req.body);
      const isValid = GitHubWebhookManager.verifyWebhookSignature(
        rawBody,
        signature,
        webhook.config.webhookSecret
      );

      if (!isValid) {
        console.log('Invalid webhook signature for automation:', webhook.automationId);
        continue;
      }

      const eventKey = `${deliveryId}:${event}:${webhook.automationId}`;
      if (GitHubWebhookManager.isEventProcessed(eventKey)) {
        console.log('Event already processed for automation:', webhook.automationId);
        continue;
      }

      const user = await User.findById(webhook.userId);
      if (!user) {
        console.log('User not found:', webhook.userId);
        continue;
      }

      const githubConnection = user.serviceConnections.find(
        conn => conn.service === 'github'
      );

      if (!githubConnection) {
        console.log('GitHub connection not found for user:', user._id);
        continue;
      }

      const automation = await require('../../models/Automation').findById(webhook.automationId);
      if (!automation || !automation.active) {
        console.log('Automation not found or inactive:', webhook.automationId);
        continue;
      }

      let actionResult = null;

      switch (event) {
        case 'issues':
          if (automation.trigger.action === 'github_new_issue' && payload.action === 'opened') {
            actionResult = {
              issueNumber: payload.issue.number,
              title: payload.issue.title,
              body: payload.issue.body,
              author: payload.issue.user.login,
              labels: payload.issue.labels.map(label => label.name),
              createdAt: payload.issue.created_at,
              url: payload.issue.html_url,
              repository: payload.repository.full_name
            };
            console.log('Issue event detected, preparing action result:', actionResult);
          }
          break;

        case 'pull_request':
          if (automation.trigger.action === 'github_new_pr' && payload.action === 'opened') {
            actionResult = {
              prNumber: payload.pull_request.number,
              title: payload.pull_request.title,
              body: payload.pull_request.body,
              author: payload.pull_request.user.login,
              branch: payload.pull_request.head.ref,
              baseBranch: payload.pull_request.base.ref,
              createdAt: payload.pull_request.created_at,
              url: payload.pull_request.html_url
            };
          }
          break;

        case 'push':
          if (automation.trigger.action === 'github_push') {
            const branch = payload.ref.replace('refs/heads/', '');
            if (!automation.trigger.params.branch || automation.trigger.params.branch === branch) {
              const commit = payload.commits[0];
              actionResult = {
                sha: commit.id,
                message: commit.message,
                author: commit.author.name,
                authorEmail: commit.author.email,
                date: commit.timestamp,
                url: commit.url,
                branch
              };
            }
          }
          break;
      }

      if (actionResult) {
        console.log('Executing automation reactions for event:', event, 'automation:', webhook.automationId);
        
        for (const reaction of automation.reactions) {
          try {
            console.log('Processing reaction:', {
              service: reaction.service,
              action: reaction.action,
              params: reaction.params
            });

            const service = ServiceManager.getService(reaction.service);
            const reactionHandler = service.reactions[reaction.action];
            
            if (!reactionHandler) {
              console.error(`Unsupported reaction: ${reaction.action}`);
              continue;
            }

            const result = await reactionHandler.handler(
              reaction.params, 
              {
                access_token: githubConnection.accessToken
              }, 
              actionResult
            );

            console.log('Reaction executed successfully:', {
              action: reaction.action,
              result
            });
            
            automation.executionHistory.push({
              timestamp: new Date(),
              status: 'success',
              details: {
                event,
                action: reaction.action,
                result: actionResult
              }
            });
          } catch (error) {
            console.error(`Error executing reaction ${reaction.action}:`, error);
            automation.executionHistory.push({
              timestamp: new Date(),
              status: 'error',
              details: {
                event,
                action: reaction.action,
                error: error.message
              }
            });
          }
        }

        await automation.save();
        GitHubWebhookManager.markEventProcessed(eventKey);
      }
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router; 