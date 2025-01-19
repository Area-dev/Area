const axios = require('axios');
const saveUserToDB = require('../../utils/saveUserToDB');

const githubConfig = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_CALLBACK_URL,
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails'
};

const githubAuthService = {
    getAuthUrl: (state) => {
        const params = {
            client_id: githubConfig.clientId,
            redirect_uri: githubConfig.redirectUri,
            scope: [
                'repo',             // Pour accéder aux repositories
                'user',             // Pour les informations de l'utilisateur
                'user:email',       // Pour accéder à l'email
                'admin:repo_hook',  // Pour gérer les webhooks
                'write:repo_hook'   // Pour créer des webhooks
            ].join(' '),
            state
        };

        return `https://github.com/login/oauth/authorize?${new URLSearchParams(params)}`;
    },

    handleCallback: async (code) => {
        try {
            const tokenResponse = await axios.post(githubConfig.tokenUrl, {
                client_id: githubConfig.clientId,
                client_secret: githubConfig.clientSecret,
                code,
                redirect_uri: githubConfig.redirectUri
            }, {
                headers: {
                    Accept: 'application/json'
                }
            });

            const { access_token } = tokenResponse.data;
            const expires_in = 3 * 24 * 60 * 60; // 3 days

            const [userResponse, emailsResponse] = await Promise.all([
                axios.get(githubConfig.userInfoUrl, {
                    headers: {
                        Authorization: `token ${access_token}`,
                        Accept: 'application/json'
                    }
                }),
                axios.get(githubConfig.emailUrl, {
                    headers: {
                        Authorization: `token ${access_token}`,
                        Accept: 'application/json'
                    }
                })
            ]);

            const primaryEmail = emailsResponse.data.find(email => email.primary && email.verified);

            const profile = {
                id: userResponse.data.id.toString(),
                username: userResponse.data.login,
                displayName: userResponse.data.name,
                emails: [{ value: primaryEmail.email }],
                photos: userResponse.data.avatar_url ? [{ value: userResponse.data.avatar_url }] : []
            };

            const user = await saveUserToDB(profile, access_token, null, 'github', expires_in);

            return user;
        } catch (error) {
            console.error('GitHub authentication error:', error);
            throw new Error('Failed to authenticate with GitHub');
        }
    }
};

module.exports = githubAuthService; 