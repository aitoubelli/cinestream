const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'Content Service OK' });
});

app.listen(PORT, () => {
    console.log(`Content Service running on port ${PORT}`);
});
