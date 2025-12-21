const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'Notification Service OK' });
});

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
