/**
 * Interface defining the common structure for all services
 */
class ServiceInterface {
  constructor() {
    if (this.constructor === ServiceInterface) {
      throw new Error("Can't instantiate abstract class!");
    }
    this._actions = [];
    this._reactions = [];
  }

  /**
   * Service configuration
   */
  get config() {
    throw new Error('Service must implement config getter');
  }

  /**
   * Available actions for the service
   */
  get actions() {
    return this._actions;
  }

  set actions(value) {
    this._actions = value;
  }

  /**
   * Available reactions for the service
   */
  get reactions() {
    return this._reactions;
  }

  set reactions(value) {
    this._reactions = value;
  }

  /**
   * Check service permissions
   * @param {string} accessToken - Service access token
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async checkPermissions(accessToken) {
    throw new Error('Service must implement checkPermissions method');
  }

  /**
   * Validate trigger parameters
   * @param {Object} trigger - Trigger configuration
   * @returns {Promise<void>}
   */
  async validateTrigger(trigger) {
    throw new Error('Service must implement validateTrigger method');
  }

  /**
   * Validate reaction parameters
   * @param {Object} reaction - Reaction configuration
   * @returns {Promise<void>}
   */
  async validateReaction(reaction) {
    throw new Error('Service must implement validateReaction method');
  }

  /**
   * Initialize a trigger for the service
   * @param {string} userId - User ID
   * @param {Object} trigger - Trigger configuration
   * @param {string} automationId - Automation ID
   * @returns {Promise<void>}
   */
  async initializeTrigger(userId, trigger, automationId) {
    throw new Error('Service must implement initializeTrigger method');
  }

  /**
   * Stop a trigger for the service
   * @param {string} userId - User ID
   * @param {Object} trigger - Trigger configuration
   * @param {string} automationId - Automation ID
   * @returns {Promise<void>}
   */
  async stopTrigger(userId, trigger, automationId) {
    throw new Error('Service must implement stopTrigger method');
  }
}

module.exports = ServiceInterface; 