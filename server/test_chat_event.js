const io = require('socket.io-client');

// Connect to the local server
const socket = io('http://localhost:5000', {
    transports: ['websocket']
});

// Configure test data
// Sender: Wichai J.
const senderId = '6932af90a6db7b93a152465f';
// Recipient: Pongsapak JS (Assumed current user)
const recipientId = '6932af42a6db7b93a1524645';
const familyId = '6932af42a6db7b93a1524643';

socket.on('connect', () => {
    console.log('Connected to server as tester.');

    // Only join DM room to verify WE receive the broadcast (as sender/recipient)
    // The mobile app joins 'user-recipientId' to get the notification.
    socket.emit('join-dm-room', { userId1: senderId, userId2: recipientId });

    setTimeout(() => {
        const messageData = {
            familyId,
            senderId,
            senderName: 'Wichai J.',
            recipientId,
            message: `Test Badge Message ${new Date().toLocaleTimeString()}`
        };

        console.log('Sending Test DM...');
        console.log('From:', senderId);
        console.log('To:', recipientId);

        // Emit send-dm event
        socket.emit('send-dm', messageData);
    }, 500);
});

socket.on('dm-received', (data) => {
    console.log('✅ DM Send Success! Server broadcasted dm-received.');
    console.log('Mobile App should now fetch new unread count.');

    setTimeout(() => {
        console.log('Exiting test script.');
        socket.disconnect();
        process.exit(0);
    }, 1000);
});

socket.on('message-error', (err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});

// Timeout fallback
setTimeout(() => {
    console.log('Timeout waiting for response.');
    process.exit(1);
}, 5000);
