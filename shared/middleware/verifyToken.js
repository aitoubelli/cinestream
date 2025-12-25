// shared/middleware/verifyToken.js
const axios = require('axios');

async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
        // Use environment variable for Auth Service URL (flexible for Docker/local)
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
        const response = await axios.post(
            `${authServiceUrl}/api/auth/verify`,
            { token },
            { timeout: 2000 }
        );

        req.user = response.data.user;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = verifyToken;
