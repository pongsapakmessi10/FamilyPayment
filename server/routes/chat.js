const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper function to generate conversation ID
const getConversationId = (userId1, userId2) => {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `${ids[0]}_${ids[1]}`;
};

// Get unread message count (group + DM)
router.get('/unread-count', auth, async (req, res) => {
    try {
        const { userId, familyId } = req.user;

        // Count unread group messages
        const groupUnread = await Message.countDocuments({
            familyId,
            messageType: 'group',
            sender: { $ne: userId },
            'readBy.user': { $ne: userId },
            deletedForEveryone: false,
            $nor: [{ deletedBy: userId }]
        });

        // Count unread DM messages where user is recipient
        const dmUnread = await Message.countDocuments({
            familyId,
            messageType: 'dm',
            recipient: userId,
            'readBy.user': { $ne: userId },
            deletedForEveryone: false,
            $nor: [{ deletedBy: userId }]
        });

        const totalUnread = groupUnread + dmUnread;

        res.json({
            total: totalUnread,
            group: groupUnread,
            dm: dmUnread
        });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get message history for family (group messages only)
router.get('/messages', auth, async (req, res) => {
    try {
        const { familyId } = req.user;
        const messageType = req.query.type || 'group';
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        const query = { familyId, messageType };

        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .populate('sender', 'name email')
            .lean();

        // Reverse to show oldest first
        messages.reverse();

        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get DM message history with a specific user
router.get('/messages/:userId', auth, async (req, res) => {
    try {
        const { userId: otherUserId } = req.params;
        const { userId: currentUserId, familyId } = req.user;
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        // Verify other user is in same family
        const otherUser = await User.findById(otherUserId);
        if (!otherUser || otherUser.familyId.toString() !== familyId) {
            return res.status(400).json({ message: 'User not found in your family' });
        }

        const conversationId = getConversationId(currentUserId, otherUserId);

        const messages = await Message.find({
            conversationId,
            messageType: 'dm'
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .populate('sender', 'name email')
            .populate('recipient', 'name email')
            .lean();

        // Reverse to show oldest first
        messages.reverse();

        res.json(messages);
    } catch (err) {
        console.error('Error fetching DM messages:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get list of all DM conversations
router.get('/conversations', auth, async (req, res) => {
    try {
        const { userId, familyId } = req.user;

        // Get all DM messages where user is sender or recipient
        const messages = await Message.find({
            messageType: 'dm',
            familyId,
            $or: [
                { sender: userId },
                { recipient: userId }
            ],
            deletedForEveryone: false,
            $nor: [
                { deletedBy: userId }
            ]
        })
            .sort({ timestamp: -1 })
            .populate('sender', 'name email')
            .populate('recipient', 'name email')
            .lean();

        // Group by conversation and get latest message for each
        const conversationsMap = new Map();

        messages.forEach(msg => {
            const conversationId = msg.conversationId;
            if (!conversationsMap.has(conversationId)) {
                // Determine the other user in the conversation
                const otherUser = msg.sender._id.toString() === userId
                    ? msg.recipient
                    : msg.sender;

                conversationsMap.set(conversationId, {
                    conversationId,
                    otherUser,
                    lastMessage: msg,
                    unreadCount: 0
                });
            }
        });

        // Count unread messages for each conversation
        for (const [conversationId, conversation] of conversationsMap) {
            const unreadCount = await Message.countDocuments({
                conversationId,
                recipient: userId,
                deletedForEveryone: false,
                $nor: [
                    { deletedBy: userId }
                ],
                // Check if user is NOT in readBy array (accounting for new schema)
                'readBy.user': { $ne: userId }
            });
            conversation.unreadCount = unreadCount;
        }

        const conversations = Array.from(conversationsMap.values())
            .sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));

        res.json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark messages as read
router.post('/mark-read', auth, async (req, res) => {
    try {
        const { messageIds, conversationId } = req.body;
        const userId = req.user.userId;
        const readAt = new Date();

        let updatedMessages = [];

        if (conversationId) {
            // Mark all messages in a conversation as read
            const messages = await Message.find({
                conversationId,
                'readBy.user': { $ne: userId }
            });

            for (const message of messages) {
                message.readBy.push({ user: userId, readAt });
                await message.save();
                updatedMessages.push(message);
            }
        } else if (messageIds && messageIds.length > 0) {
            // Mark specific messages as read
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

        // Emit socket event for real-time read receipt
        if (updatedMessages.length > 0) {
            const io = req.app.get('io');
            const firstMessage = updatedMessages[0];

            const roomName = firstMessage.messageType === 'group'
                ? `chat-${req.user.familyId}`
                : `dm-${firstMessage.conversationId}`;

            io.to(roomName).emit('messages-read', {
                conversationId: firstMessage.conversationId,
                messageIds: updatedMessages.map(m => m._id),
                userId,
                readAt
            });
        }

        res.json({ message: 'Messages marked as read', count: updatedMessages.length });
    } catch (err) {
        console.error('Error marking messages as read:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete message (moderator only)
router.delete('/:messageId', auth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { role, familyId } = req.user;

        if (role !== 'moderator') {
            return res.status(403).json({ message: 'Only moderators can delete messages' });
        }

        const message = await Message.findOne({ _id: messageId, familyId });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        await message.deleteOne();
        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete message for everyone (sender only)
router.delete('/messages/:messageId/for-everyone', auth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, familyId } = req.user;

        const message = await Message.findOne({ _id: messageId, familyId });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Only sender can delete for everyone
        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: 'Only the sender can delete this message for everyone' });
        }

        // Already deleted
        if (message.deletedForEveryone) {
            return res.status(400).json({ message: 'Message already deleted' });
        }

        message.deletedForEveryone = true;
        message.deletedAt = new Date();
        await message.save();

        // Emit socket event
        const io = req.app.get('io');
        const roomName = message.messageType === 'group'
            ? `chat-${familyId}`
            : `dm-${message.conversationId}`;

        io.to(roomName).emit('message-deleted-for-everyone', {
            messageId: message._id,
            messageType: message.messageType,
            conversationId: message.conversationId
        });

        res.json({ message: 'Message deleted for everyone', deletedMessage: message });
    } catch (err) {
        console.error('Error deleting message for everyone:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete message for me only
router.delete('/messages/:messageId/for-me', auth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, familyId } = req.user;

        const message = await Message.findOne({ _id: messageId, familyId });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Check if already deleted for this user
        if (message.deletedBy.includes(userId)) {
            return res.status(400).json({ message: 'Message already deleted for you' });
        }

        message.deletedBy.push(userId);
        await message.save();

        res.json({ message: 'Message deleted for you' });
    } catch (err) {
        console.error('Error deleting message for me:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
