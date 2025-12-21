const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'User Service OK' });
});

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
