const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automation.controller');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /automations:
 *   get:
 *     tags: [Automations]
 *     summary: Get user automations and templates
 *     description: Get all automations for the current user and available templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of automations and templates
 */
router.get('/automations', auth, automationController.getUserAutomations);

/**
 * @swagger
 * /automations/templates:
 *   get:
 *     tags: [Automations]
 *     summary: Get automation templates
 *     description: Get all available automation templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of automation templates
 */
router.get('/automations/templates', auth, automationController.getTemplates);

/**
 * @swagger
 * /automations/create:
 *   post:
 *     tags: [Automations]
 *     summary: Create automation
 *     description: Create a new automation or template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - trigger
 *               - reactions
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isTemplate:
 *                 type: boolean
 *               trigger:
 *                 type: object
 *                 description: The trigger for the automation
 *                 properties:
 *                  service:
 *                    type: string
 *                    description: The service to use for the trigger
 *                  params:
 *                    type: object
 *                    description: The parameters to use for the trigger
 *               reactions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                       description: The service to use for the reaction
 *                     action:
 *                       type: string
 *                       description: The action to use for the reaction
 *                     params:
 *                       type: object
 *                       description: The parameters to use for the reaction
 *     responses:
 *       201:
 *         description: Automation created successfully
 */
router.post('/automations/create', auth, automationController.create);

/**
 * @swagger
 * /automations/template/{templateId}:
 *   post:
 *     tags: [Automations]
 *     summary: Create from template
 *     description: Create a new automation from an existing template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         description: ID of the template
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Custom name for the automation
 *               triggerParams:
 *                 type: object
 *                 description: Custom parameters for the trigger
 *               reactionParams:
 *                 type: array
 *                 description: Custom parameters for each reaction
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Automation created from template successfully
 */
router.post('/automations/template/:templateId', auth, automationController.createFromTemplate);

/**
 * @swagger
 * /automations/{id}/toggle:
 *   put:
 *     tags: [Automations]
 *     summary: Toggle automation
 *     description: Enable or disable an automation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the automation
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Automation toggled successfully
 */
router.put('/automations/:id/toggle', auth, automationController.toggleAutomation);

module.exports = router; 