const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ShoppingItem = require('../models/ShoppingItem');
const User = require('../models/User');

// Get all shopping items for the user's family
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.familyId) {
            return res.status(400).json({ message: 'User not in a family' });
        }

        const items = await ShoppingItem.find({ familyId: user.familyId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new shopping item
router.post('/', auth, async (req, res) => {
    try {
        const { name, price, category } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user || !user.familyId) {
            return res.status(400).json({ message: 'User not in a family' });
        }

        const newItem = new ShoppingItem({
            name,
            price: price || 0,
            category: category || 'Uncategorized',
            familyId: user.familyId,
            createdBy: req.user.userId
        });

        const savedItem = await newItem.save();
        // Populate createdBy for immediate frontend display
        await savedItem.populate('createdBy', 'name');

        res.json(savedItem);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a shopping item (toggle complete, edit details)
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, price, category, completed } = req.body;

        // Build update object dynamically
        const updateFields = {};
        if (name !== undefined) updateFields.name = name;
        if (price !== undefined) updateFields.price = price;
        if (category !== undefined) updateFields.category = category;
        if (completed !== undefined) updateFields.completed = completed;

        const item = await ShoppingItem.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true }
        ).populate('createdBy', 'name');

        if (!item) return res.status(404).json({ message: 'Item not found' });

        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a shopping item
router.delete('/:id', auth, async (req, res) => {
    try {
        const item = await ShoppingItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        await item.deleteOne();
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
