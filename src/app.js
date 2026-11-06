import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth-routes.js';
import { shopRouter } from './routes/shop-routes.js';
import { orderRouter } from './routes/order-routes.js';
import { ownerRouter } from './routes/owner-routes.js';
import { adminRouter } from './routes/admin-routes.js';
import { financeRouter } from './routes/finance-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, '../public');

export const app = express();

// Secure HTTP headers with content security policy configured for inline styles/scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : [env.CORS_ORIGIN, 'http://localhost:3000'],
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Structured request logging in development, compact in production
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Serve static frontend assets
app.use(express.static(publicPath));

// System Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Quesless Campus Backend',
    institution: env.CAMPUS_NAME,
    operating_hours: `${env.CANTEEN_OPEN_TIME} - ${env.CANTEEN_CLOSE_TIME} (${env.CANTEEN_TIMEZONE})`,
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// API v1 root information
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'Quesless Campus API',
      version: 'v1',
      institution: env.CAMPUS_NAME,
      documentation: '/api/v1/docs',
    },
    message: 'Welcome to Quesless Campus API v1',
  });
});

// Mount API routes
app.use('/api/v1', authRouter);
app.use('/api/v1', shopRouter);
app.use('/api/v1', orderRouter);
app.use('/api/v1', ownerRouter);
app.use('/api/v1', adminRouter);
app.use('/api/v1', financeRouter);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);
