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
    await mongoose.connect(process.env.MONGO_URL);
};

module.exports = connectDB;