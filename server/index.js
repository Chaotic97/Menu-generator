import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './db.js';
import { seedTemplates } from './seed-templates.js';
import menusRouter from './routes/menus.js';
import templatesRouter from './routes/templates.js';
import exportRouter from './routes/export.js';
import platestackRouter from './routes/platestack.js';
import dishLibraryRouter from './routes/dish-library.js';
import { closeBrowser } from './services/pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // CSP breaks inline styles used by menu preview
}));

// Request logging
app.use(morgan('short'));

// CORS — restrict in production
const corsOrigin = process.env.CORS_ORIGIN || '*';
if (corsOrigin === '*') {
  console.warn('WARNING: CORS_ORIGIN is not set — accepting requests from any origin. Set CORS_ORIGIN in production.');
}
app.use(cors({ origin: corsOrigin }));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Stricter limit for PDF export (resource-heavy)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many export requests, please try again later' },
});

// Optional bearer token auth (set API_TOKEN env var to enable)
const apiToken = process.env.API_TOKEN;
if (apiToken) {
  app.use('/api', (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${apiToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
} else {
  console.warn('WARNING: API_TOKEN is not set — API endpoints are unauthenticated. Set API_TOKEN in production.');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Higher limit for autosave endpoint (fires frequently during editing)
const autosaveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Apply appropriate rate limit per menus sub-route
const menusLimiter = (req, res, next) => {
  if (req.method === 'PUT' && /^\/\d+\/sections$/.test(req.path)) {
    return autosaveLimiter(req, res, next);
  }
  return apiLimiter(req, res, next);
};

// API routes
app.use('/api/menus', menusLimiter, menusRouter);
app.use('/api/templates', apiLimiter, templatesRouter);
app.use('/api/export', exportLimiter, exportRouter);
app.use('/api/platestack', apiLimiter, platestackRouter);
app.use('/api/dish-library', apiLimiter, dishLibraryRouter);

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Process-level error handlers
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down...');
  await closeBrowser();
  db.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Seed templates and start
await seedTemplates(db);
app.listen(PORT, () => {
  console.log(`MenuForge server running on port ${PORT}`);
});
