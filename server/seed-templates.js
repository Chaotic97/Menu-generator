import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function seedTemplates(db) {
  const templatesDir = path.join(__dirname, '..', 'client', 'src', 'templates');

  let files;
  try {
    files = fs.readdirSync(templatesDir).filter(
      (f) => f.endsWith('.js') && f !== 'index.js'
    );
  } catch (err) {
    console.warn('Could not read templates directory:', err.message);
    return;
  }

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO templates (id, name, description, category, theme_config, starter_sections, preview_colors, is_builtin)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const file of files) {
    try {
      const filePath = path.join(templatesDir, file);
      const fileUrl = pathToFileURL(filePath).href;
      const mod = await import(fileUrl);
      const template = mod.default;

      if (!template || !template.id) {
        console.warn(`Skipping ${file}: no valid default export with id`);
        continue;
      }

      upsert.run(
        template.id,
        template.name,
        template.description,
        template.category,
        JSON.stringify(template),
        JSON.stringify(template.starterSections || []),
        JSON.stringify(template.previewColors || [])
      );

      console.log(`Seeded template: ${template.id}`);
    } catch (err) {
      console.warn(`Failed to seed template from ${file}:`, err.message);
    }
  }
}
