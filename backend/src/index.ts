import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { outreachScheduler } from './workers/scheduler.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limiting: 500 requests per minute per IP
app.use('/api', rateLimiter(60000, 500));

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.json({
    status: 'healthy',
    name: 'AI Outreach Pro API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Central API Routes
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandler);

// Start background workers and listen
if (process.env.NODE_ENV !== 'test') {
  outreachScheduler.startAll();

  app.listen(PORT, () => {
    logger.info(`AI Outreach Pro Backend running at http://localhost:${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
