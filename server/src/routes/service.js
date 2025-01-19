const express = require("express");
const serviceRouter = express.Router();
const serviceController = require("../controllers/service.controller");
const auth = require("../middleware/auth");

/**
 * @swagger
 * /services/create:
 *   post:
 *     tags: [Services]
 *     summary: Create Service
 *     description: Create a new service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category
 *               - authType
 *               - actions
 *               - reactions
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               authType:
 *                 type: string
 *               actions:
 *                 type: array
 *                 items:
 *                   type: string
 *               reactions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Service created successfully
 */

serviceRouter.post("/services/create", serviceController.create);

/**
 * @swagger
 * /services:
 *   get:
 *     tags: [Services]
 *     summary: Get Services
 *     description: Get all services
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: List of userss
 */

serviceRouter.get("/services", serviceController.getServices);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get Service by ID
 *     description: Get a service by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service found
 *       404:
 *         description: Service not found
 */

serviceRouter.get("/services/:id", serviceController.getServiceById);

/**
 * @swagger
 * /services/{id}/delete:
 *   delete:
 *     tags: [Services]
 *     summary: Delete Service
 *     description: Delete a service by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       404:
 *         description: Service not found
 */

serviceRouter.delete("/services/:id/delete", serviceController.delete);

// Routes protégées
serviceRouter.use(auth);

// Initialiser les services par défaut
serviceRouter.post('/services/init', async (req, res) => {
    try {
        const defaultServices = [
            {
                name: 'google',
                displayName: 'Google',
                description: 'Services Google (Gmail, Calendar)',
                category: 'productivity',
                authType: 'oauth2',
                config: {
                    scope: ['gmail', 'calendar']
                },
                actions: [
                    {
                        id: 'calendar_new_event',
                        name: 'Nouvel événement Calendar',
                        description: 'Se déclenche lorsqu\'un nouvel événement est créé',
                        fields: [
                            {
                                name: 'calendarId',
                                type: 'string',
                                description: 'ID du calendrier à surveiller',
                                required: true
                            }
                        ]
                    },
                    {
                        id: 'gmail_new_email',
                        name: 'Nouvel email Gmail',
                        description: 'Se déclenche lorsqu\'un nouvel email est reçu',
                        fields: [
                            {
                                name: 'fromEmail',
                                type: 'string',
                                description: 'Email de l\'expéditeur',
                                required: false
                            },
                            {
                                name: 'subject',
                                type: 'string',
                                description: 'Sujet de l\'email',
                                required: false
                            }
                        ]
                    }
                ],
                reactions: [
                    {
                        id: 'calendar_create_event',
                        name: 'Créer un événement',
                        description: 'Crée un nouvel événement dans Google Calendar',
                        fields: [
                            {
                                name: 'title',
                                type: 'string',
                                description: 'Titre de l\'événement',
                                required: true
                            },
                            {
                                name: 'description',
                                type: 'string',
                                description: 'Description de l\'événement',
                                required: false
                            },
                            {
                                name: 'startDate',
                                type: 'datetime',
                                description: 'Date et heure de début',
                                required: true
                            },
                            {
                                name: 'endDate',
                                type: 'datetime',
                                description: 'Date et heure de fin',
                                required: true
                            }
                        ]
                    },
                    {
                        id: 'gmail_send_email',
                        name: 'Envoyer un email',
                        description: 'Envoie un email via Gmail',
                        fields: [
                            {
                                name: 'to',
                                type: 'string',
                                description: 'Destinataire',
                                required: true
                            },
                            {
                                name: 'subject',
                                type: 'string',
                                description: 'Sujet',
                                required: true
                            },
                            {
                                name: 'body',
                                type: 'text',
                                description: 'Corps du message',
                                required: true
                            }
                        ]
                    }
                ]
            }
        ];

        // Supprimer tous les services existants
        await Service.deleteMany({});

        // Créer les nouveaux services
        for (const serviceData of defaultServices) {
            const service = new Service(serviceData);
            await service.save();
        }

        res.status(200).json({ message: 'Services initialisés avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des services:', error);
        res.status(500).json({ message: error.message });
    }
});

// Autres routes protégées
serviceRouter.post('/services', serviceController.create);
serviceRouter.post('/services/:id/actions', serviceController.addAction);
serviceRouter.post('/services/:id/reactions', serviceController.addReaction);
serviceRouter.delete('/services/:id', serviceController.delete);

module.exports = serviceRouter;