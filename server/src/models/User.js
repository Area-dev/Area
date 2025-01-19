const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false
  },
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  serviceConnections: [{
    service: {
      type: String,
      required: true
    },
    accessToken: String,
    refreshToken: String,
    expiresAt: Date
  }]
}, { 
  timestamps: true,
  _id: true,
  id: false
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

User.collection.dropIndex('id_1')
  .catch(err => {
    if (err.code !== 27) {
      console.warn('Warning: ', err.message);
    }
  });

module.exports = User;