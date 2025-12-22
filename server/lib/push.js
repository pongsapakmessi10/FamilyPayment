const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();

const sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushToken) {
            console.log(`User ${userId} has no push token.`);
            return;
        }

        if (!Expo.isExpoPushToken(user.pushToken)) {
            console.error(`Push token ${user.pushToken} is not a valid Expo push token`);
            return;
        }

        const messages = [{
            to: user.pushToken,
            sound: 'default',
            channelId: 'default',
            priority: 'high',
            title,
            body,
            data,
        }];

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }

        console.log(`Notification sent to ${user.name}: ${title}`);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

module.exports = { sendPushNotification };
