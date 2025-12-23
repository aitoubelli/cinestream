const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

app.use(express.json());
app.use(cookieParser());

// JWT verification helper
const verifyJWT = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
        });
    });
};

app.get('/stream', async (req, res) => {
    const token = req.cookies.auth;
    if (!token) {
        return res.status(401).end();
    }

    try {
        const user = await verifyJWT(token);
        const userId = user.id;

        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });

        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId })}\n\n`);

        // Keep connection alive
        const keepAlive = setInterval(() => {
            res.write(': keep-alive\n\n');
        }, 30000);

        // Handle client disconnect
        req.on('close', () => {
            clearInterval(keepAlive);
            res.end();
        });

    } catch (error) {
        res.status(401).end();
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Notification Service OK' });
});

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
