const Automation = require('../models/Automation');
const User = require('../models/User');
const ServiceManager = require('../services/ServiceManager');

const GOOGLE_SERVICES = {
  'gmail': 'google',
  'calendar': 'google',
  'drive': 'google'
};

const getParentService = (serviceName) => {
  return GOOGLE_SERVICES[serviceName] || serviceName;
};

const automationController = {
  create: async (req, res) => {
    try {
      const { name, description, trigger, reactions, isTemplate } = req.body;

      if (!ServiceManager.hasService(trigger.service)) {
        return res.status(400).json({
          message: `Service ${trigger.service} not found`
        });
      }

      for (const reaction of reactions) {
        if (!ServiceManager.hasService(reaction.service)) {
          return res.status(400).json({
            message: `Service ${reaction.service} not found`
          });
        }
      }

      try {
        await ServiceManager.validateTrigger(trigger.service, trigger);
        for (const reaction of reactions) {
          await ServiceManager.validateReaction(reaction.service, reaction);
        }
      } catch (validationError) {
        return res.status(400).json({
          message: 'Invalid parameters',
          details: validationError.message
        });
      }

      const automation = new Automation({
        name,
        description,
        trigger,
        reactions,
        isTemplate: isTemplate || false,
        userId: isTemplate ? null : req.user.id
      });

      await automation.save();
      res.status(201).json(automation);
    } catch (error) {
      console.error('Error creating automation:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getUserAutomations: async (req, res) => {
    try {
      const userID = req.user.id;
      const automations = await Automation.find({ 
        $or: [
          { userId: userID },
          { isTemplate: false }
        ]
      });
      res.json(automations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  createFromTemplate: async (req, res) => {
    try {
      const { templateId } = req.params;
      const { name, triggerParams, reactionParams } = req.body;

      const template = await Automation.findOne({ _id: templateId, isTemplate: true });
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      const trigger = {
        ...template.trigger,
        params: {
          ...template.trigger.params,
          ...triggerParams
        }
      };

      const reactions = template.reactions.map((reaction, index) => ({
        ...reaction,
        params: {
          ...reaction.params,
          ...(reactionParams?.[index] || {})
        }
      }));

      try {
        await ServiceManager.validateTrigger(trigger.service, trigger);
        for (const reaction of reactions) {
          await ServiceManager.validateReaction(reaction.service, reaction);
        }
      } catch (validationError) {
        return res.status(400).json({
          message: 'Invalid parameters',
          details: validationError.message
        });
      }

      const automation = new Automation({
        name: name || template.name,
        description: template.description,
        trigger,
        reactions,
        isTemplate: false,
        templateId: template._id,
        userId: req.user.id,
        active: false
      });

      await automation.save();
      res.status(201).json(automation);
    } catch (error) {
      console.error('Error creating automation from template:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getTemplates: async (req, res) => {
    try {
      const templates = await Automation.find({ isTemplate: true });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  toggleAutomation: async (req, res) => {
    try {
      const automation = await Automation.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!automation) {
        return res.status(404).json({ message: 'No automation found' });
      }

      if (automation.isTemplate) {
        return res.status(400).json({ message: 'Cannot toggle a template' });
      }

      const user = await User.findById(req.user.id);
      const servicesSet = new Set([
        getParentService(automation.trigger.service),
        ...automation.reactions.map(r => getParentService(r.service))
      ]);

      for (const serviceName of servicesSet) {
        const connection = user.serviceConnections.find(
          conn => conn.service === serviceName
        );

        if (!connection) {
          return res.status(400).json({
            message: `${serviceName} account not connected. Please connect your account first.`
          });
        }

        const service = ServiceManager.getService(automation.trigger.service);
        const permissionCheck = await service.checkPermissions(connection.accessToken);
        
        if (!permissionCheck.success) {
          return res.status(403).json({
            message: `Insufficient ${serviceName} permissions. Please reconnect your account with the required permissions.`,
            details: permissionCheck.error
          });
        }
      }

      automation.active = !automation.active;

      try {
        if (automation.active) {
          await ServiceManager.initializeTrigger(
            automation.trigger.service,
            req.user.id,
            automation.trigger,
            automation._id
          );
        } else {
          await ServiceManager.stopTrigger(
            automation.trigger.service,
            req.user.id,
            automation.trigger,
            automation._id
          );
        }
      } catch (error) {
        console.error('Trigger operation failed:', error);
        return res.status(500).json({
          message: 'Failed to update trigger status',
          details: error.message
        });
      }

      await automation.save();
      res.json(automation);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = automationController;