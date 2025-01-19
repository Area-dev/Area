const GmailService = require('./google/GmailService');
const CalendarService = require('./google/CalendarService');
const DriveService = require('./google/DriveService');
const GitHubService = require('./github/GitHubService');

class ServiceManager {
  constructor() {
    this.services = new Map();
    this.initialize();
  }

  initialize() {
    // Register services
    this.registerService(new GmailService());
    this.registerService(new CalendarService());
    this.registerService(new DriveService());
    this.registerService(new GitHubService());
  }

  registerService(service) {
    this.services.set(service.name, service);
  }

  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }

  getServices() {
    return Array.from(this.services.values()).map(service => ({
      name: service.name,
      ...service.config
    }));
  }

  hasService(name) {
    return this.services.has(name);
  }

  async validateTrigger(serviceName, trigger) {
    const service = this.getService(serviceName);
    await service.validateTrigger(trigger);
  }

  async validateReaction(serviceName, reaction) {
    const service = this.getService(serviceName);
    await service.validateReaction(reaction);
  }

  async initializeTrigger(serviceName, userId, trigger, automationId) {
    const service = this.getService(serviceName);
    await service.initializeTrigger(userId, trigger, automationId);
  }

  async stopTrigger(serviceName, userId, trigger, automationId) {
    const service = this.getService(serviceName);
    await service.stopTrigger(userId, trigger, automationId);
  }
}

// Export singleton instance
module.exports = new ServiceManager(); 
