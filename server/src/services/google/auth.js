const axios = require('axios');
const saveUserToDB = require('../../utils/saveUserToDB');

const googleConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALLBACK_URL,
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
};

const googleAuthService = {
    getAuthUrl: (state) => {
        const params = {
            client_id: googleConfig.clientId,
            redirect_uri: googleConfig.redirectUri,
            scope: [
                'profile',
                'email',
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/documents',
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/presentations'
            ].join(' '),
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            state
        };

        return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(params)}`;
    },

    handleCallback: async (code) => {
        try {
            const tokenResponse = await axios.post(googleConfig.tokenUrl, {
                client_id: googleConfig.clientId,
                client_secret: googleConfig.clientSecret,
                code,
                redirect_uri: googleConfig.redirectUri,
                grant_type: 'authorization_code'
            });

            const { access_token, refresh_token, expires_in } = tokenResponse.data;

            const userResponse = await axios.get(googleConfig.userInfoUrl, {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            const profile = {
                id: userResponse.data.sub,
                emails: [{ value: userResponse.data.email }],
                name: {
                    givenName: userResponse.data.given_name,
                    familyName: userResponse.data.family_name
                },
                photos: [{ value: userResponse.data.picture }]
            };

            const user = await saveUserToDB(profile, access_token, refresh_token, 'google', expires_in);

            return user;
        } catch (error) {
            console.error('Google authentication error:', error);
            throw new Error('Failed to authenticate with Google');
        }
    }
};

module.exports = googleAuthService; 