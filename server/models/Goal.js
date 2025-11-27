const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
});

module.exports = mongoose.model('Goal', GoalSchema);
