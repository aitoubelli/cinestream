const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
const { requestLogger, startupLogger } = require('../../shared/logging');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schema
const userProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    email: { type: String, required: true },
    fullName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    watchlist: [{
        tmdbId: { type: Number, required: true },
        type: { type: String, enum: ['movie', 'tv'], required: true }
    }]
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

// Auth middleware
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
        const response = await axios.post(`${authServiceUrl}/verify`, { token });
        req.user = response.data.user; // { id, email, role }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Routes

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/profile', verifyToken, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) {
            // Create default profile if not exists
            const newProfile = new UserProfile({ userId: req.user.id, email: req.user.email });
            await newProfile.save();
            return res.json({
                id: newProfile.userId,
                email: newProfile.email,
                fullName: newProfile.fullName,
                avatar: newProfile.avatar,
                watchlist: newProfile.watchlist
            });
        }
        res.json({
            id: profile.userId,
            email: profile.email,
            fullName: profile.fullName,
            avatar: profile.avatar,
            watchlist: profile.watchlist
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.patch('/profile', verifyToken, async (req, res) => {
    try {
        const { fullName, avatar } = req.body;
        const profile = await UserProfile.findOneAndUpdate(
            { userId: req.user.id },
            { fullName, avatar },
            { new: true, upsert: true }
        );
        res.json({
            id: profile.userId,
            email: profile.email,
            fullName: profile.fullName,
            avatar: profile.avatar,
            watchlist: profile.watchlist
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /watchlist:
 *   post:
 *     summary: Add item to watchlist
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddWatchlistRequest'
 *     responses:
 *       201:
 *         description: Item added to watchlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - tmdbId and type required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Item already in watchlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/watchlist', verifyToken, async (req, res) => {
    try {
        const { tmdbId, type } = req.body;
        if (!tmdbId || !type) return res.status(400).json({ error: 'tmdbId and type required' });

        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // Check if already in watchlist
        const exists = profile.watchlist.some(item => item.tmdbId === tmdbId && item.type === type);
        if (exists) return res.status(409).json({ error: 'Already in watchlist' });

        profile.watchlist.push({ tmdbId, type });
        await profile.save();
        res.status(201).json({ message: 'Added to watchlist' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /watchlist/{tmdbId}:
 *   delete:
 *     summary: Remove item from watchlist
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tmdbId
 *         required: true
 *         schema:
 *           type: number
 *         description: TMDB ID of the item to remove
 *     responses:
 *       200:
 *         description: Item removed from watchlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete('/watchlist/:tmdbId', verifyToken, async (req, res) => {
    try {
        const tmdbId = parseInt(req.params.tmdbId);
        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        profile.watchlist = profile.watchlist.filter(item => item.tmdbId !== tmdbId);
        await profile.save();
        res.json({ message: 'Removed from watchlist' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'User Service API',
            version: '1.0.0',
            description: 'User profile and watchlist service for CineStream',
        },
        servers: [
            {
                url: 'http://localhost:4002',
            },
        ],
        tags: [
            {
                name: 'User',
                description: 'User profile and watchlist endpoints'
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
                UserProfile: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        fullName: { type: 'string' },
                        avatar: { type: 'string' },
                        watchlist: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/WatchlistItem' }
                        }
                    }
                },
                WatchlistItem: {
                    type: 'object',
                    properties: {
                        tmdbId: { type: 'number' },
                        type: { type: 'string', enum: ['movie', 'tv'] }
                    }
                },
                UpdateProfileRequest: {
                    type: 'object',
                    properties: {
                        fullName: { type: 'string' },
                        avatar: { type: 'string' }
                    }
                },
                AddWatchlistRequest: {
                    type: 'object',
                    required: ['tmdbId', 'type'],
                    properties: {
                        tmdbId: { type: 'number' },
                        type: { type: 'string', enum: ['movie', 'tv'] }
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

// Internal endpoint for service-to-service communication (no auth required)
app.get('/internal/users-by-watchlist', async (req, res) => {
    try {
        const { tmdbId, type } = req.query;
        if (!tmdbId || !type) return res.status(400).json({ error: 'tmdbId and type required' });

        const profiles = await UserProfile.find({
            watchlist: {
                $elemMatch: { tmdbId: parseInt(tmdbId), type }
            }
        });

        const userIds = profiles.map(profile => profile.userId.toString());
        res.json({ userIds });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'User Service OK' });
});

app.listen(PORT, () => {
    startupLogger('User Service', PORT);
});
