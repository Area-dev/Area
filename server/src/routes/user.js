const express = require('express');
const userRouter = express.Router();
const userController = require('../controllers/user.controller');

/**
 * @swagger
 * /users/create:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (Admin only)
 *     description: For the admin to create a user
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
userRouter.post("/users/create", userController.create); // For the admin to create a user

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

userRouter.get("/users", userController.getUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
userRouter.get("/users/:id", userController.getUserById);

/**
 * @swagger
 * /users/{id}/services:
 *   get:
 *     tags: [Users]
 *     summary: Get user services by user ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of user services
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       404:
 *         description: User not found
 */
userRouter.get("/users/:id/services", userController.getUserServices);

/**
 * @swagger
 * /users/{id}/update:
 *   put:
 *     tags: [Users]
 *     summary: Update user by ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: User not found
 */

userRouter.put("/users/:id/update", userController.update);


/**
 * @swagger
 * /users/{id}/automations:
 *   get:
 *     tags: [Users]
 *     summary: Get user automations by user ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of user automations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   active:
 *                     type: boolean
 *                   trigger:
 *                     type: object
 *                     properties:
 *                       service:
 *                         type: string
 *                       action:
 *                         type: string
 *                       params:
 *                         type: object
 *                   reactions:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         service:
 *                           type: string
 *                         action:
 *                           type: string
 *                         params:
 *                           type: object
 */
userRouter.get("/users/:id/automations", userController.getUserAutomations);

/**
 * @swagger
 * /users/{id}/delete:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user by ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */

userRouter.delete("/users/:id/delete", userController.delete);

module.exports = userRouter;
