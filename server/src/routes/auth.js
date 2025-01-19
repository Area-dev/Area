const express = require('express');
const authRouter = express.Router();
const userController = require("../controllers/user.controller");
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const User = require('../models/User');

const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: New user registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username 
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               username:
 *                 type: string
 *                 format: username
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid data
 */

authRouter.post("/register", userController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Authentication failed
 */

authRouter.post("/login", userController.login);

/**
 * @swagger
 * /auth/{provider}:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate OAuth authentication
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, spotify]
 *         description: The OAuth provider
 *     responses:
 *       302:
 *         description: Redirect to provider's login page
 */
authRouter.get('/auth/:provider', authController.initiateOAuth);

/**
 * @swagger
 * /auth/{provider}/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Handle OAuth callback
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, spotify]
 *         description: The OAuth provider
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The authorization code
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: The state parameter for CSRF protection
 *     responses:
 *       302:
 *         description: Redirect with JWT token
 */
authRouter.get('/auth/:provider/callback', authController.handleOAuthCallback);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     responses:
 *       200:
 *         description: Logout successful
 */
authRouter.post('/auth/logout', authController.logout);

/**
 * @swagger
 * /auth/service-connections:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user's service connections
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's service connections
 *       401:
 *         description: Unauthorized
 */
authRouter.get('/service-connections', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('serviceConnections');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json({ serviceConnections: user.serviceConnections || [] });
  } catch (error) {
    console.error('Erreur lors de la récupération des connexions de service:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = authRouter;