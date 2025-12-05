const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');

// Get all users in the family
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find({ familyId: req.user.familyId }).select('name email role');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user by ID
router.get('/users/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { familyId } = req.user;

        const user = await User.findOne({ _id: userId, familyId }).select('name email role');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get member balances
router.get('/balances', auth, async (req, res) => {
    try {
        const { familyId, userId } = req.user;

        // Get all users in the family with their balances
        const users = await User.find({ familyId }).select('name email balance');

        // Calculate total balance
        const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);

        // Format balances data with isCurrentUser flag
        const balances = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            balance: user.balance || 0,
            isCurrentUser: user._id.toString() === userId
        }));

        res.json({
            totalBalance,
            balances
        });
    } catch (err) {
        console.error('Error fetching balances:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user's own balance
router.put('/balance', auth, async (req, res) => {
    try {
        const { userId } = req.user;
        const { balance } = req.body;

        // Validate balance
        if (balance === undefined || balance < 0) {
            return res.status(400).json({ message: 'Invalid balance value' });
        }

        // Update user's balance
        const user = await User.findByIdAndUpdate(
            userId,
            { balance },
            { new: true }
        ).select('name balance');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Balance updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                balance: user.balance
            }
        });
    } catch (err) {
        console.error('Error updating balance:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

const BorrowRequest = require('../models/BorrowRequest');

// Create new borrow request
router.post('/borrow-request', auth, async (req, res) => {
    try {
        const { lenderId, description, amount } = req.body;
        const { userId, familyId } = req.user;

        // Validation
        if (!lenderId || !description || !amount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        if (lenderId === userId) {
            return res.status(400).json({ message: 'Cannot borrow from yourself' });
        }

        // Create borrow request
        const borrowRequest = new BorrowRequest({
            borrower: userId,
            lender: lenderId,
            familyId,
            amount,
            description,
            status: 'pending'
        });

        await borrowRequest.save();
        await borrowRequest.populate(['borrower', 'lender'], 'name email');

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('new-borrow-request', borrowRequest);

        res.status(201).json(borrowRequest);
    } catch (err) {
        console.error('Error creating borrow request:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get borrow requests received (as lender)
router.get('/borrow-requests/received', auth, async (req, res) => {
    try {
        const { userId, familyId } = req.user;

        const requests = await BorrowRequest.find({
            familyId,
            lender: userId
        })
            .populate('borrower', 'name email')
            .populate('lender', 'name email')
            .sort({ requestedAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error('Error fetching received requests:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get borrow requests sent (as borrower)
router.get('/borrow-requests/sent', auth, async (req, res) => {
    try {
        const { userId, familyId } = req.user;

        const requests = await BorrowRequest.find({
            familyId,
            borrower: userId
        })
            .populate('borrower', 'name email')
            .populate('lender', 'name email')
            .sort({ requestedAt: -1 });

        // Map payer field for frontend compatibility
        const mappedRequests = requests.map(req => ({
            ...req.toObject(),
            payer: req.lender
        }));

        res.json(mappedRequests);
    } catch (err) {
        console.error('Error fetching sent requests:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve borrow request
router.put('/borrow-request/:id/approve', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, familyId } = req.user;

        const borrowRequest = await BorrowRequest.findOne({
            _id: id,
            familyId,
            lender: userId,
            status: 'pending'
        });

        if (!borrowRequest) {
            return res.status(404).json({ message: 'Borrow request not found or already processed' });
        }

        // Create debt transaction
        const debtTransaction = new Transaction({
            type: 'debt',
            familyId,
            payer: borrowRequest.lender,
            borrower: borrowRequest.borrower,
            amount: borrowRequest.amount,
            description: borrowRequest.description,
            date: new Date(),
            paidAmount: 0,
            pendingPayment: 0,
            paymentStatus: 'unpaid'
        });

        await debtTransaction.save();

        // Move cash: lender down, borrower up
        try {
            await User.findByIdAndUpdate(
                borrowRequest.lender,
                { $inc: { balance: -borrowRequest.amount } }
            );
            await User.findByIdAndUpdate(
                borrowRequest.borrower,
                { $inc: { balance: borrowRequest.amount } }
            );
        } catch (balanceErr) {
            console.error('Error updating balances on approval:', balanceErr);
        }

        // Update borrow request
        borrowRequest.status = 'approved';
        borrowRequest.respondedAt = new Date();
        borrowRequest.debtId = debtTransaction._id;
        await borrowRequest.save();

        await borrowRequest.populate(['borrower', 'lender'], 'name email');

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('borrow-request-approved', {
            borrowRequest,
            debt: debtTransaction
        });

        res.json({ borrowRequest, debt: debtTransaction });
    } catch (err) {
        console.error('Error approving borrow request:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reject borrow request
router.put('/borrow-request/:id/reject', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const { userId, familyId } = req.user;

        const borrowRequest = await BorrowRequest.findOne({
            _id: id,
            familyId,
            lender: userId,
            status: 'pending'
        });

        if (!borrowRequest) {
            return res.status(404).json({ message: 'Borrow request not found or already processed' });
        }

        borrowRequest.status = 'rejected';
        borrowRequest.respondedAt = new Date();
        borrowRequest.rejectionReason = reason || 'No reason provided';
        await borrowRequest.save();

        await borrowRequest.populate(['borrower', 'lender'], 'name email');

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('borrow-request-rejected', borrowRequest);

        res.json(borrowRequest);
    } catch (err) {
        console.error('Error rejecting borrow request:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit payment for debt
router.post('/debt/:id/submit-payment', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const { userId, familyId } = req.user;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        const debt = await Transaction.findOne({
            _id: id,
            familyId,
            type: 'debt',
            borrower: userId
        });

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        const remainingDebt = debt.amount - (debt.paidAmount || 0);

        if (amount > remainingDebt) {
            return res.status(400).json({
                message: `Payment amount (฿${amount}) exceeds remaining debt of ฿${remainingDebt}`
            });
        }

        if (debt.pendingPayment > 0) {
            return res.status(400).json({ message: 'You already have a pending payment awaiting approval' });
        }

        debt.pendingPayment = amount;
        await debt.save();

        await debt.populate(['payer', 'borrower'], 'name email');

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('payment-submitted', debt);

        res.json(debt);
    } catch (err) {
        console.error('Error submitting payment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve payment for debt
router.put('/debt/:id/approve-payment', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, familyId } = req.user;

        const debt = await Transaction.findOne({
            _id: id,
            familyId,
            type: 'debt',
            payer: userId
        });

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        if (!debt.pendingPayment || debt.pendingPayment === 0) {
            return res.status(400).json({ message: 'No pending payment to approve' });
        }

        // Update paid amount
        debt.paidAmount = (debt.paidAmount || 0) + debt.pendingPayment;

        // Check if fully paid
        if (debt.paidAmount >= debt.amount) {
            debt.paymentStatus = 'paid';
            debt.paidAmount = debt.amount; // Ensure exact amount
        }

        // Move cash: borrower down, lender up
        try {
            await User.findByIdAndUpdate(
                debt.borrower,
                { $inc: { balance: -debt.pendingPayment } }
            );
            await User.findByIdAndUpdate(
                debt.payer,
                { $inc: { balance: debt.pendingPayment } }
            );
        } catch (balanceErr) {
            console.error('Error updating balances on payment approval:', balanceErr);
        }

        debt.pendingPayment = 0;
        await debt.save();

        await debt.populate(['payer', 'borrower'], 'name email');

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('payment-approved', debt);

        res.json(debt);
    } catch (err) {
        console.error('Error approving payment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reject payment for debt
router.put('/debt/:id/reject-payment', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const { userId, familyId } = req.user;

        const debt = await Transaction.findOne({
            _id: id,
            familyId,
            type: 'debt',
            payer: userId
        });

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        if (!debt.pendingPayment || debt.pendingPayment === 0) {
            return res.status(400).json({ message: 'No pending payment to reject' });
        }

        debt.pendingPayment = 0;
        await debt.save();

        await debt.populate(['payer', 'borrower'], 'name email');

        // Emit Socket.io event
        const io = req.app.get('io');
        io.to(familyId).emit('payment-rejected', {
            debt,
            reason: reason || 'Payment rejected by lender'
        });

        res.json(debt);
    } catch (err) {
        console.error('Error rejecting payment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get dashboard data
router.get('/dashboard', auth, async (req, res) => {
    try {
        const expenses = await Transaction.aggregate([
            { $match: { type: 'expense', familyId: new mongoose.Types.ObjectId(req.user.familyId) } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]);

        const totalBalance = await Transaction.aggregate([
            { $match: { type: 'expense', familyId: new mongoose.Types.ObjectId(req.user.familyId) } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Aggregate savings goals
        const goals = await Goal.find({ familyId: req.user.familyId });
        const savingsSummary = goals.reduce(
            (acc, g) => {
                acc.current += g.currentAmount || 0;
                acc.target += g.targetAmount || 0;
                return acc;
            },
            { current: 0, target: 0 }
        );

        res.json({
            expenses,
            totalBalance: totalBalance[0]?.total || 0,
            savingsSummary
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all transactions
router.get('/transactions', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ familyId: req.user.familyId })
            .populate('payer')
            .populate('borrower')
            .sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a transaction
router.post('/transactions', auth, async (req, res) => {
    try {
        const transaction = new Transaction({
            ...req.body,
            familyId: req.user.familyId
        });
        const newTransaction = await transaction.save();

        // If this is an expense, decrement the payer's balance
        if (newTransaction.type === 'expense' && newTransaction.payer) {
            try {
                const payerUser = await User.findById(newTransaction.payer);
                if (payerUser) {
                    payerUser.balance = (payerUser.balance || 0) - newTransaction.amount;
                    await payerUser.save();
                }
            } catch (balanceErr) {
                console.error('Error updating payer balance:', balanceErr);
            }
        }

        // Populate payer and borrower info
        await newTransaction.populate(['payer', 'borrower']);

        // Emit socket event to family room
        const io = req.app.get('io');
        io.to(req.user.familyId).emit('new-transaction', newTransaction);

        res.status(201).json(newTransaction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get goals
router.get('/goals', auth, async (req, res) => {
    try {
        const goals = await Goal.find({ familyId: req.user.familyId });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update goal (add funds)
router.post('/goals/:id/add', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const goal = await Goal.findOne({ _id: req.params.id, familyId: req.user.familyId });
        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        goal.currentAmount += Number(amount);
        await goal.save();

        // Emit socket event
        const io = req.app.get('io');
        io.to(req.user.familyId).emit('update-goal', goal);

        res.json(goal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Create a goal
router.post('/goals', auth, async (req, res) => {
    try {
        const { title, targetAmount } = req.body;

        if (!title || targetAmount === undefined) {
            return res.status(400).json({ message: 'Title and target amount are required' });
        }

        const goal = new Goal({
            title,
            targetAmount: Number(targetAmount),
            currentAmount: Number(req.body.currentAmount) || 0,
            familyId: req.user.familyId
        });
        const newGoal = await goal.save();
        res.status(201).json(newGoal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Clear debt
router.post('/debts/:id/clear', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, familyId: req.user.familyId });
        if (!transaction || transaction.type !== 'debt') {
            return res.status(404).json({ message: 'Debt not found' });
        }
        transaction.status = 'paid';
        await transaction.save();

        const io = req.app.get('io');
        io.to(req.user.familyId).emit('update-debt', transaction);

        res.json(transaction);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get monthly aggregated data (12 months)
router.get('/dashboard/monthly', auth, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Get data for the last 12 months
        const monthlyData = await Transaction.aggregate([
            {
                $match: {
                    type: 'expense',
                    familyId: new mongoose.Types.ObjectId(req.user.familyId),
                    date: {
                        $gte: new Date(currentYear, currentMonth - 11, 1),
                        $lte: new Date(currentYear, currentMonth + 1, 0)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Format the data with month names
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedData = [];

        // Create array for all 12 months
        for (let i = 11; i >= 0; i--) {
            const targetDate = new Date(currentYear, currentMonth - i, 1);
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth() + 1;

            const monthData = monthlyData.find(
                m => m._id.year === targetYear && m._id.month === targetMonth
            );

            formattedData.push({
                month: monthNames[targetDate.getMonth()],
                year: targetYear,
                monthNum: targetMonth,
                total: monthData ? monthData.total : 0
            });
        }

        res.json(formattedData);
    } catch (err) {
        console.error('Monthly aggregation error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get transactions by period (day/month/quarter/year)
router.get('/transactions/by-period', auth, async (req, res) => {
    try {
        const { type, year, month, quarter, date } = req.query;
        let startDate, endDate;

        switch (type) {
            case 'day':
                const targetDate = new Date(date);
                startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
                break;
            case 'month':
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
                break;
            case 'quarter':
                const quarterMonth = (quarter - 1) * 3;
                startDate = new Date(year, quarterMonth, 1);
                endDate = new Date(year, quarterMonth + 3, 0);
                break;
            case 'year':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31);
                break;
            default:
                return res.status(400).json({ message: 'Invalid period type' });
        }

        const transactions = await Transaction.find({
            familyId: req.user.familyId,
            date: { $gte: startDate, $lte: endDate }
        })
            .populate('payer')
            .populate('borrower')
            .sort({ date: -1 });

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
