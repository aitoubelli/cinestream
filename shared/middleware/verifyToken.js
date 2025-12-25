// shared/middleware/verifyToken.js

async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
        // Use environment variable for Auth Service URL (flexible for Docker/local)
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
        const response = await fetch(`${authServiceUrl}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        req.user = data.user;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = verifyToken;
