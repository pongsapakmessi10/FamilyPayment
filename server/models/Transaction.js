const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['expense', 'debt', 'borrow_request', 'event'], required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String },
    date: { type: Date, default: Date.now },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    slipImage: { type: String },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventBudget' },

    // Borrow request fields
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid', 'verified'], default: 'approved' },
    rejectionReason: { type: String },
    requestedAt: { type: Date },
    respondedAt: { type: Date },

    // Debt payment tracking
    paidAmount: { type: Number, default: 0 }, // Total amount paid so far
    pendingPayment: { type: Number, default: 0 }, // Payment awaiting approval
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
