const Service = require('../models/Service');

const serviceController = {
    getServices: async (req, res) => {
        try {
            const services = await Service.find();
            const formattedServices = services.map(service => ({
                id: service._id,
                name: service.name,
                displayName: service.displayName,
                description: service.description,
                category: service.category,
                auth: {
                    type: service.authType,
                    scopes: service.config?.scope || []
                },
                actions: (service.actions || []).map(action => ({
                    id: action.id,
                    name: action.name,
                    description: action.description,
                    fields: action.fields || []
                })),
                reactions: (service.reactions || []).map(reaction => ({
                    id: reaction.id,
                    name: reaction.name,
                    description: reaction.description,
                    fields: reaction.fields || []
                }))
            }));
            res.json(formattedServices);
        } catch (error) {
            console.error('Erreur lors de la récupération des services:', error);
          res.status(500).json({ message: error.message });
        }
    },

    getServiceById: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id).lean();
            
            console.log('Service brut de la DB:', JSON.stringify(service, null, 2));

            if (!service) {
                return res.status(404).json({ message: 'Service non trouvé' });
            }

            await Service.findByIdAndUpdate(service._id, {
                $set: {
                    actions: service.actions.map(action => ({
                        ...action,
                        fields: action.fields || [
                            {
                                name: "fromEmail",
                                type: "string",
                                required: false,
                                description: "Email address of the sender",
                                enum: []
                            },
                            {
                                name: "subject",
                                type: "string",
                                required: false,
                                description: "Subject of the email contains",
                                enum: []
                            }
                        ]
                    })),
                    reactions: service.reactions.map(reaction => ({
                        ...reaction,
                        fields: reaction.fields || [
                            {
                                name: "to",
                                type: "string",
                                required: true,
                                description: "Recipient's email address",
                                enum: []
                            },
                            {
                                name: "subject",
                                type: "string",
                                required: true,
                                description: "Subject of the email",
                                enum: []
                            },
                            {
                                name: "body",
                                type: "text",
                                required: true,
                                description: "Content of the email",
                                enum: []
                            }
                        ]
                    }))
                }
            });

            const updatedService = await Service.findById(req.params.id).lean();
            console.log('Service mis à jour:', JSON.stringify(updatedService, null, 2));

            const formattedService = {
                id: updatedService._id,
                name: updatedService.name,
                displayName: updatedService.displayName || updatedService.name,
                description: updatedService.description,
                category: updatedService.category,
                auth: {
                    type: updatedService.authType,
                    scopes: updatedService.config?.scope || []
                },
                actions: updatedService.actions.map(action => ({
                    id: action.id,
                    name: action.name,
                    description: action.description,
                    fields: action.fields
                })),
                reactions: updatedService.reactions.map(reaction => ({
                    id: reaction.id,
                    name: reaction.name,
                    description: reaction.description,
                    fields: reaction.fields
                }))
            };

            console.log('Service formaté final:', JSON.stringify(formattedService, null, 2));
            res.json(formattedService);
        } catch (error) {
            console.error('Erreur lors de la récupération du service:', error);
          res.status(500).json({ message: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const service = new Service(req.body);
            await service.save();
            res.status(201).json(service);
        } catch (error) {
            console.error('Erreur lors de la création du service:', error);
          res.status(500).json({ message: error.message });
        }
    },

    addAction: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id);
            if (!service) {
                return res.status(404).json({ message: 'Service non trouvé' });
            }
            service.actions.push(req.body);
            await service.save();
            res.json(service);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'action:', error);
            res.status(500).json({ message: error.message });
        }
    },

    addReaction: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id);
            if (!service) {
                return res.status(404).json({ message: 'Service non trouvé' });
            }
            service.reactions.push(req.body);
            await service.save();
            res.json(service);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la réaction:', error);
            res.status(500).json({ message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
          const service = await Service.findByIdAndDelete(req.params.id);
          if (!service) {
                return res.status(404).json({ message: 'Service non trouvé' });
          }
            res.json({ message: 'Service supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du service:', error);
          res.status(500).json({ message: error.message });
        }
    }
};

module.exports = serviceController;