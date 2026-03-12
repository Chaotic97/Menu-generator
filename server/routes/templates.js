import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List all templates
router.get('/', (req, res, next) => {
  try {
    const templates = db.prepare(
      'SELECT id, name, description, category, preview_colors, is_builtin FROM templates ORDER BY category, name'
    ).all();
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

// Get full template
router.get('/:id', (req, res, next) => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// Create custom template
router.post('/', (req, res) => {
  const { id, name, description, category, theme_config, starter_sections, preview_colors } = req.body;

  if (!id || !name || !description || !category || !theme_config || !preview_colors) {
    return res.status(400).json({ error: 'Missing required fields: id, name, description, category, theme_config, preview_colors' });
  }

  try {
    db.prepare(`
      INSERT INTO templates (id, name, description, category, theme_config, starter_sections, preview_colors, is_builtin)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      name,
      description,
      category,
      typeof theme_config === 'string' ? theme_config : JSON.stringify(theme_config),
      typeof starter_sections === 'string' ? starter_sections : JSON.stringify(starter_sections),
      typeof preview_colors === 'string' ? preview_colors : JSON.stringify(preview_colors)
    );

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
