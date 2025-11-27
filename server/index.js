const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const billsRoutes = require('./routes/bills');
const eventBudgetRoutes = require('./routes/eventBudgets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Allow Next.js frontend
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io available in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/shopping', require('./routes/shopping'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api', billsRoutes);
app.use('/api', eventBudgetRoutes);
app.use('/api', apiRoutes);

// Socket.io
const Message = require('./models/Message');

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-family', (familyId) => {
        socket.join(familyId);
        console.log(`User ${socket.id} joined family: ${familyId}`);
    });

    // Join family chat room
    socket.on('join-family-chat', async (familyId) => {
        socket.join(`chat-${familyId}`);
        console.log(`User ${socket.id} joined chat for family: ${familyId}`);
    });

    // Join DM room
    socket.on('join-dm-room', ({ userId1, userId2 }) => {
        const conversationId = [userId1.toString(), userId2.toString()].sort().join('_');
        socket.join(`dm-${conversationId}`);
        console.log(`User ${socket.id} joined DM: ${conversationId}`);
    });

    // Send group message
    socket.on('send-message', async (data) => {
        try {
            const { familyId, senderId, senderName, message } = data;

            // Save message to database
            const newMessage = new Message({
                familyId,
                sender: senderId,
                messageType: 'group',
                message,
                timestamp: new Date()
            });

            await newMessage.save();

            // Populate sender info
            await newMessage.populate('sender', 'name email');

            // Broadcast to all family members in chat room
            io.to(`chat-${familyId}`).emit('message-received', {
                _id: newMessage._id,
                familyId: newMessage.familyId,
                sender: newMessage.sender,
                messageType: newMessage.messageType,
                message: newMessage.message,
                timestamp: newMessage.timestamp,
                readBy: newMessage.readBy
            });

            console.log(`Message sent in family ${familyId}: ${message}`);
        } catch (err) {
            console.error('Error sending message:', err);
            socket.emit('message-error', { message: 'Failed to send message' });
        }
    });

    // Send direct message
    socket.on('send-dm', async (data) => {
        try {
            const { familyId, senderId, recipientId, message } = data;

            // Generate conversation ID
            const conversationId = [senderId.toString(), recipientId.toString()].sort().join('_');

            // Save message to database
            const newMessage = new Message({
                familyId,
                sender: senderId,
                recipient: recipientId,
                messageType: 'dm',
                conversationId,
                message,
                timestamp: new Date()
            });

            await newMessage.save();

            // Populate sender and recipient info
            await newMessage.populate('sender', 'name email');
            await newMessage.populate('recipient', 'name email');

            // Broadcast to both sender and recipient in DM room
            io.to(`dm-${conversationId}`).emit('dm-received', {
                _id: newMessage._id,
                familyId: newMessage.familyId,
                sender: newMessage.sender,
                recipient: newMessage.recipient,
                messageType: newMessage.messageType,
                conversationId: newMessage.conversationId,
                message: newMessage.message,
                timestamp: newMessage.timestamp,
                readBy: newMessage.readBy
            });

            console.log(`DM sent from ${senderId} to ${recipientId}: ${message}`);
        } catch (err) {
            console.error('Error sending DM:', err);
            socket.emit('message-error', { message: 'Failed to send DM' });
        }
    });

    // Mark messages as read (real-time)
    socket.on('mark-read', async (data) => {
        try {
            const { conversationId, messageIds, userId } = data;
            const readAt = new Date();

            let updatedMessages = [];

            if (conversationId) {
                // Mark all unread messages in conversation
                const messages = await Message.find({
                    conversationId,
                    'readBy.user': { $ne: userId }
                });

                for (const message of messages) {
                    message.readBy.push({ user: userId, readAt });
                    await message.save();
                    updatedMessages.push(message);
                }
            } else if (messageIds) {
                // Mark specific messages
                const messages = await Message.find({
                    _id: { $in: messageIds },
                    'readBy.user': { $ne: userId }
                });

                for (const message of messages) {
                    message.readBy.push({ user: userId, readAt });
                    await message.save();
                    updatedMessages.push(message);
                }
            }

            // Emit read receipt to the room
            if (updatedMessages.length > 0 && conversationId) {
                io.to(`dm-${conversationId}`).emit('messages-read', {
                    conversationId,
                    messageIds: updatedMessages.map(m => m._id.toString()),
                    userId,
                    readAt
                });

                console.log(`Messages marked as read in ${conversationId} by ${userId}`);
            }
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/familybank')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Cron Job: Daily bill reminders at 08:00 AM
const BillReminder = require('./models/BillReminder');
const startBillReminderCron = require('./cron/billReminders');

// Start 3-hour reminder cron
startBillReminderCron();

cron.schedule('0 8 * * *', async () => {
    console.log('Running daily bill reminder check...');

    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Find bills due today
        const dueToday = await BillReminder.find({
            dueDate: { $gte: startOfDay, $lte: endOfDay },
            status: 'active'
        }).populate('familyId');

        // Send notifications for bills due today
        for (const bill of dueToday) {
            io.to(bill.familyId.toString()).emit('bill-due-today', {
                bill,
                message: `Reminder: ${bill.title} is due today!`
            });
            console.log(`Notified family ${bill.familyId} about bill: ${bill.title}`);
        }

        // Find and update overdue bills
        const overdueBills = await BillReminder.find({
            dueDate: { $lt: startOfDay },
            status: 'active'
        });

        for (const bill of overdueBills) {
            bill.status = 'overdue';
            await bill.save();

            io.to(bill.familyId.toString()).emit('bill-overdue', {
                bill,
                message: `${bill.title} is now overdue!`
            });
            console.log(`Marked bill as overdue: ${bill.title}`);
        }

        console.log(`Daily check complete: ${dueToday.length} due today, ${overdueBills.length} marked overdue`);
    } catch (err) {
        console.error('Error in daily bill reminder cron job:', err);
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
