const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const categoryRoutes = require('./routes/categories');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/categories', categoryRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));
