const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'completed'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    bookmarked: {
        type: Boolean,
        default: false
    },
    reminders: [{
        time: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['email', 'notification'],
            default: 'notification'
        },
        sent: {
            type: Boolean,
            default: false
        }
    }],
    attachments: [{
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    recurrence: {
        type: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly'],
            default: 'none'
        },
        interval: { type: Number, default: 1 }, // every X days/weeks/months
        endDate: { type: Date }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Task', taskSchema); 