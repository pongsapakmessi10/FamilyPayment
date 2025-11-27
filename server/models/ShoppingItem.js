const mongoose = require('mongoose');

const ShoppingItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    category: { type: String, default: 'Uncategorized' },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ShoppingItem', ShoppingItemSchema);
