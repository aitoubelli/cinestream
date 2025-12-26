const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');
const amqp = require('amqplib');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
const { requestLogger, startupLogger } = require('../../shared/logging');
const verifyToken = require('../../shared/middleware/verifyToken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

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
    username: { type: String, default: '' },
    fullName: { type: String, default: '' },
    avatar: { type: Number, default: 0 },
    watchlist: [{
        contentId: { type: Number, required: true },
        contentType: { type: String, enum: ['movie', 'tv'], required: true }
    }]
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    username: { type: String, default: '' },
    name: { type: String, default: '' },
    avatar: { type: Number, default: 0, min: 0, max: 19 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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
                userId: newProfile.userId,
                email: newProfile.email,
                username: newProfile.username,
                fullName: newProfile.fullName,
                avatar: newProfile.avatar,
                role: req.user.role,
                watchlist: newProfile.watchlist
            });
        }
        res.json({
            userId: profile.userId,
            email: profile.email,
            username: profile.username,
            fullName: profile.fullName,
            avatar: profile.avatar,
            role: req.user.role,
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
        const { username, fullName, avatar } = req.body;
        const updateData = {};
        if (username !== undefined) updateData.username = username;
        if (fullName !== undefined) updateData.fullName = fullName;
        if (avatar !== undefined) updateData.avatar = avatar;
        const profile = await UserProfile.findOneAndUpdate(
            { userId: req.user.id },
            updateData,
            { new: true, upsert: true }
        );

        // Sync with auth service
        try {
            await axios.put(`${authServiceUrl}/internal/users/${req.user.id}/profile`, {
                username,
                name: fullName,
                avatar
            });
        } catch (syncErr) {
            console.error('Failed to sync profile with auth service:', syncErr.message);
            // Don't fail the request if sync fails
        }

        // Publish event to update old comments
        publishEvent('profile.updated', {
            userId: req.user.id,
            username: profile.username,
            avatar: profile.avatar
        });

        res.json({
            userId: profile.userId,
            email: profile.email,
            username: profile.username,
            fullName: profile.fullName,
            avatar: profile.avatar,
            role: req.user.role,
            watchlist: profile.watchlist
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /watchlist:
 *   get:
 *     summary: Get user watchlist
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 watchlist:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WatchlistItem'
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
app.get('/watchlist', verifyToken, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        res.json({ watchlist: profile.watchlist });
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
        const { contentId, contentType } = req.body;
        if (!contentId || !contentType) return res.status(400).json({ error: 'contentId and contentType required' });

        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // Check if already in watchlist
        const exists = profile.watchlist.some(item => item.contentId === contentId && item.contentType === contentType);
        if (exists) return res.status(409).json({ error: 'Already in watchlist' });

        profile.watchlist.push({ contentId, contentType });
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
app.delete('/watchlist/:contentId', verifyToken, async (req, res) => {
    try {
        const contentId = parseInt(req.params.contentId);
        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        profile.watchlist = profile.watchlist.filter(item => item.contentId !== contentId);
        await profile.save();
        res.json({ message: 'Removed from watchlist' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /user/recommanded:
 *   get:
 *     summary: Get recommended content for user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [movie, tv, all]
 *         description: Filter recommendations by content type (optional)
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - $ref: '#/components/schemas/TMDBMovie'
 *                       - $ref: '#/components/schemas/TMDBTV'
 *       500:
 *         description: Internal server error
 */
app.get('/user/recommanded', verifyToken, async (req, res) => {
    try {
        const { contentType } = req.query; // 'movie', 'tv', or undefined
        const interactionServiceUrl = process.env.INTERACTION_SERVICE_URL || 'http://localhost:4004';
        const contentServiceUrl = process.env.CONTENT_SERVICE_URL || 'http://localhost:4003';

        try {
            // Try to get personalized recommendations based on user's latest interaction
            const latestResponse = await axios.get(`${interactionServiceUrl}/interactions/latest?userId=${req.user.id}&type=rating`);
            const { contentId, contentType: interactionContentType } = latestResponse.data;

            // If contentType is specified and matches the interaction type, use personalized recs
            // If contentType is specified but doesn't match, we'll fall back to trending of that type
            // If no contentType specified, use the interaction type
            const targetContentType = contentType && contentType !== 'all' ? contentType :
                interactionContentType;

            try {
                const recResponse = await axios.get(`${contentServiceUrl}/content/recommendations?contentId=${contentId}&contentType=${targetContentType}`);
                const recommendations = recResponse.data.data.results.slice(0, 12);
                res.json({ recommendations });
            } catch (recError) {
                // If recommendations not available, fall back to trending of target type
                let trendingResponse;
                if (targetContentType === 'tv') {
                    trendingResponse = await axios.get(`${contentServiceUrl}/tv/trending`);
                } else if (targetContentType === 'movie') {
                    trendingResponse = await axios.get(`${contentServiceUrl}/movies/trending`);
                } else {
                    trendingResponse = await axios.get(`${contentServiceUrl}/trending/all/week`);
                }
                const recommendations = trendingResponse.data.results.slice(0, 12);
                res.json({ recommendations });
            }
        } catch (latestError) {
            if (latestError.response?.status === 404) {
                // No user interactions found, return trending content of requested type
                let trendingResponse;
                if (contentType === 'tv') {
                    trendingResponse = await axios.get(`${contentServiceUrl}/tv/trending`);
                } else if (contentType === 'movie') {
                    trendingResponse = await axios.get(`${contentServiceUrl}/movies/trending`);
                } else {
                    trendingResponse = await axios.get(`${contentServiceUrl}/trending/all/week`);
                }
                const recommendations = trendingResponse.data.results.slice(0, 12);
                res.json({ recommendations });
            } else {
                throw latestError;
            }
        }
    } catch (error) {
        console.error('Error fetching recommendations:', error);
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
                        avatar: { type: 'number' },
                        watchlist: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/WatchlistItem' }
                        }
                    }
                },
                WatchlistItem: {
                    type: 'object',
                    properties: {
                        contentId: { type: 'number' },
                        contentType: { type: 'string', enum: ['movie', 'tv'] }
                    }
                },
                UpdateProfileRequest: {
                    type: 'object',
                    properties: {
                        fullName: { type: 'string' },
                        avatar: { type: 'number' }
                    }
                },
                AddWatchlistRequest: {
                    type: 'object',
                    required: ['contentId', 'contentType'],
                    properties: {
                        contentId: { type: 'number' },
                        contentType: { type: 'string', enum: ['movie', 'tv'] }
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
        const { contentId, contentType } = req.query;
        if (!contentId || !contentType) return res.status(400).json({ error: 'contentId and contentType required' });

        const profiles = await UserProfile.find({
            watchlist: {
                $elemMatch: { contentId: parseInt(contentId), contentType }
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

// Connect to RabbitMQ on startup
connectRabbit();

// --- Watch History Schema & Endpoints ---

const watchHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    contentId: { type: Number, required: true },
    contentType: { type: String, enum: ['movie', 'tv'], required: true },
    seasonNumber: { type: Number }, // Required for tv
    episodeNumber: { type: Number }, // Required for tv
    progressSeconds: { type: Number, required: true, default: 0 },
    durationSeconds: { type: Number, required: true, default: 0 },
    lastWatchedAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false }
});

// Compound index for efficient lookup
watchHistorySchema.index({ userId: 1, contentId: 1, contentType: 1, seasonNumber: 1, episodeNumber: 1 }, { unique: true });
// Index for sorting by last watched
watchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);

/**
 * @swagger
 * /continue-watching:
 *   post:
 *     summary: Update watch progress
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentId, contentType, progressSeconds, durationSeconds]
 *             properties:
 *               contentId: { type: number }
 *               contentType: { type: string, enum: [movie, tv] }
 *               seasonNumber: { type: number }
 *               episodeNumber: { type: number }
 *               progressSeconds: { type: number }
 *               durationSeconds: { type: number }
 *     responses:
 *       200:
 *         description: Progress updated
 */
app.post('/continue-watching', verifyToken, async (req, res) => {
    try {
        const { contentId, contentType, seasonNumber, episodeNumber, progressSeconds, durationSeconds } = req.body;

        if (!contentId || !contentType || progressSeconds === undefined || durationSeconds === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (contentType === 'tv' && (seasonNumber === undefined || episodeNumber === undefined)) {
            return res.status(400).json({ error: 'seasonNumber and episodeNumber required for TV series' });
        }

        const completed = durationSeconds > 0 && (progressSeconds / durationSeconds) >= 0.9;

        const filter = {
            userId: req.user.id,
            contentId,
            contentType,
            ...(contentType === 'tv' && { seasonNumber, episodeNumber })
        };

        const update = {
            progressSeconds,
            durationSeconds,
            lastWatchedAt: new Date(),
            completed
        };

        await WatchHistory.findOneAndUpdate(filter, update, { upsert: true, new: true });

        res.json({ success: true, completed });
    } catch (err) {
        console.error('Error updating watch history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /continue-watching:
 *   get:
 *     summary: Get continue watching list
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items to continue watching
 */
app.get('/continue-watching', verifyToken, async (req, res) => {
    try {
        // Get all unfinished history items
        // For movies: return simple item
        // For series: return the most recently watched episode

        // We can fetch all history for user, sorted by lastWatchedAt desc
        const history = await WatchHistory.find({ userId: req.user.id }).sort({ lastWatchedAt: -1 }).limit(100);

        // Group by contentId to avoid duplicates for series (show only latest episode)
        const resultMap = new Map();

        for (const item of history) {
            const key = `${item.contentType}-${item.contentId}`;
            if (!resultMap.has(key)) {
                resultMap.set(key, item);
            }
        }

        const results = Array.from(resultMap.values());

        const enrichedResults = await Promise.all(results.map(async (item) => {
            try {
                // Call Content Service
                const contentServiceUrl = process.env.CONTENT_SERVICE_URL || 'http://localhost:4003';
                const endpoint = item.contentType === 'movie'
                    ? `/movies/${item.contentId}`
                    : `/tv/${item.contentId}`;

                const response = await axios.get(`${contentServiceUrl}${endpoint}`);
                const content = response.data;

                // If it's a series, we might need episode name if we want to display "S1E3: Title"
                let episodeName = '';
                if (item.contentType === 'tv') {
                    try {
                        const epResponse = await axios.get(`${contentServiceUrl}/tv/${item.contentId}/season/${item.seasonNumber}/episode/${item.episodeNumber}`);
                        episodeName = epResponse.data.name;
                    } catch (e) { /* ignore */ }
                }

                return {
                    id: item.contentId,
                    title: content.title || content.name,
                    name: content.name, // for series
                    poster_path: content.poster_path,
                    backdrop_path: content.backdrop_path,
                    vote_average: content.vote_average,
                    release_date: content.release_date,
                    first_air_date: content.first_air_date,
                    genre_ids: content.genres ? content.genres.map(g => g.id) : [],
                    progress: item.durationSeconds > 0 ? (item.progressSeconds / item.durationSeconds) * 100 : 0,
                    progressSeconds: item.progressSeconds,
                    durationSeconds: item.durationSeconds,
                    contentType: item.contentType,
                    // Extra fields for Series display
                    seasonNumber: item.seasonNumber,
                    episodeNumber: item.episodeNumber,
                    episodeName: episodeName
                };
            } catch (err) {
                console.error(`Failed to enrich content ${item.contentId}:`, err.message);
                return null;
            }
        }));

        res.json({ results: enrichedResults.filter(r => r !== null) });
    } catch (err) {
        console.error('Error fetching continue watching:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get full watch history
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, completed, in-progress]
 *     responses:
 *       200:
 *         description: Watch history list
 */
app.get('/history', verifyToken, async (req, res) => {
    try {
        const { filter } = req.query; // 'all', 'completed', 'in-progress'

        let query = { userId: req.user.id };

        if (filter === 'completed') {
            // For simplicity in granular list
            query.completed = true;
        } else if (filter === 'in-progress') {
            query.completed = false;
        }

        const history = await WatchHistory.find(query).sort({ lastWatchedAt: -1 });

        res.json({ data: history });
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /watch-progress:
 *   get:
 *     summary: Get watch progress for specific content
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contentId
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema: { type: string, enum: [movie, tv] }
 *       - in: query
 *         name: seasonNumber
 *         schema: { type: number }
 *       - in: query
 *         name: episodeNumber
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Progress retrieved
 */
app.get('/watch-progress', verifyToken, async (req, res) => {
    try {
        const { contentId, contentType, seasonNumber, episodeNumber } = req.query;

        if (!contentId || !contentType) {
            return res.status(400).json({ error: 'contentId and contentType required' });
        }

        const filter = {
            userId: req.user.id,
            contentId: parseInt(contentId),
            contentType,
            ...(contentType === 'tv' && seasonNumber && episodeNumber && {
                seasonNumber: parseInt(seasonNumber),
                episodeNumber: parseInt(episodeNumber)
            })
        };

        // Find sort by lastWatchedAt to get the latest interaction
        const history = await WatchHistory.findOne(filter).sort({ lastWatchedAt: -1 });

        if (history) {
            res.json({
                progressSeconds: history.progressSeconds,
                seasonNumber: history.seasonNumber,
                episodeNumber: history.episodeNumber
            });
        } else {
            res.json({ progressSeconds: 0 });
        }
    } catch (err) {
        console.error('Error fetching watch progress:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    startupLogger('User Service', PORT);
});
