const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require("express-session");
const connectDB = require('./config/database');
const swaggerJSdoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();

app.use(express.json());

app.use(helmet());

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://10.50.15.119:8081',
            'area://',
            undefined // Pour les requêtes directes (comme Postman)
        ];
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true
};
  
app.use(cors(corsOptions));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_jwt_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// Routes
const authRouter = require("./routes/auth");
const userRouter = require('./routes/user');
const serviceRouter = require("./routes/service");
const automationRoutes = require('./routes/automation');
const googleWebhookRouter = require('./routes/webhooks/google');
const githubWebhookRouter = require('./routes/webhooks/github');

// Public routes
app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use('/webhooks/google', googleWebhookRouter);
app.use('/webhooks/github', githubWebhookRouter);

app.use('/', authRouter);
app.use('/', userRouter);
app.use('/', serviceRouter);
app.use('/', automationRoutes);

// Swagger Documentation
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpecs));

// Connect to the database
connectDB();

module.exports = app;
