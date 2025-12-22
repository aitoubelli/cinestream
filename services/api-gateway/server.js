const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());

require('./routes')(app);

app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway OK' });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
