const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Documentation de l\'API',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // chemin vers vos fichiers de routes
};


const specs = swaggerJsdoc(options);

module.exports = specs; 