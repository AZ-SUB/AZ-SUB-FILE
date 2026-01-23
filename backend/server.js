const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Imports for routes
const apRoutes = require('./routes/apRoutes');
const alRoutes = require('./routes/alRoutes');
const mpRoutes = require('./routes/mpRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Routes
app.use('/api', apRoutes);
app.use('/api', alRoutes);
app.use('/api', mpRoutes);
app.use('/api', adminRoutes);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
