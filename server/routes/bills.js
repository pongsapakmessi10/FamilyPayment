const express = require('express');
const router = express.Router();
const BillReminder = require('../models/BillReminder');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper function to calculate next due date for recurring bills
const calculateNextDueDate = (bill) => {
    const current = new Date(bill.dueDate);

    switch (bill.frequency) {
        case 'monthly':
            // Next month, same day
            const nextMonth = new Date(current);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            if (bill.recurrenceDate) {
                nextMonth.setDate(bill.recurrenceDate);
            }
            return nextMonth;

        case 'yearly':
            // Next year, same date
            const nextYear = new Date(current);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            return nextYear;

        case 'weekly':
            // 7 days from now
            const nextWeek = new Date(current);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;

        default:
            return null;
    }
};

// Create new bill reminder
router.post('/bills', auth, async (req, res) => {
    try {
        const { title, amount, category, dueDate, isRecurring, frequency, recurrenceDate, linkedDebtId } = req.body;
        const { userId, familyId } = req.user;

        // Validation
        if (!title || !dueDate) {
            return res.status(400).json({ message: 'Title and due date are required' });
        }

        if (isRecurring && !frequency) {
            return res.status(400).json({ message: 'Frequency is required for recurring bills' });
        }

        const bill = new BillReminder({
            familyId,
            title,
            amount,
            category,
            dueDate: new Date(dueDate),
            isRecurring: isRecurring || false,
            frequency: frequency || 'none',
            recurrenceDate,
            linkedDebtId,
            status: 'active',
            createdBy: userId
        });

        await bill.save();
        await bill.populate('createdBy linkedDebtId', 'name email');

        // Email notifications disabled

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('bill-created', bill);

        res.status(201).json(bill);
    } catch (err) {
        console.error('Error creating bill:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all bills (with optional filters)
router.get('/bills', auth, async (req, res) => {
    try {
        const { familyId } = req.user;
        const { month, year, status } = req.query;

        let query = { familyId };

        // Filter by month/year if provided
        if (month && year) {
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
            query.dueDate = { $gte: startDate, $lte: endDate };
        }

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        const bills = await BillReminder.find(query)
            .populate('createdBy linkedDebtId', 'name email description amount')
            .sort({ dueDate: 1 });

        res.json(bills);
    } catch (err) {
        console.error('Error fetching bills:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get upcoming bills (next 7 days)
router.get('/bills/upcoming', auth, async (req, res) => {
    try {
        const { familyId } = req.user;
        const today = new Date();
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);

        const bills = await BillReminder.find({
            familyId,
            dueDate: { $gte: today, $lte: next7Days },
            status: { $in: ['active', 'overdue'] }
        })
            .populate('createdBy linkedDebtId', 'name email description amount')
            .sort({ dueDate: 1 });

        res.json(bills);
    } catch (err) {
        console.error('Error fetching upcoming bills:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark bill as paid (CRUCIAL: Creates transaction + handles recurring)
router.put('/bills/:id/pay', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, familyId } = req.user;

        const bill = await BillReminder.findOne({ _id: id, familyId });

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        if (bill.status === 'paid') {
            return res.status(400).json({ message: 'Bill is already marked as paid' });
        }

        // Only the creator of the bill can pay it
        if (bill.createdBy.toString() !== userId) {
            return res.status(403).json({ message: 'Only the bill creator can pay this bill' });
        }

        // 1. Create expense transaction
        const transaction = new Transaction({
            type: 'expense',
            familyId,
            payer: userId,
            amount: bill.amount || 0,
            description: bill.title,
            category: bill.category || 'Bills',
            date: new Date()
        });

        await transaction.save();

        // 1.5. Deduct amount from payer's balance
        if (bill.amount && bill.amount > 0) {
            await User.findByIdAndUpdate(
                userId,
                { $inc: { balance: -bill.amount } }
            );
        }

        // 2. Update bill status to paid
        bill.status = 'paid';
        bill.paidDate = new Date();
        await bill.save();

        // 3. If recurring, generate next bill
        let nextBill = null;
        if (bill.isRecurring && bill.frequency !== 'none') {
            const nextDueDate = calculateNextDueDate(bill);

            if (nextDueDate) {
                nextBill = new BillReminder({
                    familyId: bill.familyId,
                    title: bill.title,
                    amount: bill.amount,
                    category: bill.category,
                    dueDate: nextDueDate,
                    isRecurring: bill.isRecurring,
                    frequency: bill.frequency,
                    recurrenceDate: bill.recurrenceDate,
                    linkedDebtId: bill.linkedDebtId,
                    status: 'active',
                    createdBy: bill.createdBy
                });

                await nextBill.save();
            }
        }

        // 4. If linked to debt, update debt payment
        if (bill.linkedDebtId) {
            const debt = await Transaction.findById(bill.linkedDebtId);
            if (debt && debt.type === 'debt') {
                debt.paidAmount = (debt.paidAmount || 0) + (bill.amount || 0);

                if (debt.paidAmount >= debt.amount) {
                    debt.paymentStatus = 'paid';
                    debt.paidAmount = debt.amount;
                }

                await debt.save();
            }
        }

        await bill.populate('createdBy linkedDebtId', 'name email');

        // 5. Emit Socket.io events
        const io = req.app.get('io');
        io.to(familyId).emit('bill-paid', {
            bill,
            transaction,
            nextBill
        });

        res.json({
            bill,
            transaction,
            nextBill
        });
    } catch (err) {
        console.error('Error paying bill:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update bill
router.put('/bills/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { familyId } = req.user;
        const updates = req.body;

        const bill = await BillReminder.findOneAndUpdate(
            { _id: id, familyId },
            updates,
            { new: true, runValidators: true }
        ).populate('createdBy linkedDebtId', 'name email');

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('bill-updated', bill);

        res.json(bill);
    } catch (err) {
        console.error('Error updating bill:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete bill
router.delete('/bills/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { familyId } = req.user;

        const bill = await BillReminder.findOne({ _id: id, familyId });

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Prevent deleting debt-linked bills
        if (bill.linkedDebtId) {
            return res.status(400).json({
                message: 'Cannot delete debt-linked bill reminder'
            });
        }

        await bill.deleteOne();

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('bill-deleted', { billId: id });

        res.json({ message: 'Bill deleted successfully' });
    } catch (err) {
        console.error('Error deleting bill:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
