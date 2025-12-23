const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    console.log(`API Gateway: ${req.method} ${req.url} from ${req.ip}`);
    next();
});

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
    credentials: true
}));
app.use(helmet());
app.use(express.json());

require('./routes')(app);

app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway OK' });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
