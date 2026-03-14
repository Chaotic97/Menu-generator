import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'prixie.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    restaurant_name TEXT DEFAULT '',
    subtitle TEXT DEFAULT '',
    theme_id TEXT NOT NULL DEFAULT 'jade-palace',
    layout TEXT NOT NULL DEFAULT 'single',
    custom_overrides TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menu_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price TEXT NOT NULL DEFAULT '0',
    sort_order INTEGER NOT NULL DEFAULT 0,
    platestack_dish_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    theme_config TEXT NOT NULL,
    starter_sections TEXT,
    is_builtin INTEGER DEFAULT 1,
    preview_colors TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sections_menu ON menu_sections(menu_id);
  CREATE INDEX IF NOT EXISTS idx_dishes_section ON menu_dishes(section_id);
  CREATE INDEX IF NOT EXISTS idx_dishes_platestack ON menu_dishes(platestack_dish_id);
  CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

  CREATE TABLE IF NOT EXISTS dish_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_library_name
    ON dish_library(name COLLATE NOCASE);
`);

// Add page_size column if missing (migration)
try {
  db.exec(`ALTER TABLE menus ADD COLUMN page_size TEXT NOT NULL DEFAULT 'half'`);
} catch {
  // Column already exists
}

export default db;
