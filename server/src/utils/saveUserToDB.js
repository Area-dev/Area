const User = require("../models/User");
const { v4: uuidv4 } = require('uuid');

const saveUserToDB = async (profile, accessToken, refreshToken, service, expires_in) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });

        const expires_at = new Date(Date.now() + (expires_in * 1000));
        expires_at.setMinutes(expires_at.getMinutes() - expires_at.getTimezoneOffset());

        if (!user) {
            user = new User({
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName || '',
                serviceConnections: [{
                    service: service,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: expires_at
                }]
            });
            await user.save();
        } else {
            const serviceIndex = user.serviceConnections.findIndex(
                conn => conn.service === service
            );

            if (serviceIndex !== -1) {
                user.serviceConnections[serviceIndex] = {
                    service: service,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: expires_at
                };
            } else {
                user.serviceConnections.push({
                    service: service,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: expires_at
                });
            }
            await user.save();
        }

        return user;
    } catch (error) {
        console.error('Error saving user to DB:', error);
        throw error;
    }
};

module.exports = saveUserToDB;
