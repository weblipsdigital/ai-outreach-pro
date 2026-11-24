import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from './utils/prisma.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { outreachScheduler } from './workers/scheduler.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Dynamic CORS configuration - fully supports Vercel, localhost, and custom frontend domains
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Dynamic permissive origin matching:
    // Echoes back the requesting origin so the browser never blocks cross-origin requests.
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limiting: 500 requests per minute per IP
app.use('/api', rateLimiter(60000, 500));

// Health check endpoints
const healthHandler = (req: any, res: any) => {
  res.json({
    status: 'healthy',
    name: 'AI Outreach Pro API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount Central API Routes
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandler);

// Ensure default admin users exist on startup
export async function ensureDefaultAdmin() {
  try {
    const defaultPassword = 'Admin@Outreach2026!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const emails = Array.from(
      new Set([
        'admin@aioutreachpro.local',
        'suraj.mchakghat@gmail.com',
        'support@weblipsdigital.in',
        process.env.ADMIN_EMAIL?.trim().toLowerCase(),
        process.env.AGENCY_EMAIL?.trim().toLowerCase(),
      ].filter(Boolean))
    ) as string[];

    for (const email of emails) {
      if (!email.includes('@')) continue;
      await prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: {
          email,
          name: email.split('@')[0],
          passwordHash,
          role: 'ADMIN',
        },
      });
      logger.info(`Admin ready: ${email}`);
    }
  } catch (err: any) {
    logger.error(`Error ensuring admin users: ${err.message}`);
  }
}

// Start background workers and listen
if (process.env.NODE_ENV !== 'test') {
  outreachScheduler.startAll();

  app.listen(PORT, async () => {
    logger.info(`AI Outreach Pro Backend running at http://localhost:${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || 'development'}`);
    await ensureDefaultAdmin();
  });
}

export default app;
