const mongoose = require('mongoose');

const automationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Automation',
    required: false
  },
  active: {
    type: Boolean,
    default: false
  },
  trigger: {
    service: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    params: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  reactions: [{
    service: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  }],
  executionHistory: [{
    timestamp: Date,
    status: String,
    error: String,
    details: Object
  }]
}, { timestamps: true });

module.exports = mongoose.model('Automation', automationSchema); 