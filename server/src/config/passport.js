const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                
                // Check if user exists
                let user = await User.findOne({ email });
                let isNewUser = false;
                
                if (user) {
                    // Update Google ID if not already set
                    if (!user.googleId) {
                        user.googleId = profile.id;
                        await user.save();
                    }
                    return done(null, { user, isNewUser: false });
                }
                
                // Create new user with default BUYER role
                // User will select role after login
                const newUser = new User({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: email,
                    avatar: profile.photos[0]?.value,
                    role: 'BUYER', // Default - will be changed by user
                    isOAuthUser: true
                });
                
                await newUser.save();
                return done(null, { user: newUser, isNewUser: true });
            } catch (err) {
                return done(err);
            }
        }
    )
);

module.exports = passport;
