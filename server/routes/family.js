const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Family = require('../models/Family');
const User = require('../models/User');

// Leave family (all users can leave) - Moved to top to avoid routing issues
router.post('/leave', auth, async (req, res) => {
    try {
        // FIX: Use req.user.userId instead of req.user.id
        const userId = req.user.userId;
        console.log('Leave family request for user:', userId);

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const familyId = user.familyId;
        if (!familyId) return res.status(400).json({ message: 'User is not part of any family' });

        // Remove user from family members array
        await Family.findByIdAndUpdate(familyId, { $pull: { members: userId } });

        // Delete all transactions where this user is involved (payer, borrower, or lender)
        const Transaction = require('../models/Transaction');
        await Transaction.deleteMany({
            familyId,
            $or: [
                { payer: userId },
                { borrower: userId },
                { lender: userId }
            ]
        });

        // Reset user's familyId and balance
        user.familyId = null;
        user.balance = 0;
        await user.save();

        console.log('User left family successfully:', userId);
        res.json({ message: 'Left family successfully' });
    } catch (err) {
        console.error('Leave family error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Join family (existing user)
router.post('/join', auth, async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.user.userId;

        // Find Family
        const family = await Family.findOne({ inviteCode });
        if (!family) return res.status(400).json({ message: 'Invalid invite code' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.familyId) {
            return res.status(400).json({ message: 'User is already in a family' });
        }

        // Update User
        user.familyId = family._id;
        user.role = 'member'; // Default to member when joining
        await user.save();

        // Add to Family members
        family.members.push(userId);
        await family.save();

        res.json({ message: 'Joined family successfully', family });
    } catch (err) {
        console.error('Join family error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get Family Info (All members can access)
router.get('/info', auth, async (req, res) => {
    try {
        const family = await Family.findById(req.user.familyId).populate('members', 'name email role');

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        // Return basic info for members
        const response = {
            name: family.name,
            memberCount: family.members.length,
            members: family.members,
            inviteCode: family.inviteCode
        };

        res.json(response);
    } catch (err) {
        console.error('Family info error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get Family Settings (Moderator only)
router.get('/settings', auth, async (req, res) => {
    try {
        if (req.user.role !== 'moderator') return res.status(403).json({ message: 'Access denied' });

        const family = await Family.findById(req.user.familyId).populate('members', 'name email role avatar');
        if (!family) return res.status(404).json({ message: 'Family not found' });

        res.json(family);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Regenerate Invite Code
router.post('/regenerate-code', auth, async (req, res) => {
    try {
        if (req.user.role !== 'moderator') return res.status(403).json({ message: 'Access denied' });

        const family = await Family.findById(req.user.familyId);
        if (!family) return res.status(404).json({ message: 'Family not found' });

        family.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await family.save();

        res.json({ inviteCode: family.inviteCode });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a user (moderator only)
router.delete('/member/:userId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'moderator') {
            return res.status(403).json({ message: 'Only moderators can delete members' });
        }

        const { userId } = req.params;

        // Cannot delete yourself
        if (userId === req.user.userId) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify user is in the same family
        if (userToDelete.familyId.toString() !== req.user.familyId) {
            return res.status(403).json({ message: 'Cannot delete users from other families' });
        }

        // Emit socket event to notify the user they're being removed
        const io = req.app.get('io');
        io.to(req.user.familyId).emit('user-removed', { userId });

        // Remove user from family members array
        await Family.findByIdAndUpdate(req.user.familyId, {
            $pull: { members: userId }
        });

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user role (moderator only)
router.put('/member/:userId/role', auth, async (req, res) => {
    try {
        if (req.user.role !== 'moderator') {
            return res.status(403).json({ message: 'Only moderators can change user roles' });
        }

        const { userId } = req.params;
        const { role } = req.body;

        // Validate role
        if (!['member', 'moderator'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Cannot change your own role
        if (userId === req.user.userId) {
            return res.status(400).json({ message: 'Cannot change your own role' });
        }

        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify user is in the same family
        if (userToUpdate.familyId.toString() !== req.user.familyId) {
            return res.status(403).json({ message: 'Cannot modify users from other families' });
        }

        // Update role
        userToUpdate.role = role;
        await userToUpdate.save();

        res.json({ message: 'Role updated successfully', user: userToUpdate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// List all families (public)
router.get('/list', async (req, res) => {
    try {
        const families = await Family.find({}, 'name');
        res.json(families);
    } catch (err) {
        console.error('List families error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
