const { Expo } = require('expo-server-sdk');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const TEST_EMAIL = process.argv[2];
const expo = new Expo();

if (!TEST_EMAIL) {
    console.error('Please provide an email address.');
    process.exit(1);
}

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/familybank';
        await mongoose.connect(uri);
        console.log('Connected.');

        const user = await User.findOne({ email: TEST_EMAIL });
        if (!user || !user.pushToken) {
            console.error('User/Token not found.');
            process.exit(1);
        }

        console.log(`Target: ${user.name} | Token: ${user.pushToken}`);

        if (!Expo.isExpoPushToken(user.pushToken)) {
            console.error('Invalid Expo Token');
            process.exit(1);
        }

        const messages = [{
            to: user.pushToken,
            sound: 'default',
            channelId: 'default',
            title: 'Debug Notification',
            body: 'Testing Credentials',
            data: { test: true },
        }];

        console.log('Sending to Expo...');
        const chunks = expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Ticket Response:', JSON.stringify(ticketChunk, null, 2));

                // Check for errors in the ticket
                if (ticketChunk[0].status === 'error') {
                    console.error('❌ EXPO ERROR:', ticketChunk[0].message);
                    console.error('details:', ticketChunk[0].details);
                } else {
                    console.log('✅ Expo accepted the message (Ticket ID:', ticketChunk[0].id + ')');
                }
            } catch (error) {
                console.error('Error sending chunk:', error);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Script Error:', error);
        process.exit(1);
    }
};

run();
