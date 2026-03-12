# MenuForge

Restaurant menu design web app. React + Vite frontend, Express + SQLite backend.

## Commands
- `npm run install:all` — install all dependencies (root + client + server)
- `npm run dev` — starts Vite dev server + Express API concurrently
- `npm run build` — production build
- `npm start` — production server (serves built frontend)

## Architecture
- `/client` — React app (Vite). Menu editor UI with live preview.
- `/client/src/templates/` — Template config files. One JS file per template. Auto-discovered.
- `/server` — Express API. Menu CRUD, template management, PDF export.
- `/server/db.js` — SQLite via better-sqlite3. Migrations run on startup.
- `/server/services/pdf.js` — Puppeteer-based PDF generation (not yet implemented).

## Key patterns
- Templates are self-contained config objects in `/client/src/templates/`.
  They drive ALL rendering decisions. To add a new template: drop a .js file matching
  the schema into this directory. No other code changes needed.
- `<MenuPreview>` is the single source of truth for menu layout. It renders identically
  in the browser and in Puppeteer for PDF export. It uses inline styles only (no Tailwind).
- The Layout Engine rules are in MenuPreview: price column alignment,
  text clamping (1-line names, 2-line descriptions), column balancing, empty state
  handling, title auto-scaling, price format normalization.
- Editor UI (sidebar, controls): Tailwind utility classes.
- No component should hardcode colors, fonts, or sizes — always read from template config.

## Database
SQLite at `./data/menuforge.db`. Tables: menus, menu_sections, menu_dishes, templates.

## Style rules
- Menu preview: inline styles from template config. No Tailwind, no CSS modules.
- Editor UI (sidebar, controls): Tailwind utility classes are fine.
