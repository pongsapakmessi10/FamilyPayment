const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Family = require('../models/Family');
const PendingUser = require('../models/PendingUser');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// Generate Invite Code
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Register Owner (Create Pending User)
router.post('/register-owner', async (req, res) => {
    try {
        const { username, email, password, familyName } = req.body;
        const trimmedEmail = email.trim();

        // Check if user exists in User or PendingUser
        let user = await User.findOne({ email: trimmedEmail });
        if (user) return res.status(400).json({ message: 'User already exists' });

        let pendingUser = await PendingUser.findOne({ email: trimmedEmail });
        if (pendingUser) {
            // If pending user exists, we could update it or return error. 
            // For simplicity, let's delete old pending and create new one, or just return error.
            // Let's return error to avoid confusion, or maybe they want to resend OTP?
            // Better to delete old pending and start over if they are registering again.
            await PendingUser.deleteOne({ email: trimmedEmail });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create Pending User
        pendingUser = new PendingUser({
            name: username,
            email: trimmedEmail,
            password: hashedPassword,
            role: 'moderator',
            familyData: { familyName },
            verificationOTP: otp,
            otpExpiry
        });
        await pendingUser.save();

        // Send OTP email
        await sendOTPEmail(pendingUser.email, pendingUser.name, otp);

        res.json({
            message: 'OTP ถูกส่งไปยังอีเมลของคุณแล้ว',
            email: pendingUser.email
        });

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
        let user = await User.findOne({ email: trimmedEmail });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Check pending user
        let pendingUser = await PendingUser.findOne({ email: trimmedEmail });
        if (pendingUser) {
            await PendingUser.deleteOne({ email: trimmedEmail });
        }

        // Verify Invite Code
        const family = await Family.findOne({ inviteCode });
        if (!family) return res.status(400).json({ message: 'Invalid invite code' });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create Pending User
        pendingUser = new PendingUser({
            name: username,
            email: trimmedEmail,
            password: hashedPassword,
            role: 'member',
            familyData: { familyId: family._id },
            verificationOTP: otp,
            otpExpiry
        });
        await pendingUser.save();

        // Send OTP email
        await sendOTPEmail(pendingUser.email, pendingUser.name, otp);

        res.json({
            message: 'OTP ถูกส่งไปยังอีเมลของคุณแล้ว',
            email: pendingUser.email
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const trimmedEmail = email.trim();

        // Check User
        const user = await User.findOne({ email: trimmedEmail });
        if (!user) {
            // Check if they are in PendingUser (unverified)
            const pendingUser = await PendingUser.findOne({ email: trimmedEmail });
            if (pendingUser) {
                return res.status(400).json({
                    message: 'Email not verified',
                    email: pendingUser.email,
                    requiresVerification: true
                });
            }
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Create Token
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

// Verify OTP and Create Real User
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const trimmedEmail = email.trim();

        // Find Pending User
        const pendingUser = await PendingUser.findOne({ email: trimmedEmail });
        if (!pendingUser) {
            // Check if already a real user
            const user = await User.findOne({ email: trimmedEmail });
            if (user) return res.status(400).json({ message: 'Email already verified' });
            return res.status(400).json({ message: 'User not found or OTP expired' });
        }

        // Check OTP
        if (pendingUser.verificationOTP !== otp) {
            return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้อง' });
        }

        // Check expiry
        if (new Date() > pendingUser.otpExpiry) {
            return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' });
        }

        // Create Real User and Family (if owner)
        let user, family;

        if (pendingUser.role === 'moderator') {
            // Create Family
            const inviteCode = generateInviteCode();
            family = new Family({
                name: pendingUser.familyData.familyName,
                inviteCode,
                ownerId: new mongoose.Types.ObjectId(), // Temp
            });
            await family.save();

            // Create User
            user = new User({
                name: pendingUser.name,
                email: pendingUser.email,
                password: pendingUser.password,
                role: 'moderator',
                familyId: family._id,
                emailVerified: true
            });
            await user.save();

            // Update Family
            family.ownerId = user._id;
            family.members.push(user._id);
            await family.save();

        } else {
            // Member joining existing family
            family = await Family.findById(pendingUser.familyData.familyId);
            if (!family) return res.status(400).json({ message: 'Family not found' });

            user = new User({
                name: pendingUser.name,
                email: pendingUser.email,
                password: pendingUser.password,
                role: 'member',
                familyId: family._id,
                emailVerified: true
            });
            await user.save();

            family.members.push(user._id);
            await family.save();
        }

        // Delete Pending User
        await PendingUser.deleteOne({ _id: pendingUser._id });

        // Create Token
        const token = jwt.sign(
            { userId: user._id, role: user.role, familyId: user.familyId },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.json({
            token,
            user: { id: user._id, name: user.name, role: user.role, familyId: user.familyId },
            message: 'ยืนยันอีเมลสำเร็จ'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const trimmedEmail = email.trim();

        // Find Pending User
        const pendingUser = await PendingUser.findOne({ email: trimmedEmail });
        if (!pendingUser) {
            const user = await User.findOne({ email: trimmedEmail });
            if (user) return res.status(400).json({ message: 'Email already verified' });
            return res.status(400).json({ message: 'User not found' });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        pendingUser.verificationOTP = otp;
        pendingUser.otpExpiry = otpExpiry;
        await pendingUser.save();

        // Send OTP email
        await sendOTPEmail(pendingUser.email, pendingUser.name, otp);

        res.json({ message: 'ส่งรหัส OTP ใหม่แล้ว' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
