const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // No deprecated options needed in Mongoose v6+
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
            family: 4 // Use IPv4
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1); // Exit on failure (can be refined later)
    }
};

module.exports = connectDB;