const User = require('../models/User');
const Automation = require('../models/Automation');
const bcrypt = require('bcryptjs');
const { get } = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');

const userController = {
  // Create new user
  create: async (req, res) => {
    try {
      const { email, password, username, role } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          message: 'An user with this email already exists'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email,
        password: hashedPassword,
        username,
        role
      });

      await user.save();

      res.status(201).json({ user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Register User
  register: async (req, res) => {
    try {
      const { email, password, username } = req.body;

      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'A user with this email or username already exists'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        username,
        email,
        password: hashedPassword
      });

      await user.save();

      // Vérification de la présence de JWT_SECRET
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: error.message || 'An error occurred during registration'
      });
    }
  },

  // Log User in
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Wrong email or password' });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUserServices: async (req, res) => {
    try {
        console.log('=== getUserServices ===');
        const userId = req.params.id;
        
        if (!userId) {
            console.log('ID utilisateur manquant');
            return res.status(400).json({ message: 'ID utilisateur requis' });
        }

        // Vérifier si l'ID est un ObjectId MongoDB valide
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('ID utilisateur invalide:', userId);
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.log('Utilisateur non trouvé');
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        console.log('Utilisateur trouvé:', {
            id: user._id,
            email: user.email,
            username: user.username,
            serviceConnections: user.serviceConnections
        });

        res.json({
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                serviceConnections: user.serviceConnections || []
            }
        });
    } catch (error) {
        console.error('Erreur dans getUserServices:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
  },

  getUserById: async (req, res) => {
    try {
      console.log('=== getUserById ===');
      console.log('ID recherché:', req.params.id);
      
      const user = await User.findById(req.params.id);
      if (!user) {
        console.log('Utilisateur non trouvé');
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('Utilisateur trouvé:', {
        id: user._id,
        email: user.email,
        serviceConnections: user.serviceConnections
      });

      res.status(200).json({ user });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { email, password, username, role } = req.body;

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.email = email;
      user.username = username;
      user.role = role;

      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      await user.save();

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUserAutomations: async (req, res) => {
    try {
      const automations = await Automation.find({ userId: req.params.id });
      res.json(automations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const service = await User.findByIdAndDelete(req.params.id);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });        
      }
      res.status(200).json({ message: 'Service deleted successfully', service });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = userController;