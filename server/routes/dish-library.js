import { Router } from 'express';
import multer from 'multer';
import db from '../db.js';
import { parseCSV, parseDOCX, parsePlainText } from '../services/dish-parser.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, DOCX, and TXT files are allowed'));
    }
  },
});

// Search dish library (autocomplete)
router.get('/', (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const dishes = db.prepare(
      `SELECT id, name, price, description FROM dish_library
       WHERE name LIKE ? COLLATE NOCASE
       ORDER BY name COLLATE NOCASE
       LIMIT 10`
    ).all(`${q}%`);
    res.json(dishes);
  } catch (err) {
    next(err);
  }
});

// Upsert single dish
router.post('/', (req, res, next) => {
  try {
    const { name, price = '', description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = db.prepare(`
      INSERT INTO dish_library (name, price, description)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        price = excluded.price,
        description = excluded.description,
        updated_at = datetime('now')
    `).run(name.trim(), price, description);

    const dish = db.prepare('SELECT * FROM dish_library WHERE rowid = ?').get(result.lastInsertRowid || result.changes);
    res.json(dish || { name: name.trim(), price, description });
  } catch (err) {
    next(err);
  }
});

// Import dishes (file upload or text body)
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    let dishes = [];

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'csv' || req.file.mimetype === 'text/csv') {
        dishes = parseCSV(req.file.buffer.toString('utf-8'));
      } else if (ext === 'docx') {
        dishes = await parseDOCX(req.file.buffer);
      } else {
        dishes = parsePlainText(req.file.buffer.toString('utf-8'));
      }
    } else if (req.body.dishes && Array.isArray(req.body.dishes)) {
      // Direct JSON array of {name, price, description}
      dishes = req.body.dishes.filter((d) => d.name && d.name.trim());
    } else if (req.body.text) {
      const format = (req.body.format || 'text').toLowerCase();
      if (format === 'json') {
        try {
          dishes = JSON.parse(req.body.text).filter((d) => d.name && d.name.trim());
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      } else if (format === 'csv') {
        dishes = parseCSV(req.body.text);
      } else {
        dishes = parsePlainText(req.body.text);
      }
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    // Return parsed dishes for preview (don't auto-save)
    if (req.body.preview === 'true' || req.query.preview === 'true') {
      return res.json({ dishes });
    }

    // Upsert all dishes into library
    const upsert = db.prepare(`
      INSERT INTO dish_library (name, price, description)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        price = excluded.price,
        description = excluded.description,
        updated_at = datetime('now')
    `);

    const upsertAll = db.transaction((items) => {
      let count = 0;
      for (const d of items) {
        if (d.name && d.name.trim()) {
          upsert.run(d.name.trim(), d.price || '', d.description || '');
          count++;
        }
      }
      return count;
    });

    const count = upsertAll(dishes);
    res.json({ imported: count, dishes });
  } catch (err) {
    next(err);
  }
});

// Delete dish from library
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM dish_library WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
