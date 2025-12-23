const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(helmet());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const refreshTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

// JWT helpers
const generateAccessToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Routes

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - Email and password required
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ error: 'User already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User({ email, passwordHash });
        await user.save();

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const refreshTokenDoc = new RefreshToken({
            token: refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        await refreshTokenDoc.save();

        // Set httpOnly cookie
        res.cookie('auth', accessToken, { httpOnly: true, secure: false, sameSite: 'lax' });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
* @swagger
* /login:
*   post:
*     summary: Login user
*     tags: [Auth]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - password
*             properties:
*               email:
*                 type: string
*                 format: email
*               password:
*                 type: string
*                 minLength: 1
*     responses:
*       200:
*         description: Login successful
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/AuthResponse'
*       400:
*         description: Bad request - Email and password required
*       401:
*         description: Invalid credentials
*       500:
*         description: Internal server error
*/
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Remove old refresh tokens for user
        await RefreshToken.deleteMany({ userId: user._id });

        const refreshTokenDoc = new RefreshToken({
            token: refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await refreshTokenDoc.save();

        // Set httpOnly cookie
        res.cookie('auth', accessToken, { httpOnly: true, secure: false, sameSite: 'lax' });

        res.json({ message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Bad request - Refresh token required
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
app.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) return res.status(401).json({ error: 'Invalid refresh token' });

            const user = await User.findById(decoded.id);
            if (!user) return res.status(401).json({ error: 'User not found' });

            const newAccessToken = generateAccessToken(user);
            res.json({ accessToken: newAccessToken });
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
  * @swagger
  * /verify:
  *   post:
  *     summary: Verify access token
  *     tags: [Auth]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - token
  *             properties:
  *               token:
  *                 type: string
  *     responses:
  *       200:
  *         description: Token verified successfully
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/VerifyResponse'
  *       400:
  *         description: Bad request - Token required
  *       401:
  *         description: Invalid token
  *       500:
  *         description: Internal server error
  */
app.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) return res.status(401).json({ error: 'Invalid token' });

            const user = await User.findById(decoded.id);
            if (!user) return res.status(401).json({ error: 'User not found' });

            res.json({ user: { id: user._id, email: user.email, role: user.role } });
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uid:
 *                   type: string
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 name:
 *                   type: string
 *                 avatar:
 *                   type: number
 *                 role:
 *                   type: string
 *                   enum: [user, admin]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
app.get('/profile', async (req, res) => {
    try {
        // For now, get token from cookie (since auth-service sets it)
        const token = req.cookies.auth;
        if (!token) return res.status(401).json({ error: 'No token provided' });

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) return res.status(401).json({ error: 'Invalid token' });

            const user = await User.findById(decoded.id);
            if (!user) return res.status(401).json({ error: 'User not found' });

            // Return profile in the format expected by frontend
            res.json({
                uid: user._id.toString(),
                email: user.email,
                username: user.email.split('@')[0], // Simple username from email
                name: user.email.split('@')[0], // Simple name from email
                avatar: 0, // Default avatar
                role: user.role
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Auth Service API',
            version: '1.0.0',
            description: 'Authentication service for CineStream',
        },
        servers: [
            {
                url: 'http://localhost:4001',
            },
        ],
        tags: [
            {
                name: 'Auth',
                description: 'Authentication endpoints'
            }
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        passwordHash: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'admin'] },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                RefreshToken: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        token: { type: 'string' },
                        userId: { type: 'string' },
                        expiresAt: { type: 'string', format: 'date-time' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' }
                    }
                },
                VerifyResponse: {
                    type: 'object',
                    properties: {
                        user: {
                            $ref: '#/components/schemas/User'
                        }
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

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Auth Service OK' });
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
