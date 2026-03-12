// PlateStack integration bridge
// Set PLATESTACK_DB_PATH environment variable to enable

import Database from 'better-sqlite3';

let psDb = null;

function getDb() {
  if (psDb) return psDb;
  const dbPath = process.env.PLATESTACK_DB_PATH;
  if (!dbPath) return null;
  try {
    psDb = new Database(dbPath, { readonly: true });
    return psDb;
  } catch {
    return null;
  }
}

export function isEnabled() {
  return !!process.env.PLATESTACK_DB_PATH;
}

export function getDishes() {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT d.id, d.name, d.description, d.price,
             GROUP_CONCAT(DISTINCT a.name) as allergens,
             GROUP_CONCAT(DISTINCT t.name) as tags
      FROM dishes d
      LEFT JOIN dish_ingredients di ON di.dish_id = d.id
      LEFT JOIN ingredients i ON i.id = di.ingredient_id
      LEFT JOIN ingredient_allergens ia ON ia.ingredient_id = i.id
      LEFT JOIN allergens a ON a.id = ia.allergen_id
      LEFT JOIN dish_tags dt ON dt.dish_id = d.id
      LEFT JOIN tags t ON t.id = dt.tag_id
      GROUP BY d.id
    `).all();
  } catch {
    return [];
  }
}

export function getDishesWithTag(tag) {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT d.id, d.name, d.description, d.price,
             GROUP_CONCAT(DISTINCT a.name) as allergens,
             GROUP_CONCAT(DISTINCT t.name) as tags
      FROM dishes d
      LEFT JOIN dish_ingredients di ON di.dish_id = d.id
      LEFT JOIN ingredients i ON i.id = di.ingredient_id
      LEFT JOIN ingredient_allergens ia ON ia.ingredient_id = i.id
      LEFT JOIN allergens a ON a.id = ia.allergen_id
      LEFT JOIN dish_tags dt ON dt.dish_id = d.id
      LEFT JOIN tags t ON t.id = dt.tag_id
      WHERE d.id IN (
        SELECT dt2.dish_id FROM dish_tags dt2
        JOIN tags t2 ON t2.id = dt2.tag_id
        WHERE t2.name = ?
      )
      GROUP BY d.id
    `).all(tag);
  } catch {
    return [];
  }
}

export function getTags() {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare('SELECT DISTINCT name FROM tags ORDER BY name').all().map(r => r.name);
  } catch {
    return [];
  }
}
