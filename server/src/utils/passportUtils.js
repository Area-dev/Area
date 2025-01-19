const passport = require('passport');
const User = require('../models/User');

// Sérialisation : stocke uniquement l'ID de l'utilisateur dans la session
passport.serializeUser((user, done) => {
    console.log("Serializing user:", user);
    done(null, user.id || user._id);
});

// Désérialisation : récupère l'utilisateur complet à partir de l'ID
passport.deserializeUser(async (id, done) => {
    console.log("Deserializing user ID:", id);
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;