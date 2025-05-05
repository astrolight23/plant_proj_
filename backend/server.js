require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
// app.use(cors({ origin: 'http://localhost:3000' })); // Allow frontend origin
app.use(cors({ origin: '*' })); // Allow all origins (development only)
app.use(helmet());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit to 100 requests per IP
});
app.use(limiter);

// Connect to database
connectDB().catch(err => console.error('Database connection failed:', err));

// Routes
app.use('/api', apiRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});