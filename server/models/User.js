const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['member', 'moderator'], default: 'member' },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  balance: { type: Number, default: 0 }, // Individual member balance
  avatar: { type: String },
  emailVerified: { type: Boolean, default: false },
  pushToken: { type: String }, // Expo Push Token
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
