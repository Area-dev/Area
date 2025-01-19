const express = require('express');
const router = express.Router();
const googleWebhooks = require('./google');
const githubWebhooks = require('./github');

router.use('/google', googleWebhooks);
router.use('/github', githubWebhooks);

module.exports = router;