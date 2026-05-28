const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth Login
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// Google OAuth Callback
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        try {
            const { user, isNewUser } = req.user;

            // Generate JWT tokens
            const accessToken = jwt.sign(
                { userId: user._id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            const frontendURL = process.env.CLIENT_URL || 'http://localhost:3000';
            
            // For new OAuth users, redirect to role selection
            if (isNewUser) {
                return res.redirect(
                    `${frontendURL}/select-role?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}&email=${user.email}&name=${user.name}`
                );
            }
            
            // Existing users go directly to dashboard
            return res.redirect(
                `${frontendURL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}&email=${user.email}&name=${user.name}&role=${user.role}`
            );
        } catch (err) {
            console.error('[OAuth] Error:', err);
            const frontendURL = process.env.CLIENT_URL || 'http://localhost:3000';
            return res.redirect(`${frontendURL}/login?error=auth_failed`);
        }
    }
);

module.exports = router;
