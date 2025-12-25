const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
const { requestLogger, startupLogger } = require('../../shared/logging');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(requestLogger);
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
    username: { type: String, default: '' },
    name: { type: String, default: '' },
    avatar: { type: Number, default: 0, min: 0, max: 19 },
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

// Middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
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
app.post('/api/auth/register', async (req, res) => {
    console.log('Auth service: Register request received at', new Date().toISOString());
    console.log('Request body:', req.body);
    try {
        const { email, password, name } = req.body;
        console.log('Email:', email, 'Password provided:', !!password, 'Name:', name);
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ error: 'User already exists' });

        const passwordHash = await bcrypt.hash(password, 10);

        // Generate username from name if provided
        let username = '';
        if (name && name.trim()) {
            const base = name.toLowerCase().replace(/\s+/g, '');
            let attempts = 0;
            let tag;
            do {
                tag = Math.floor(Math.random() * 9000 + 1000);
                username = `${base}#${tag.toString().padStart(4, '0')}`;
                attempts++;
            } while (await User.findOne({ username }) && attempts < 10);
            if (attempts >= 10) {
                // Fallback, unlikely
                username = `${base}#${Date.now().toString().slice(-4)}`;
            }
        }

        const user = new User({ email, passwordHash, name, username });
        await user.save();

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const refreshTokenDoc = new RefreshToken({
            token: refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        await refreshTokenDoc.save();

        res.status(201).json({ accessToken, refreshToken });
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
app.post('/api/auth/login', async (req, res) => {
    console.log('Login route hit');
    console.log('Auth service: Login request received at', new Date().toISOString());
    console.log('Request body:', req.body);
    try {
        const { email, password } = req.body;
        console.log('Email:', email, 'Password provided:', !!password);
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        console.log('Finding user in database...');
        const user = await User.findOne({ email });
        console.log('User found:', !!user);

        if (!user) {
            console.log('User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('Comparing password...');
        // Temporarily log password comparison for debugging
        console.log('Input password:', password);
        console.log('Stored hash:', user.passwordHash);
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        console.log('Password comparison result:', isPasswordValid);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('Generating access token...');
        const accessToken = generateAccessToken(user);
        console.log('Generating refresh token...');
        const refreshToken = generateRefreshToken(user);

        console.log('Removing old refresh tokens...');
        // Remove old refresh tokens for user
        await RefreshToken.deleteMany({ userId: user._id });

        console.log('Creating new refresh token document...');
        const refreshTokenDoc = new RefreshToken({
            token: refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await refreshTokenDoc.save();
        console.log('Refresh token saved.');

        console.log('Login successful for user:', user.email);
        res.json({ accessToken, refreshToken });
    } catch (err) {
        console.error('Login error:', err);
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
app.post('/api/auth/refresh', async (req, res) => {
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
app.post('/api/auth/verify', async (req, res) => {
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
app.get('/api/auth/profile', async (req, res) => {
    console.log('Profile request received');
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log('Token:', token ? 'present' : 'missing');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            console.log('JWT verify err:', err);
            if (err) return res.status(401).json({ error: 'Invalid token' });

            console.log('Decoded id:', decoded.id);
            const user = await User.findById(decoded.id);
            console.log('User found:', !!user);
            if (!user) return res.status(401).json({ error: 'User not found' });

            // Return profile in the format expected by frontend
            const profile = {
                uid: user._id.toString(),
                email: user.email,
                username: user.username || '',
                name: user.name || '',
                avatar: user.avatar || 0,
                role: user.role
            };
            console.log('Returning profile:', profile);
            res.json(profile);
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
    * @swagger
    * /logout:
    *   post:
    *     summary: Logout user
    *     tags: [Auth]
    *     responses:
    *       200:
    *         description: Logout successful
    *       500:
    *         description: Internal server error
    */
app.post('/api/auth/logout', async (req, res) => {
    try {
        // Logout is handled client-side by clearing tokens
        res.json({ message: 'Logout successful' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
   * @swagger
   * /token:
   *   get:
   *     summary: Get current JWT token
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Token retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *       401:
   *         description: No token available
   *       500:
   *         description: Internal server error
   */
app.get('/api/auth/token', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token available' });
        }
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
   * @swagger
   * /profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               name:
   *                 type: string
   *               avatar:
   *                 type: number
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
app.put('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const { username, name, avatar, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const updateData = {};
        if (username !== undefined) updateData.username = username;
        if (name !== undefined) updateData.name = name;
        if (avatar !== undefined) updateData.avatar = avatar;

        // Handle password change
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to change password' });
            }
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' });
            }
            updateData.passwordHash = await bcrypt.hash(newPassword, 10);

            // Invalidate refresh tokens for security
            await RefreshToken.deleteMany({ userId });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });

        res.json({
            uid: updatedUser._id.toString(),
            email: updatedUser.email,
            username: updatedUser.username || '',
            name: updatedUser.name || '',
            avatar: updatedUser.avatar || 0,
            role: updatedUser.role
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
    startupLogger('Auth Service', PORT);
});
