const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId; // Password required only if not using Google auth
        },
        minlength: 6
    },
    displayName: {
        type: String,
        trim: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    tokens: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 7 * 24 * 60 * 60 // 7 days
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    bio: {
        type: String,
        trim: true,
        default: ''
    },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Generate JWT token
userSchema.methods.generateAuthToken = async function() {
    try {
        const user = this;
        const token = jwt.sign(
            { _id: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Remove expired tokens
        user.tokens = user.tokens.filter(t => {
            const tokenAge = Date.now() - new Date(t.createdAt).getTime();
            return tokenAge < 7 * 24 * 60 * 60 * 1000; // 7 days
        });
        
        // Add new token
        user.tokens = user.tokens.concat({ token });
        await user.save();
        return token;
    } catch (error) {
        console.error('Error generating auth token:', error);
        throw new Error('Failed to generate authentication token');
    }
};

// Find user by credentials
userSchema.statics.findByCredentials = async (email, password) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid login credentials');
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid login credentials');
        }
        
        return user;
    } catch (error) {
        console.error('Error finding user by credentials:', error);
        throw error;
    }
};

// Add a pre-save middleware to set display name if not provided
userSchema.pre('save', function(next) {
    if (!this.displayName) {
        this.displayName = this.email.split('@')[0];
    }
    if (!this.firstName) {
        this.firstName = this.displayName;
    }
    if (!this.lastName) {
        this.lastName = this.displayName;
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 