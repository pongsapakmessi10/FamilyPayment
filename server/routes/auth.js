const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Family = require('../models/Family');
// PendingUser / emailService removed (no OTP flow)

// Generate Invite Code
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Register Owner (Create Pending User)
router.post('/register-owner', async (req, res) => {
    try {
        const { username, email, password, familyName } = req.body;
        const trimmedEmail = email.trim();

        // Check if user exists
        let existingUser = await User.findOne({ email: trimmedEmail });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create Family
        const inviteCode = generateInviteCode();
        const family = new Family({
            name: familyName,
            inviteCode,
            ownerId: new mongoose.Types.ObjectId(), // temp, will set after user creation
        });
        await family.save();

        // Create User
        const user = new User({
            name: username,
            email: trimmedEmail,
            password: hashedPassword,
            role: 'moderator',
            familyId: family._id,
            emailVerified: true
        });
        await user.save();

        // Update family owner/member list
        family.ownerId = user._id;
        family.members.push(user._id);
        await family.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role, familyId: user.familyId },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.json({ token, user: { id: user._id, name: user.name, role: user.role, familyId: user.familyId } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Register Member (Create Pending User)
router.post('/register-member', async (req, res) => {
    try {
        const { username, email, password, inviteCode } = req.body;
        const trimmedEmail = email.trim();

        // Check if user exists
        let existingUser = await User.findOne({ email: trimmedEmail });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Verify Invite Code
        const family = await Family.findOne({ inviteCode });
        if (!family) return res.status(400).json({ message: 'Invalid invite code' });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const user = new User({
            name: username,
            email: trimmedEmail,
            password: hashedPassword,
            role: 'member',
            familyId: family._id,
            emailVerified: true
        });
        await user.save();

        family.members.push(user._id);
        await family.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role, familyId: user.familyId },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.json({ token, user: { id: user._id, name: user.name, role: user.role, familyId: user.familyId } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const trimmedEmail = email.trim();

        // Check User (by Email OR Username)
        console.log(`[Login Attempt] Input: "${trimmedEmail}"`);
        const user = await User.findOne({
            $or: [{ email: trimmedEmail }, { name: trimmedEmail }]
        });

        if (!user) {
            console.log('[Login Failed] User not found');
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log(`[Login Info] Found User: ${user.name} (${user.email}), ID: ${user._id}`);
        console.log(`[Login Info] Stored Hash: ${user.password.substring(0, 10)}...`);

        // Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[Login Info] Password Match: ${isMatch}`);

        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Create Token
        const token = jwt.sign(
            { userId: user._id, role: user.role, familyId: user.familyId },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.json({ token, user: { id: user._id, name: user.name, role: user.role, familyId: user.familyId } });

    } catch (err) {
        console.error('[Login Error]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// OTP routes removed (registration now completes without email verification)

module.exports = router;
