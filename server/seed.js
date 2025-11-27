const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/familybank')
    .then(async () => {
        console.log('Connected to MongoDB');

        // Check if users exist
        const count = await User.countDocuments();
        if (count === 0) {
            await User.create([
                { name: 'Alice', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
                { name: 'Bob', role: 'Member', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
                { name: 'Charlie', role: 'Member', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' },
            ]);
            console.log('Users seeded');
        } else {
            console.log('Users already exist, skipping seed');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
