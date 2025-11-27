const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['moderator', 'member'],
        required: true
    },
    familyData: {
        type: Object, // Stores { familyName } for owner or { familyId } for member
        required: true
    },
    verificationOTP: {
        type: String,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Auto-delete after 1 hour
    }
});

module.exports = mongoose.model('PendingUser', PendingUserSchema);
