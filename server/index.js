import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './db.js';
import { seedTemplates } from './seed-templates.js';
import menusRouter from './routes/menus.js';
import templatesRouter from './routes/templates.js';
import exportRouter from './routes/export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/menus', menusRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/export', exportRouter);

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Seed templates and start
await seedTemplates(db);
app.listen(PORT, () => {
  console.log(`MenuForge server running on port ${PORT}`);
});
