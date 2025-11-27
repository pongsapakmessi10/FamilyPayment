const mongoose = require('mongoose');

const billReminderSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        min: 0
    },
    category: {
        type: String
    },
    dueDate: {
        type: Date,
        required: true,
        index: true
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    frequency: {
        type: String,
        enum: ['monthly', 'yearly', 'weekly', 'none'],
        default: 'none'
    },
    recurrenceDate: {
        type: Number, // Day of month (1-31) for monthly, or null
        min: 1,
        max: 31
    },
    linkedDebtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    status: {
        type: String,
        enum: ['active', 'paid', 'overdue'],
        default: 'active',
        index: true
    },
    paidDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reminderSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
billReminderSchema.index({ familyId: 1, dueDate: 1 });
billReminderSchema.index({ familyId: 1, status: 1 });
billReminderSchema.index({ linkedDebtId: 1 });

module.exports = mongoose.model('BillReminder', billReminderSchema);
