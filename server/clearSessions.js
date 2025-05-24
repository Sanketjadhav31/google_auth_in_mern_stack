require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function clearSessions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear sessions collection
        await mongoose.connection.db.collection('sessions').deleteMany({});
        console.log('Sessions cleared successfully');

        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearSessions();

mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME', { useNewUrlParser: true, useUnifiedTopology: true });

User.findOneAndUpdate(
  { email: 'demo@gmail.com' },
  { role: 'admin' },
  { new: true },
  (err, user) => {
    if (err) return console.error(err);
    if (!user) return console.log('User not found');
    console.log('User updated:', user);
    mongoose.disconnect();
  }
); 