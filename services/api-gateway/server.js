const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway OK' });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
