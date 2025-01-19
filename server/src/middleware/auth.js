const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    req.token = token;
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      provider: decoded.provider || 'local'
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = auth;