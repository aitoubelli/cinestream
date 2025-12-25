const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const redis = require('redis');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const axios = require('axios');
const mongoose = require('mongoose');
const { requestLogger, startupLogger } = require('../../shared/logging');

dotenv.config();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 4003;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

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
async function fetchFromTMDB(endpoint, additionalParams = {}) {
    const url = `https://api.themoviedb.org/3${endpoint}`;
    const config = {
        headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`
        },
        params: {
            language: 'en-US',
            ...additionalParams
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
 * /trending/all/week:
 *   get:
 *     summary: Get trending content (movies and TV)
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of trending content
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
app.get('/trending/all/week', async (req, res) => {
    try {
        const result = await getCachedOrFetch('tmdb:trending:all:week', () => fetchFromTMDB('/trending/all/week'));
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
 * /movies/popular:
 *   get:
 *     summary: Get popular movies
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
         description: Page number
 *     responses:
 *       200:
 *         description: List of popular movies
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
app.get('/movies/popular', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await getCachedOrFetch(`tmdb:popular:movie:${page}`, () => fetchFromTMDB(`/movie/popular?page=${page}`));
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
 * /tv/popular:
 *   get:
 *     summary: Get popular TV shows
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of popular TV shows
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
app.get('/tv/popular', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await getCachedOrFetch(`tmdb:popular:tv:${page}`, () => fetchFromTMDB(`/tv/popular?page=${page}`));
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
 * /movies/now-playing:
 *   get:
 *     summary: Get now playing movies
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of now playing movies
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
app.get('/movies/now-playing', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await getCachedOrFetch(`tmdb:now-playing:movie:${page}`, () => fetchFromTMDB(`/movie/now_playing?page=${page}`));
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
 * /tv/on-the-air:
 *   get:
 *     summary: Get TV shows currently on the air
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of TV shows on the air
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
app.get('/tv/on-the-air', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await getCachedOrFetch(`tmdb:on-the-air:tv:${page}`, () => fetchFromTMDB(`/tv/on_the_air?page=${page}`));
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
 * /movies/{id}:
 *   get:
 *     summary: Get movie details by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TMDBMovie'
 *       404:
 *         description: Movie not found
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
app.get('/movies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `tmdb:movie:${id}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            res.set('X-Cache-Status', 'HIT');
            return res.json(JSON.parse(cached));
        }

        const data = await fetchFromTMDB(`/movie/${id}?append_to_response=credits,videos`);
        await Content.findOneAndUpdate(
            { tmdbId: parseInt(id), mediaType: 'movie' },
            { data, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
        res.set('X-Cache-Status', 'MISS');
        res.json(data);
    } catch (error) {
        if (error.response?.status === 404) {
            res.status(404).json({ error: 'Movie not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * @swagger
 * /tv/{id}:
 *   get:
 *     summary: Get TV show details by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TV show ID
 *     responses:
 *       200:
 *         description: TV show details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TMDBTV'
 *       404:
 *         description: TV show not found
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
app.get('/tv/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `tmdb:tv:${id}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            res.set('X-Cache-Status', 'HIT');
            return res.json(JSON.parse(cached));
        }

        const data = await fetchFromTMDB(`/tv/${id}?append_to_response=credits,videos`);
        await Content.findOneAndUpdate(
            { tmdbId: parseInt(id), mediaType: 'tv' },
            { data, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
        res.set('X-Cache-Status', 'MISS');
        res.json(data);
    } catch (error) {
        if (error.response?.status === 404) {
            res.status(404).json({ error: 'TV show not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * @swagger
 * /movies/{id}/recommendations:
 *   get:
 *     summary: Get movie recommendations
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Movie recommendations
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
app.get('/movies/:id/recommendations', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const result = await getCachedOrFetch(`tmdb:movie:${id}:recommendations:${page}`, () => fetchFromTMDB(`/movie/${id}/recommendations?page=${page}`));
        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json({ data: result.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /tv/{id}/recommendations:
 *   get:
 *     summary: Get TV show recommendations
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TV show ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: TV show recommendations
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
app.get('/tv/:id/recommendations', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const result = await getCachedOrFetch(`tmdb:tv:${id}:recommendations:${page}`, () => fetchFromTMDB(`/tv/${id}/recommendations?page=${page}`));
        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json({ data: result.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Series routes (aliases for TV routes)
app.get('/series/trending', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
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
});

app.get('/series/popular', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const result = await getCachedOrFetch(`tmdb:popular:tv:${page}`, () => fetchFromTMDB(`/tv/popular?page=${page}`));
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
});

app.get('/series/:id', async (req, res) => {
    const { id } = req.params;
    const cacheKey = `tmdb:tv:${id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        res.set('X-Cache-Status', 'HIT');
        return res.json(JSON.parse(cached));
    }

    const data = await fetchFromTMDB(`/tv/${id}?append_to_response=credits,videos`);
    await Content.findOneAndUpdate(
        { tmdbId: parseInt(id), mediaType: 'tv' },
        { data, updatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
    res.set('X-Cache-Status', 'MISS');
    res.json(data);
});

app.get('/series/:id/recommendations', async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const result = await getCachedOrFetch(`tmdb:tv:${id}:recommendations:${page}`, () => fetchFromTMDB(`/tv/${id}/recommendations?page=${page}`));
    res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
    res.json(result.data);
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

/**
 * @swagger
 * /content/{type}/{id}:
 *   get:
 *     summary: Get content details by type and ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [movie, tv]
 *         description: Content type
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content details
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/TMDBMovie'
 *                 - $ref: '#/components/schemas/TMDBTV'
 *       400:
 *         description: Invalid type parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Content not found
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
app.get('/content/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;

        if (type !== 'movie' && type !== 'tv') {
            return res.status(400).json({ error: 'Invalid type parameter. Must be "movie" or "tv"' });
        }

        const cacheKey = `tmdb:${type}:${id}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            res.set('X-Cache-Status', 'HIT');
            return res.json(JSON.parse(cached));
        }

        const endpoint = type === 'movie' ? `/movie/${id}?append_to_response=credits,videos` : `/tv/${id}?append_to_response=credits,videos`;
        const data = await fetchFromTMDB(endpoint);

        await Content.findOneAndUpdate(
            { tmdbId: parseInt(id), mediaType: type },
            { data, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
        res.set('X-Cache-Status', 'MISS');
        res.json(data);
    } catch (error) {
        if (error.response?.status === 404) {
            res.status(404).json({ error: `${req.params.type} not found` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * @swagger
 * /browse:
 *   get:
 *     summary: Browse content with filters
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [movie, tv]
 *           default: movie
 *         description: Content type
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *           default: all
 *         description: Genre filter
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *           default: all
 *         description: Year filter
 *       - in: query
 *         name: rating
 *         schema:
 *           type: string
 *           default: all
 *         description: Minimum rating filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [popular, top_rated, newest, trending]
 *           default: popular
 *         description: Sort option
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: all
 *         description: Language filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Browse results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - $ref: '#/components/schemas/TMDBMovie'
 *                       - $ref: '#/components/schemas/TMDBTV'
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalResults:
 *                   type: integer
 *       400:
 *         description: Invalid parameters
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
app.get('/browse', async (req, res) => {
    try {
        const {
            type = 'movie',
            genre = 'all',
            year = 'all',
            rating = 'all',
            sortBy = 'popular',
            language = 'all',
            page = 1
        } = req.query;

        const pageNum = parseInt(page) || 1;

        // Validate type parameter
        if (type !== 'movie' && type !== 'tv') {
            return res.status(400).json({
                success: false,
                error: 'Invalid type parameter. Must be "movie" or "tv".',
            });
        }

        // Build TMDB parameters
        const params = { page: pageNum };

        // Genre mapping (simplified) - using lowercase keys to match frontend
        const genreMap = {
            'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35, 'crime': 80,
            'documentary': 99, 'drama': 18, 'fantasy': 14, 'horror': 27, 'mystery': 9648,
            'romance': 10749, 'sci-fi': 878, 'thriller': 53, 'war': 10752, 'western': 37
        };

        // Only add genre filter if it's not 'all'
        if (genre !== 'all' && genreMap[genre]) {
            params.with_genres = genreMap[genre];
        }

        // Only add year filter if it's not 'all'
        if (year !== 'all') {
            params[type === 'movie' ? 'primary_release_year' : 'first_air_date_year'] = year;
        }

        // Only add rating filter if it's not 'all'
        if (rating !== 'all') {
            params['vote_average.gte'] = parseFloat(rating.replace('+', '')); // Remove '+' from rating values like '8+'
        }

        // Only add language filter if it's not 'all'
        if (language !== 'all') {
            params.with_original_language = language.toLowerCase();
        }

        // Sort options
        const sortMap = {
            'popular': 'popularity.desc',
            'top_rated': 'vote_average.desc',
            'newest': type === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc'
        };

        if (sortBy !== 'trending' && sortMap[sortBy]) {
            params.sort_by = sortMap[sortBy];
        }

        let endpoint;
        if (sortBy === 'trending') {
            endpoint = `/trending/${type}/week`;
        } else {
            endpoint = `/discover/${type}`;
            // If it's discover and no sort_by is provided, default to popularity.desc
            if (!params.sort_by) {
                params.sort_by = 'popularity.desc';
            }
        }

        const data = await fetchFromTMDB(endpoint, params);

        // Transform results to match frontend expectations
        const results = data.results.map(item => {
            const isMovie = item.title !== undefined;

            return {
                id: item.id,
                title: isMovie ? item.title : item.name,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                rating: item.vote_average,
                year: isMovie ? (item.release_date ? item.release_date.substring(0, 4) : 'N/A') : (item.first_air_date ? item.first_air_date.substring(0, 4) : 'N/A'),
                genres: item.genre_ids || [],
                type: type
            };
        });

        res.json({
            success: true,
            results,
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results
        });

    } catch (error) {
        console.error('Error in browse route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch browse content',
        });
    }
});

/**
 * @swagger
 * /featured/popular/movies:
 *   get:
 *     summary: Get popular movies for featured carousel
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of popular movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: number }
 *                   title: { type: string }
 *                   description: { type: string }
 *                   rating: { type: number }
 *                   poster: { type: string }
 *                   backdrop: { type: string }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/featured/popular/movies', async (req, res) => {
    try {
        const result = await getCachedOrFetch(`tmdb:popular:movie:1`, () => fetchFromTMDB(`/movie/popular?page=1`));
        if (!result.cached) {
            for (const item of result.data.results) {
                await Content.findOneAndUpdate(
                    { tmdbId: item.id, mediaType: 'movie' },
                    { data: item, updatedAt: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }

        // Transform to match frontend expectation
        const movies = result.data.results.slice(0, 10).map(movie => ({
            id: movie.id,
            title: movie.title,
            description: movie.overview,
            rating: movie.vote_average,
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/fallback-poster.svg',
            backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null
        }));

        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /featured/popular/series:
 *   get:
 *     summary: Get popular TV series for featured carousel
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of popular TV series
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: number }
 *                   title: { type: string }
 *                   description: { type: string }
 *                   rating: { type: number }
 *                   poster: { type: string }
 *                   backdrop: { type: string }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/featured/popular/series', async (req, res) => {
    try {
        const result = await getCachedOrFetch(`tmdb:popular:tv:1`, () => fetchFromTMDB(`/tv/popular?page=1`));
        if (!result.cached) {
            for (const item of result.data.results) {
                await Content.findOneAndUpdate(
                    { tmdbId: item.id, mediaType: 'tv' },
                    { data: item, updatedAt: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }

        // Transform to match frontend expectation
        const series = result.data.results.slice(0, 10).map(show => ({
            id: show.id,
            title: show.name,
            description: show.overview,
            rating: show.vote_average,
            poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '/fallback-poster.svg',
            backdrop: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : null
        }));

        res.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
        res.json(series);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Content Service OK' });
});

app.listen(PORT, () => {
    startupLogger('Content Service', PORT);
});
