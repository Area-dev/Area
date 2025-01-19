const jwt = require('jsonwebtoken');
const googleAuthService = require('../services/google/auth');
// const spotifyAuthService = require('../services/spotify/auth');
const githubAuthService = require('../services/github/auth');
// const discordAuthService = require('../services/discord/auth');
// const twitterAuthService = require('../services/twitter/auth');

const generateToken = (user, provider) => {
    return jwt.sign(
        {
            userId: user._id,
            email: user.email,
            provider
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const handleRedirect = (res, token, isMobile) => {
    if (isMobile) {
        res.redirect(`area://auth/callback?token=${token}`);
    } else {
        res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
    }
};

const authController = {
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'Email ou nom d\'utilisateur déjà utilisé' 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        email,
        password: hashedPassword
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ 
        message: 'Erreur lors de l\'inscription',
        error: error.message 
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(200).json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
  },

  initiateOAuth: async (req, res) => {
      const { provider } = req.params;
      const state = Math.random().toString(36).substring(7);
      
      try {
          let authUrl;
          switch (provider) {
              case 'google':
                  authUrl = googleAuthService.getAuthUrl(state);
                  break;
              // case 'spotify':
              //     authUrl = spotifyAuthService.getAuthUrl(state);
              //     break;
              case 'github':
                  authUrl = githubAuthService.getAuthUrl(state);
                  break;
              // case 'discord':
              //     authUrl = discordAuthService.getAuthUrl(state);
              //     break;
              // case 'twitter':
              //     authUrl = twitterAuthService.getAuthUrl(state);
              //     break;
              default:
                  return res.status(400).json({ message: 'Provider not supported' });
          }
          req.session.oauthState = state;
          res.redirect(authUrl);
      } catch (error) {
          console.error(`${provider} auth initiation error:`, error);
          res.status(500).json({ message: 'Authentication failed' });
      }
  },

  handleOAuthCallback: async (req, res) => {
      const { provider } = req.params;
      const { code, state } = req.query;
      const isMobile = req.headers['user-agent']?.includes('Mobile') || 
                      req.headers['user-agent']?.includes('Android');
      if (state !== req.session.oauthState) {
          return res.status(400).json({ message: 'Invalid state parameter' });
      }
      try {
          let user;
          switch (provider) {
              case 'google':
                  user = await googleAuthService.handleCallback(code);
                  break;
              case 'spotify':
                  user = await spotifyAuthService.handleCallback(code);
                  break;
              case 'github':
                  user = await githubAuthService.handleCallback(code);
                  break;
              case 'discord':
                  user = await discordAuthService.handleCallback(code);
                  break;
              case 'twitter':
                  user = await twitterAuthService.handleCallback(code, state);
                  break;
              default:
                  return res.status(400).json({ message: 'Provider not supported' });
          }
          const token = generateToken(user, provider);
          handleRedirect(res, token, isMobile);
      } catch (error) {
          console.error(`${provider} callback error:`, error);
          const redirectUrl = isMobile ? 
              'area://login?error=auth_failed' : 
              'http://localhost:3000/login?error=auth_failed';
          res.redirect(redirectUrl);
      }
  },

  // Deconnexion
  logout: async (req, res) => {
      try {
          req.session.destroy();
          res.json({ message: 'Logged out successfully' });
      } catch (error) {
          res.status(500).json({ message: 'Logout failed' });
      }
  }
};

module.exports = authController; 