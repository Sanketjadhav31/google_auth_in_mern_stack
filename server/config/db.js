const mongoose = require('mongoose');
const path = require('path');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables. Please check your .env file in: ' + path.resolve(__dirname, '../.env'));
        }

        console.log('Attempting to connect to MongoDB...');
        console.log('MongoDB URI:', process.env.MONGO_URI);

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log('Database Name:', conn.connection.name);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        console.error('Please ensure:');
        console.error('1. MongoDB is installed and running');
        console.error('2. The MongoDB URI in your .env file is correct');
        console.error('3. You have network connectivity to the MongoDB server');
        process.exit(1);
    }
};

module.exports = connectDB; 