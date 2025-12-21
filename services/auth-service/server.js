const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'Auth Service OK' });
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
