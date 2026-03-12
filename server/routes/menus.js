import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List all menus
router.get('/', (req, res, next) => {
  try {
    const menus = db.prepare(
      'SELECT id, name, restaurant_name, theme_id, layout, updated_at FROM menus ORDER BY updated_at DESC'
    ).all();
    res.json(menus);
  } catch (err) {
    next(err);
  }
});

// Create menu
router.post('/', (req, res) => {
  const { name, restaurant_name = '', template_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const createMenu = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO menus (name, restaurant_name) VALUES (?, ?)'
    ).run(name, restaurant_name);

    const menuId = result.lastInsertRowid;
    let sections = [];

    if (template_id) {
      const template = db.prepare('SELECT starter_sections, theme_config FROM templates WHERE id = ?').get(template_id);
      if (template) {
        // Apply template's theme_id
        db.prepare('UPDATE menus SET theme_id = ? WHERE id = ?').run(template_id, menuId);

        const starterSections = JSON.parse(template.starter_sections || '[]');
        const insertSection = db.prepare(
          'INSERT INTO menu_sections (menu_id, name, sort_order) VALUES (?, ?, ?)'
        );
        for (let i = 0; i < starterSections.length; i++) {
          const sectionResult = insertSection.run(menuId, starterSections[i], i);
          sections.push({
            id: sectionResult.lastInsertRowid,
            menu_id: menuId,
            name: starterSections[i],
            sort_order: i,
            dishes: [],
          });
        }
      }
    }

    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId);
    return { ...menu, sections };
  });

  try {
    const menu = createMenu();
    res.status(201).json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get full menu with sections and dishes
router.get('/:id', (req, res, next) => {
  try {
    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const sections = db.prepare(
      'SELECT * FROM menu_sections WHERE menu_id = ? ORDER BY sort_order'
    ).all(menu.id);

    const dishesStmt = db.prepare(
      'SELECT * FROM menu_dishes WHERE section_id = ? ORDER BY sort_order'
    );

    const sectionsWithDishes = sections.map((section) => ({
      ...section,
      dishes: dishesStmt.all(section.id),
    }));

    res.json({ ...menu, sections: sectionsWithDishes });
  } catch (err) {
    next(err);
  }
});

// Update menu metadata
router.put('/:id', (req, res, next) => {
  try {
    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const { name, restaurant_name, subtitle, theme_id, layout, custom_overrides } = req.body;

    db.prepare(`
      UPDATE menus
      SET name = COALESCE(?, name),
          restaurant_name = COALESCE(?, restaurant_name),
          subtitle = COALESCE(?, subtitle),
          theme_id = COALESCE(?, theme_id),
          layout = COALESCE(?, layout),
          custom_overrides = COALESCE(?, custom_overrides),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, restaurant_name, subtitle, theme_id, layout, custom_overrides, req.params.id);

    const updated = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete menu
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM menus WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Bulk update sections + dishes (autosave endpoint)
router.put('/:id/sections', (req, res) => {
  const menu = db.prepare('SELECT id FROM menus WHERE id = ?').get(req.params.id);
  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  const { sections } = req.body;
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'sections must be an array' });
  }

  const bulkUpdate = db.transaction(() => {
    // Delete all existing sections (dishes cascade)
    db.prepare('DELETE FROM menu_sections WHERE menu_id = ?').run(req.params.id);

    const insertSection = db.prepare(
      'INSERT INTO menu_sections (menu_id, name, sort_order) VALUES (?, ?, ?)'
    );
    const insertDish = db.prepare(
      'INSERT INTO menu_dishes (section_id, name, description, price, sort_order, platestack_dish_id) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const resultSections = [];

    for (const section of sections) {
      const sectionResult = insertSection.run(req.params.id, section.name, section.sort_order ?? 0);
      const sectionId = sectionResult.lastInsertRowid;

      const dishes = [];
      if (Array.isArray(section.dishes)) {
        for (const dish of section.dishes) {
          const dishResult = insertDish.run(
            sectionId,
            dish.name,
            dish.description ?? '',
            dish.price ?? '0',
            dish.sort_order ?? 0,
            dish.platestack_dish_id ?? null
          );
          dishes.push({
            id: dishResult.lastInsertRowid,
            section_id: sectionId,
            name: dish.name,
            description: dish.description ?? '',
            price: dish.price ?? '0',
            sort_order: dish.sort_order ?? 0,
            platestack_dish_id: dish.platestack_dish_id ?? null,
          });
        }
      }

      resultSections.push({
        id: sectionId,
        menu_id: Number(req.params.id),
        name: section.name,
        sort_order: section.sort_order ?? 0,
        dishes,
      });
    }

    // Update menu's updated_at
    db.prepare("UPDATE menus SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    return resultSections;
  });

  try {
    const result = bulkUpdate();
    res.json({ sections: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
