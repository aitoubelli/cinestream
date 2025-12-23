const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const axios = require('axios');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

// Middleware
app.use(helmet());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://mongodb:27017/cinestream_interactions', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose schemas
const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentId: { type: Number, required: true },
    contentType: { type: String, enum: ['movie', 'tv'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const ratingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentId: { type: Number, required: true },
    contentType: { type: String, enum: ['movie', 'tv'], required: true },
    score: { type: Number, min: 1, max: 10, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);
const Rating = mongoose.model('Rating', ratingSchema);

// RabbitMQ setup
let channel;
async function connectRabbit() {
    try {
        const conn = await amqp.connect('amqp://rabbitmq');
        channel = await conn.createChannel();
        await channel.assertExchange('cinestream.events', 'topic', { durable: true });
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('RabbitMQ connection error:', error);
    }
}

function publishEvent(routingKey, payload) {
    if (channel) {
        channel.publish('cinestream.events', routingKey, Buffer.from(JSON.stringify(payload)));
    }
}

// Auth middleware
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        const response = await axios.post('http://auth-service:4001/verify', { token });
        req.user = response.data.user; // { id, email, role }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Routes

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Post a comment on content
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostCommentRequest'
 *     responses:
 *       201:
 *         description: Comment posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostCommentResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
app.post('/comments', verifyToken, async (req, res) => {
    try {
        const { contentId, contentType, text } = req.body;
        if (!contentId || !contentType || !text) {
            return res.status(400).json({ error: 'contentId, contentType, and text are required' });
        }

        const comment = new Comment({
            userId: req.user.id,
            contentId,
            contentType,
            text
        });

        await comment.save();

        // Publish event
        publishEvent('comment.posted', {
            userId: req.user.id,
            contentId,
            contentType,
            commentId: comment._id
        });

        res.status(201).json({ message: 'Comment posted', commentId: comment._id });
    } catch (err) {
        console.error('Error posting comment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Submit or update a rating for content
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostRatingRequest'
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostRatingResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
app.post('/ratings', verifyToken, async (req, res) => {
    try {
        const { contentId, contentType, score } = req.body;
        if (!contentId || !contentType || score === undefined) {
            return res.status(400).json({ error: 'contentId, contentType, and score are required' });
        }

        if (score < 1 || score > 10) {
            return res.status(400).json({ error: 'Score must be between 1 and 10' });
        }

        // Upsert rating
        const rating = await Rating.findOneAndUpdate(
            { userId: req.user.id, contentId, contentType },
            { score },
            { new: true, upsert: true }
        );

        // Publish event
        publishEvent('content.rated', {
            userId: req.user.id,
            contentId,
            contentType,
            score
        });

        res.json({ message: 'Rating submitted' });
    } catch (err) {
        console.error('Error submitting rating:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Interaction Service API',
            version: '1.0.0',
            description: 'Comments and ratings service for CineStream',
        },
        servers: [
            {
                url: 'http://localhost:4004',
            },
        ],
        tags: [
            {
                name: 'Interactions',
                description: 'Comment and rating endpoints'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                PostCommentRequest: {
                    type: 'object',
                    required: ['contentId', 'contentType', 'text'],
                    properties: {
                        contentId: { type: 'number' },
                        contentType: { type: 'string', enum: ['movie', 'tv'] },
                        text: { type: 'string' }
                    }
                },
                PostCommentResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        commentId: { type: 'string' }
                    }
                },
                PostRatingRequest: {
                    type: 'object',
                    required: ['contentId', 'contentType', 'score'],
                    properties: {
                        contentId: { type: 'number' },
                        contentType: { type: 'string', enum: ['movie', 'tv'] },
                        score: { type: 'number', minimum: 1, maximum: 10 }
                    }
                },
                PostRatingResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
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
        security: [
            {
                bearerAuth: []
            }
        ],
    },
    apis: ['./server.js'], // files containing annotations
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Interaction Service OK' });
});

// Connect to RabbitMQ on startup
connectRabbit();

app.listen(PORT, () => {
    console.log(`Interaction Service running on port ${PORT}`);
});
