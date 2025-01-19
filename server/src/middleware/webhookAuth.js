const crypto = require('crypto');

const verifyGoogleWebhook = (req, res, next) => {
  console.log('Webhook verification middleware:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });

  // En développement, on accepte toutes les requêtes pour faciliter le debug
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // En production, on vérifie la signature
  try {
    // Vérification à implémenter pour la production
    next();
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(403).send('Invalid webhook signature');
  }
};

module.exports = {
  verifyGoogleWebhook
}; 