const { body, param } = require('express-validator');

const createAutomationValidation = [
  body('name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis'),
  body('trigger.service')
    .isString()
    .notEmpty()
    .withMessage('Le service déclencheur est requis'),
  body('trigger.action')
    .isString()
    .notEmpty()
    .withMessage('L\'action déclencheur est requise'),
  body('reactions')
    .isArray()
    .withMessage('Les réactions doivent être un tableau')
    .notEmpty()
    .withMessage('Au moins une réaction est requise'),
  body('reactions.*.service')
    .isString()
    .notEmpty()
    .withMessage('Le service de réaction est requis'),
  body('reactions.*.action')
    .isString()
    .notEmpty()
    .withMessage('L\'action de réaction est requise')
];

const toggleAutomationValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID d\'automation invalide')
];

module.exports = {
  createAutomationValidation,
  toggleAutomationValidation
}; 