const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const { requestLogger, startupLogger } = require('../../shared/logging');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(requestLogger);

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (['http://localhost:8000', 'http://localhost:3000'].indexOf(origin) !== -1) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(helmet());
app.use(express.json());

require('./routes')(app);

app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway OK' });
});

app.listen(PORT, () => {
    startupLogger('API Gateway', PORT);
});
