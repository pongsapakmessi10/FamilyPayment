const mongoose = require('mongoose');

const eventBudgetSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    budget: {
        type: Number,
        required: true,
        min: 0
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

eventBudgetSchema.index({ familyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('EventBudget', eventBudgetSchema);
