import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List all menus
router.get('/', (req, res, next) => {
  try {
    const menus = db.prepare(
      'SELECT id, name, restaurant_name, theme_id, layout, page_size, updated_at FROM menus ORDER BY updated_at DESC'
    ).all();
    res.json(menus);
  } catch (err) {
    next(err);
  }
});

// Create menu
router.post('/', (req, res) => {
  const { name, restaurant_name = '', template_id } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (name.length > 200) {
    return res.status(400).json({ error: 'name must be at most 200 characters' });
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

        let starterSections;
        try {
          starterSections = JSON.parse(template.starter_sections || '[]');
        } catch {
          starterSections = [];
        }
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
    console.error('Menu creation error:', err);
    res.status(500).json({ error: 'Failed to create menu' });
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

    const { name, restaurant_name, subtitle, theme_id, layout, page_size, custom_overrides } = req.body;

    const VALID_PAGE_SIZES = ['letter', 'half', 'quarter', 'tall'];
    if (page_size !== undefined && !VALID_PAGE_SIZES.includes(page_size)) {
      return res.status(400).json({ error: `page_size must be one of: ${VALID_PAGE_SIZES.join(', ')}` });
    }

    // Validate string lengths
    if (name !== undefined && (typeof name !== 'string' || name.length > 200)) {
      return res.status(400).json({ error: 'name must be a string of at most 200 characters' });
    }
    if (restaurant_name !== undefined && (typeof restaurant_name !== 'string' || restaurant_name.length > 200)) {
      return res.status(400).json({ error: 'restaurant_name must be a string of at most 200 characters' });
    }
    if (subtitle !== undefined && (typeof subtitle !== 'string' || subtitle.length > 300)) {
      return res.status(400).json({ error: 'subtitle must be a string of at most 300 characters' });
    }

    // Validate custom_overrides is valid JSON if provided
    if (custom_overrides !== undefined && custom_overrides !== null) {
      if (typeof custom_overrides === 'string') {
        try { JSON.parse(custom_overrides); } catch {
          return res.status(400).json({ error: 'custom_overrides must be valid JSON' });
        }
      } else if (typeof custom_overrides !== 'object') {
        return res.status(400).json({ error: 'custom_overrides must be a JSON object or string' });
      }
    }

    // For custom_overrides: explicit null means "clear", undefined means "don't change"
    let overridesStr;
    if (custom_overrides === undefined) {
      overridesStr = undefined; // don't change
    } else if (custom_overrides === null) {
      overridesStr = null; // clear
    } else if (typeof custom_overrides === 'object') {
      overridesStr = JSON.stringify(custom_overrides);
    } else {
      overridesStr = custom_overrides; // already a string
    }

    // Use separate update for custom_overrides to handle null clearing
    db.prepare(`
      UPDATE menus
      SET name = COALESCE(?, name),
          restaurant_name = COALESCE(?, restaurant_name),
          subtitle = COALESCE(?, subtitle),
          theme_id = COALESCE(?, theme_id),
          layout = COALESCE(?, layout),
          page_size = COALESCE(?, page_size),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, restaurant_name, subtitle, theme_id, layout, page_size, req.params.id);

    if (custom_overrides !== undefined) {
      db.prepare('UPDATE menus SET custom_overrides = ? WHERE id = ?').run(overridesStr, req.params.id);
    }

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

  // Validate section and dish names
  for (const section of sections) {
    if (!section.name || typeof section.name !== 'string') {
      return res.status(400).json({ error: 'Each section must have a non-empty string name' });
    }
    if (section.name.length > 200) {
      return res.status(400).json({ error: `Section name too long (max 200 chars): "${section.name.slice(0, 30)}..."` });
    }
    if (Array.isArray(section.dishes)) {
      for (const dish of section.dishes) {
        if (!dish.name || typeof dish.name !== 'string') {
          return res.status(400).json({ error: 'Each item must have a non-empty string name' });
        }
        if (dish.name.length > 200) {
          return res.status(400).json({ error: `Item name too long (max 200 chars): "${dish.name.slice(0, 30)}..."` });
        }
        if (dish.description && dish.description.length > 1000) {
          return res.status(400).json({ error: `Item description too long (max 1000 chars) for "${dish.name.slice(0, 30)}"` });
        }
        if (dish.price && String(dish.price).length > 20) {
          return res.status(400).json({ error: `Item price too long (max 20 chars) for "${dish.name.slice(0, 30)}"` });
        }
      }
    }
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

    // Auto-save dishes to library
    const upsertLibrary = db.prepare(`
      INSERT INTO dish_library (name, price, description)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        price = excluded.price, description = excluded.description,
        updated_at = datetime('now')
    `);
    for (const section of sections) {
      for (const dish of (section.dishes || [])) {
        if (dish.name && dish.name.trim() !== '' && dish.name !== 'New Dish') {
          upsertLibrary.run(dish.name.trim(), dish.price || '', dish.description || '');
        }
      }
    }

    return resultSections;
  });

  try {
    const result = bulkUpdate();
    const updatedMenu = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    res.json({ ...updatedMenu, sections: result });
  } catch (err) {
    console.error('Sections update error:', err);
    res.status(500).json({ error: 'Failed to update sections' });
  }
});

// Duplicate menu with all sections and dishes
router.post('/:id/duplicate', (req, res, next) => {
  try {
    const source = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const duplicate = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO menus (name, restaurant_name, subtitle, theme_id, layout, page_size, custom_overrides) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        `${source.name} (copy)`,
        source.restaurant_name,
        source.subtitle,
        source.theme_id,
        source.layout,
        source.page_size,
        source.custom_overrides
      );
      const newMenuId = result.lastInsertRowid;

      const sections = db.prepare(
        'SELECT * FROM menu_sections WHERE menu_id = ? ORDER BY sort_order'
      ).all(source.id);

      const insertSection = db.prepare(
        'INSERT INTO menu_sections (menu_id, name, sort_order) VALUES (?, ?, ?)'
      );
      const insertDish = db.prepare(
        'INSERT INTO menu_dishes (section_id, name, description, price, sort_order, platestack_dish_id) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const getDishes = db.prepare(
        'SELECT * FROM menu_dishes WHERE section_id = ? ORDER BY sort_order'
      );

      const newSections = [];
      for (const section of sections) {
        const secResult = insertSection.run(newMenuId, section.name, section.sort_order);
        const newSectionId = secResult.lastInsertRowid;
        const dishes = getDishes.all(section.id);
        const newDishes = [];
        for (const dish of dishes) {
          const dishResult = insertDish.run(
            newSectionId, dish.name, dish.description, dish.price, dish.sort_order, dish.platestack_dish_id
          );
          newDishes.push({
            id: dishResult.lastInsertRowid,
            section_id: newSectionId,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            sort_order: dish.sort_order,
            platestack_dish_id: dish.platestack_dish_id,
          });
        }
        newSections.push({
          id: newSectionId,
          menu_id: Number(newMenuId),
          name: section.name,
          sort_order: section.sort_order,
          dishes: newDishes,
        });
      }

      const newMenu = db.prepare('SELECT * FROM menus WHERE id = ?').get(newMenuId);
      return { ...newMenu, sections: newSections };
    });

    res.status(201).json(duplicate());
  } catch (err) {
    next(err);
  }
});

export default router;
