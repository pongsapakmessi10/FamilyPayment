const cron = require('node-cron');
const BillReminder = require('../models/BillReminder');
// Email reminders disabled

// Run every minute
const startBillReminderCron = () => {
    cron.schedule('* * * * *', async () => {
        console.log('Running bill reminder check...');
        try {
            const now = new Date();
            const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);

            // Find bills due within the next 3 hours that haven't been reminded yet
            // Email reminder sending removed
        } catch (err) {
            console.error('Error in bill reminder cron:', err);
        }
    });
};

module.exports = startBillReminderCron;
