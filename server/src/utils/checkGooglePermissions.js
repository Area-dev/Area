const { google } = require('googleapis');

const checkGooglePermissions = async (accessToken) => {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    try {
        // Vérifier les permissions Calendar
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.calendarList.list();

        // Vérifier les permissions Gmail
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        await gmail.users.getProfile({ userId: 'me' });

        return {
            success: true,
            message: 'All required permissions are granted'
        };
    } catch (error) {
        console.error('Permission check error:', error);
        return {
            success: false,
            message: 'Missing required permissions',
            error: error.message
        };
    }
};

module.exports = checkGooglePermissions; 