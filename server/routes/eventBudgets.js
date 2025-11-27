const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const EventBudget = require('../models/EventBudget');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const calculateSpendMap = async (familyId, eventIds) => {
    if (!eventIds.length) return {};

    const spend = await Transaction.aggregate([
        {
            $match: {
                familyId: new mongoose.Types.ObjectId(familyId),
                type: 'event',
                eventId: { $in: eventIds }
            }
        },
        {
            $group: {
                _id: '$eventId',
                spent: { $sum: '$amount' }
            }
        }
    ]);

    return spend.reduce((acc, curr) => {
        acc[curr._id.toString()] = curr.spent;
        return acc;
    }, {});
};

// List all event budgets with spending summary
router.get('/event-budgets', auth, async (req, res) => {
    try {
        const { familyId } = req.user;
        const events = await EventBudget.find({ familyId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');

        const spendMap = await calculateSpendMap(familyId, events.map(e => e._id));

        const data = events.map(event => {
            const spent = spendMap[event._id.toString()] || 0;
            const remaining = Math.max(0, (event.budget || 0) - spent);
            const progress = event.budget ? Math.min(100, (spent / event.budget) * 100) : 0;

            return {
                ...event.toObject(),
                spent,
                remaining,
                progress
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Error fetching event budgets:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new event budget
router.post('/event-budgets', auth, async (req, res) => {
    try {
        const { name, budget, description, startDate, endDate } = req.body;
        const { userId, familyId } = req.user;

        if (!name || budget === undefined) {
            return res.status(400).json({ message: 'Name and budget are required' });
        }

        if (budget < 0) {
            return res.status(400).json({ message: 'Budget must be 0 or more' });
        }

        const event = new EventBudget({
            name,
            description,
            budget,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            familyId,
            createdBy: userId
        });

        await event.save();
        await event.populate('createdBy', 'name email');

        res.status(201).json({
            ...event.toObject(),
            spent: 0,
            remaining: budget,
            progress: 0
        });
    } catch (err) {
        console.error('Error creating event budget:', err);
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Event name already exists for this family' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Get expenses for a specific event
router.get('/event-budgets/:id/expenses', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { familyId } = req.user;

        const event = await EventBudget.findOne({ _id: id, familyId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const expenses = await Transaction.find({
            familyId,
            eventId: id,
            type: 'event'
        })
            .populate('payer', 'name email')
            .sort({ date: -1 });

        res.json(expenses);
    } catch (err) {
        console.error('Error fetching event expenses:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add an expense to an event budget
router.post('/event-budgets/:id/expenses', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, payer, date, category } = req.body;
        const { familyId, userId } = req.user;

        if (!description || amount === undefined) {
            return res.status(400).json({ message: 'Description and amount are required' });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        const event = await EventBudget.findOne({ _id: id, familyId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const expense = new Transaction({
            type: 'event',
            description,
            amount,
            category: category || 'Event',
            date: date ? new Date(date) : new Date(),
            payer: payer || userId,
            familyId,
            eventId: event._id
        });

        await expense.save();

        // Reduce payer balance similar to normal expenses
        if (expense.payer) {
            try {
                await User.findByIdAndUpdate(
                    expense.payer,
                    { $inc: { balance: -expense.amount } }
                );
            } catch (balanceErr) {
                console.error('Error updating payer balance for event expense:', balanceErr);
            }
        }

        // Recalculate totals for the event
        const spentAgg = await Transaction.aggregate([
            {
                $match: {
                    familyId: new mongoose.Types.ObjectId(familyId),
                    type: 'event',
                    eventId: event._id
                }
            },
            {
                $group: {
                    _id: null,
                    spent: { $sum: '$amount' }
                }
            }
        ]);

        const spent = spentAgg[0]?.spent || 0;
        const remaining = Math.max(0, (event.budget || 0) - spent);
        const progress = event.budget ? Math.min(100, (spent / event.budget) * 100) : 0;

        res.status(201).json({
            expense,
            totals: {
                spent,
                remaining,
                progress
            }
        });
    } catch (err) {
        console.error('Error adding event expense:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
