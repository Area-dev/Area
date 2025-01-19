const { body } = require('express-validator');

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('firstName')
    .optional()
    .isString()
    .trim(),
  body('lastName')
    .optional()
    .isString()
    .trim()
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide'),
  body('password')
    .exists()
    .withMessage('Mot de passe requis')
];

module.exports = {
  registerValidation,
  loginValidation
}; 