const express = require('express');
const amqp = require('amqplib');
const axios = require('axios');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
const { requestLogger, startupLogger } = require('../../shared/logging');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

// SSE connections: Map<userId, Set<Response>>
const sseConnections = new Map();

// RabbitMQ setup
let channel;
async function connectRabbit() {
    try {
        const conn = await amqp.connect('amqp://rabbitmq');
        channel = await conn.createChannel();

        // Assert exchange
        await channel.assertExchange('cinestream.events', 'topic', { durable: true });

        // Assert queue for notifications
        const queue = await channel.assertQueue('notification-queue', { durable: true });

        // Bind to routing keys
        await channel.bindQueue(queue.queue, 'cinestream.events', 'comment.posted');
        await channel.bindQueue(queue.queue, 'cinestream.events', 'content.rated');

        // Consume messages
        channel.consume(queue.queue, async (msg) => {
            if (msg) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    await handleNotificationEvent(event);
                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message:', error);
                    channel.nack(msg, false, false);
                }
            }
        });

        console.log('Connected to RabbitMQ and consuming messages');
    } catch (error) {
        console.error('RabbitMQ connection error:', error);
    }
}

// Get users who have content in their watchlist
async function getWatchlistUsers(contentId, contentType) {
    try {
        const response = await axios.get('http://user-service:4002/internal/users-by-watchlist', {
            params: { tmdbId: contentId, type: contentType }
        });
        return response.data.userIds || [];
    } catch (error) {
        console.error('Error fetching watchlist users:', error);
        return [];
    }
}

// Handle notification events
async function handleNotificationEvent(event) {
    const { routingKey } = event;

    // Determine target users
    const targetUsers = await getWatchlistUsers(event.contentId, event.contentType);

    // Create notification
    const notification = {
        id: Date.now(),
        type: routingKey,
        message: `New activity on ${event.contentType} #${event.contentId}`,
        timestamp: new Date().toISOString(),
        data: event
    };

    // Send to all connected SSE clients for each target user
    targetUsers.forEach(userId => {
        const connections = sseConnections.get(userId);
        if (connections && connections.size > 0) {
            connections.forEach(res => {
                try {
                    res.write(`data: ${JSON.stringify(notification)}\n\n`);
                } catch (error) {
                    console.error('Error writing to SSE connection:', error);
                }
            });
        }
    });
}

// SSE endpoint
/**
 * @swagger
 * /notifications/stream:
 *   get:
 *     summary: Stream real-time notifications via SSE
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to stream notifications for
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Missing userId parameter
 */
app.get('/notifications/stream', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Track connections per user
    if (!sseConnections.has(userId)) {
        sseConnections.set(userId, new Set());
    }
    sseConnections.get(userId).add(res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId, timestamp: new Date().toISOString() })}\n\n`);

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 15000); // 15 seconds as per spec

    // Handle client disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        const connections = sseConnections.get(userId);
        if (connections) {
            connections.delete(res);
            if (connections.size === 0) {
                sseConnections.delete(userId);
            }
        }
        res.end();
    });
});

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Notification Service API',
            version: '1.0.0',
            description: 'Real-time notification service for CineStream using SSE',
        },
        servers: [
            {
                url: 'http://localhost:4005',
            },
        ],
        tags: [
            {
                name: 'Notifications',
                description: 'SSE notification endpoints'
            }
        ],
        components: {
            schemas: {
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        type: { type: 'string' },
                        message: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        data: { type: 'object' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
    },
    apis: ['./server.js'], // files containing annotations
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'Notification Service OK',
        activeConnections: sseConnections.size
    });
});

// Connect to RabbitMQ on startup
connectRabbit();

app.listen(PORT, () => {
    startupLogger('Notification Service', PORT);
});
