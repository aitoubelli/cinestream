const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const axios = require('axios');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
const { requestLogger, startupLogger } = require('../../shared/logging');
const verifyToken = require('../../shared/middleware/verifyToken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

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
}, { timestamps: true });

// Enforce one rating per user per content
ratingSchema.index({ userId: 1, contentId: 1, contentType: 1 }, { unique: true });

const Comment = mongoose.model('Comment', commentSchema);
const Rating = mongoose.model('Rating', ratingSchema);

// RabbitMQ setup
let channel;
async function connectRabbit() {
    try {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const conn = await amqp.connect(url);
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


// Optional auth middleware for endpoints that can work with or without auth
const optionalVerifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        req.user = null;
        return next();
    }
    try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
        const response = await axios.post(`${authServiceUrl}/verify`, { token }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        req.user = response.data.user;
        next();
    } catch (err) {
        req.user = null;
        next();
    }
};

// Routes

/**
 * @swagger
 * /interactions/comments:
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
app.post('/interactions/comments', verifyToken, async (req, res) => {
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
 * /interactions/comments/{contentId}:
 *   get:
 *     summary: Get comments for content
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Content ID
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [movie, tv]
 *         description: Content type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, top]
 *           default: newest
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCommentsResponse'
 *       400:
 *         description: Bad request
 */
app.get('/interactions/comments/:contentId', async (req, res) => {
    try {
        const { contentId } = req.params;
        const { contentType, page = 1, sortBy = 'newest' } = req.query;

        if (!contentType || !['movie', 'tv'].includes(contentType)) {
            return res.status(400).json({ error: 'Valid contentType (movie or tv) is required' });
        }

        const pageNum = parseInt(page) || 1;
        const limit = 10; // comments per page
        const skip = (pageNum - 1) * limit;

        // Build sort options
        let sortOptions = {};
        switch (sortBy) {
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'top':
                // For now, just sort by creation date, could be enhanced with likes later
                sortOptions = { createdAt: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        // Get comments with user info
        const comments = await Comment.find({ contentId: parseInt(contentId), contentType })
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name avatar')
            .lean();

        // Get total count for pagination
        const totalComments = await Comment.countDocuments({ contentId: parseInt(contentId), contentType });
        const totalPages = Math.ceil(totalComments / limit);

        // Transform comments to match frontend expectations
        const transformedComments = comments.map(comment => ({
            _id: comment._id,
            text: comment.text,
            createdAt: comment.createdAt,
            userName: comment.userId?.name || 'Anonymous',
            userAvatar: comment.userId?.avatar || null,
            likes: [] // Placeholder for future likes feature
        }));

        res.json({
            comments: transformedComments,
            totalPages,
            currentPage: pageNum,
            totalComments
        });
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /interactions/ratings:
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
app.post('/interactions/ratings', verifyToken, async (req, res) => {
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

/**
 * @swagger
 * /interactions/ratings/{contentId}:
 *   get:
 *     summary: Get ratings for content
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Content ID
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [movie, tv]
 *         description: Content type
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetRatingsResponse'
 *       400:
 *         description: Bad request
 */
app.get('/interactions/ratings/:contentId', optionalVerifyToken, async (req, res) => {
    try {
        const { contentId } = req.params;
        const { contentType } = req.query;

        if (!contentType || !['movie', 'tv'].includes(contentType)) {
            return res.status(400).json({ error: 'Valid contentType (movie or tv) is required' });
        }

        // Get all ratings for this content
        const ratings = await Rating.find({ contentId: parseInt(contentId), contentType }).lean();

        // Calculate average rating and total ratings
        const totalRatings = ratings.length;
        const averageRating = totalRatings > 0
            ? ratings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings
            : 0;

        // Get user's rating if authenticated
        let userRating = null;
        if (req.user) {
            const userRatingDoc = await Rating.findOne({
                userId: req.user.id,
                contentId: parseInt(contentId),
                contentType
            }).lean();
            if (userRatingDoc) {
                userRating = userRatingDoc.score;
            }
        }

        res.json({
            contentId: parseInt(contentId),
            contentType,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            totalRatings,
            userRating,
            hasUserRated: userRating !== null
        });
    } catch (err) {
        console.error('Error fetching ratings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /interactions/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteCommentResponse'
 *       403:
 *         description: Forbidden - can only delete own comments
 *       404:
 *         description: Comment not found
 *       401:
 *         description: Unauthorized
 */
app.delete('/interactions/comments/:commentId', verifyToken, async (req, res) => {
    try {
        const { commentId } = req.params;

        // Find the comment and check ownership
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check if user owns the comment
        if (comment.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Can only delete your own comments' });
        }

        await Comment.findByIdAndDelete(commentId);

        // Publish event
        publishEvent('comment.deleted', {
            userId: req.user.id,
            commentId,
            contentId: comment.contentId,
            contentType: comment.contentType
        });

        res.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        console.error('Error deleting comment:', err);
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
                GetCommentsResponse: {
                    type: 'object',
                    properties: {
                        comments: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    text: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    userName: { type: 'string' },
                                    userAvatar: { type: 'string', nullable: true },
                                    likes: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    }
                                }
                            }
                        },
                        totalPages: { type: 'integer' },
                        currentPage: { type: 'integer' },
                        totalComments: { type: 'integer' }
                    }
                },
                GetRatingsResponse: {
                    type: 'object',
                    properties: {
                        contentId: { type: 'integer' },
                        contentType: { type: 'string', enum: ['movie', 'tv'] },
                        averageRating: { type: 'number' },
                        totalRatings: { type: 'integer' },
                        userRating: { type: 'number', nullable: true }
                    }
                },
                DeleteCommentResponse: {
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
    startupLogger('Interaction Service', PORT);
});
