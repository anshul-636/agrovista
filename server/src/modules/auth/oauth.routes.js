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
            const user = req.user;
            
            // Generate JWT tokens
            const accessToken = jwt.sign(
                { id: user._id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            
            const refreshToken = jwt.sign(
                { id: user._id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );
            
            // Redirect to frontend with tokens
            const frontendURL = process.env.CLIENT_URL || 'http://localhost:3002';
            return res.redirect(
                `${frontendURL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}&email=${user.email}&name=${user.name}&role=${user.role}`
            );
        } catch (err) {
            console.error('[OAuth] Error:', err);
            const frontendURL = process.env.CLIENT_URL || 'http://localhost:3002';
            return res.redirect(`${frontendURL}/login?error=auth_failed`);
        }
    }
);

module.exports = router;
