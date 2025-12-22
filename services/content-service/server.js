const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const redis = require('redis');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const axios = require('axios');
const mongoose = require('mongoose');

dotenv.config();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 4003;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Redis client
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

// MongoDB schema and model
const contentSchema = new mongoose.Schema({
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, required: true, enum: ['movie', 'tv', 'person'] },
    data: { type: Object, required: true },
    enriched: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

contentSchema.index({ tmdbId: 1, mediaType: 1 }, { unique: true });

const Content = mongoose.model('Content', contentSchema);

// TMDB API helper
async function fetchFromTMDB(endpoint) {
    const url = `https://api.themoviedb.org/3${endpoint}`;
    const config = {
        headers: {
            'Authorization': `Bearer ${process.env.TMDB_API_KEY}`,
            'accept': 'application/json'
        },
        params: {
            language: 'en-US'
        }
    };
    const res = await axios.get(url, config);
    return res.data;
}

// Caching logic
async function getCachedOrFetch(key, fetchFn, ttl = 3600) {
    const cached = await redisClient.get(key);
    if (cached) return { data: JSON.parse(cached), cached: true };
    const data = await fetchFn();
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    return { data, cached: false };
}

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Content Service API',
            version: '1.0.0',
            description: 'API for fetching movie and TV content from TMDB',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            },
        ],
        tags: [
            {
                name: 'Content',
                description: 'Content fetching endpoints'
            }
        ],
        components: {
            schemas: {
                TMDBMovie: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        title: { type: 'string' },
                        poster_path: { type: 'string' },
                        release_date: { type: 'string', format: 'date' },
                        overview: { type: 'string' },
                        vote_average: { type: 'number' },
                        genre_ids: {
                            type: 'array',
                            items: { type: 'number' }
                        }
                    }
                },
                TMDBTV: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        poster_path: { type: 'string' },
                        first_air_date: { type: 'string', format: 'date' },
                        overview: { type: 'string' },
                        vote_average: { type: 'number' },
                        genre_ids: {
                            type: 'array',
                            items: { type: 'number' }
                        }
                    }
                },
                TMDBSearchResult: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        title: { type: 'string' },
                        name: { type: 'string' },
                        poster_path: { type: 'string' },
                        media_type: { type: 'string', enum: ['movie', 'tv', 'person'] },
                        release_date: { type: 'string', format: 'date' },
                        first_air_date: { type: 'string', format: 'date' },
                        overview: { type: 'string' },
                        vote_average: { type: 'number' }
                    }
                },
                TrendingResponse: {
                    type: 'object',
                    properties: {
                        page: { type: 'number' },
                        results: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/TMDBMovie' }
                        },
                        total_pages: { type: 'number' },
                        total_results: { type: 'number' }
                    }
                },
                TrendingTVResponse: {
                    type: 'object',
                    properties: {
                        page: { type: 'number' },
                        results: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/TMDBTV' }
                        },
                        total_pages: { type: 'number' },
                        total_results: { type: 'number' }
                    }
                },
                SearchResponse: {
                    type: 'object',
                    properties: {
                        page: { type: 'number' },
                        results: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/TMDBSearchResult' }
                        },
                        total_pages: { type: 'number' },
                        total_results: { type: 'number' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: ['./server.js'], // files containing annotations
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoints

/**
 * @swagger
 * /movies/trending:
 *   get:
 *     summary: Get trending movies
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of trending movies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendingResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/movies/trending', async (req, res) => {
    try {
        const result = await getCachedOrFetch('tmdb:trending:movie:week', () => fetchFromTMDB('/trending/movie/week'));
        if (!result.cached) {
            for (const item of result.data.results) {
                await Content.findOneAndUpdate(
                    { tmdbId: item.id, mediaType: 'movie' },
                    { data: item, updatedAt: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }
        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json(result.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /tv/trending:
 *   get:
 *     summary: Get trending TV shows
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of trending TV shows
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendingTVResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/tv/trending', async (req, res) => {
    try {
        const result = await getCachedOrFetch('tmdb:trending:tv:week', () => fetchFromTMDB('/trending/tv/week'));
        if (!result.cached) {
            for (const item of result.data.results) {
                await Content.findOneAndUpdate(
                    { tmdbId: item.id, mediaType: 'tv' },
                    { data: item, updatedAt: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }
        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json(result.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search for movies and TV shows
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: Bad request - Query parameter q is required
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
app.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    try {
        const result = await getCachedOrFetch(`tmdb:search:multi:${q}`, () => fetchFromTMDB(`/search/multi?query=${encodeURIComponent(q)}`));
        if (!result.cached) {
            for (const item of result.data.results) {
                await Content.findOneAndUpdate(
                    { tmdbId: item.id, mediaType: item.media_type },
                    { data: item, updatedAt: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }
        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json(result.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Content Service OK' });
});

app.listen(PORT, () => {
    console.log(`Content Service running on port ${PORT}`);
});
