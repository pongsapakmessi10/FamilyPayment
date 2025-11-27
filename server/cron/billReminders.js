const cron = require('node-cron');
const BillReminder = require('../models/BillReminder');
const { sendBillReminderEmail } = require('../utils/emailService');

// Run every minute
const startBillReminderCron = () => {
    cron.schedule('* * * * *', async () => {
        console.log('Running bill reminder check...');
        try {
            const now = new Date();
            const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);

            // Find bills due within the next 3 hours that haven't been reminded yet
            const billsDueSoon = await BillReminder.find({
                dueDate: {
                    $gt: now,
                    $lte: threeHoursLater
                },
                status: 'active',
                reminderSent: false
            }).populate('createdBy', 'name email');

            for (const bill of billsDueSoon) {
                if (bill.createdBy && bill.createdBy.email) {
                    await sendBillReminderEmail(bill.createdBy.email, bill.createdBy.name, bill);

                    // Mark as reminded
                    bill.reminderSent = true;
                    await bill.save();
                    console.log(`Reminder sent for bill: ${bill.title}`);
                }
            }
        } catch (err) {
            console.error('Error in bill reminder cron:', err);
        }
    });
};

module.exports = startBillReminderCron;
