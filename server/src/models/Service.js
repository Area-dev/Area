const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: String,
  type: String,
  required: Boolean,
  description: String,
  enum: [String]
}, { _id: false });

const actionSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  fields: [fieldSchema]
}, { _id: false });

const reactionSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  fields: [fieldSchema]
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: String,
  description: String,
  category: {
    type: String,
    enum: ['social', 'productivity', 'development', 'communication'],
    required: true
  },
  authType: {
    type: String,
    enum: ['oauth2', 'apiKey', 'basic'],
    required: true
  },
  config: {
    clientId: String,
    clientSecret: String,
    redirectUri: String,
    scope: [String],
    authUrl: String,
    tokenUrl: String
  },
  actions: [actionSchema],
  reactions: [reactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);