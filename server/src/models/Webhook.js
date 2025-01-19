const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: String,
    required: true
  },
  resourceId: String,
  automationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Automation',
    required: true
  },
  expiration: Date,
  config: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.model('Webhook', webhookSchema); 