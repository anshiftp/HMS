const mongoose = require('mongoose');

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connection established successfully');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection disconnected');
});

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1)
        return;

    let mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;

    // Clean up any common syntax errors in the URL (like spaces or trailing port definitions)
    if (mongoUrl) {
        mongoUrl = mongoUrl.replace(/\s+/g, ''); // Remove spaces
        if (mongoUrl.includes('PORT=')) {
            mongoUrl = mongoUrl.split('PORT=')[0]; // Extract just the URL part
        }
    }

    if (!mongoUrl) {
        console.log('ℹ️ MONGO_URL not specified. Starting in-memory MongoDB...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongoServer = await MongoMemoryServer.create();
            mongoUrl = mongoServer.getUri();
            console.log(`✅ In-memory MongoDB started at: ${mongoUrl}`);
        } catch (err) {
            console.error('❌ Failed to start in-memory MongoDB:', err.message);
            throw err;
        }
    }

    try {
        await mongoose.connect(mongoUrl);
    } catch (err) {
        console.warn(`⚠️ Failed to connect to database at ${mongoUrl}: ${err.message}`);
        console.log('ℹ️ Attempting to fallback to in-memory MongoDB...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongoServer = await MongoMemoryServer.create();
            const fallbackUrl = mongoServer.getUri();
            console.log(`✅ Fallback in-memory MongoDB started at: ${fallbackUrl}`);
            await mongoose.connect(fallbackUrl);
        } catch (fallbackErr) {
            console.error('❌ Failed to start fallback in-memory MongoDB:', fallbackErr.message);
            throw err; // throw original error
        }
    }
};

module.exports = connectDB;