import { Router } from 'express';
import db from '../db.js';
import { generatePdf } from '../services/pdf.js';
import mergeTemplate from '../utils/mergeTemplate.js';

const router = Router();

// PDF export
router.post('/:id/pdf', async (req, res) => {
  try {
    const { pageSize, bleed } = req.body || {};

    // Fetch menu with sections and dishes
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

    const fullMenu = { ...menu, sections: sectionsWithDishes };

    // Fetch template config
    const templateRow = db.prepare('SELECT theme_config FROM templates WHERE id = ?').get(menu.theme_id);
    if (!templateRow) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let template;
    try {
      template = JSON.parse(templateRow.theme_config);
    } catch {
      console.error(`Corrupt theme_config for template "${menu.theme_id}"`);
      return res.status(500).json({ error: 'Template configuration is corrupt' });
    }

    // Apply custom overrides if present
    if (menu.custom_overrides) {
      try {
        const overrides = JSON.parse(menu.custom_overrides);
        template = mergeTemplate(template, overrides);
      } catch {
        // Ignore corrupt overrides, use base template
      }
    }

    // Generate PDF
    const pdfBuffer = await generatePdf(fullMenu, template, {
      pageSize: pageSize || 'half',
      bleed: !!bleed,
    });

    const filename = `${(menu.restaurant_name || menu.name || 'menu').replace(/[^a-zA-Z0-9-_ ]/g, '')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
