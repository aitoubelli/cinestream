const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'Interaction Service OK' });
});

app.listen(PORT, () => {
    console.log(`Interaction Service running on port ${PORT}`);
});
