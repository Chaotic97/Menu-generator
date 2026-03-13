# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run install:all` — install all dependencies (root + client + server)
- `npm run dev` — starts Vite dev server (port 5173) + Express API (port 3001) concurrently
- `npm run build` — production build (client only, outputs to `client/dist/`)
- `npm start` — production server (serves built frontend + API)

## Architecture

Restaurant menu design web app. React 18 + Vite frontend, Express + SQLite backend.

- `/client` — React SPA. Vite proxies `/api/*` to Express in dev.
- `/server` — Express API. SQLite via better-sqlite3, Puppeteer for PDF.
- `/client/src/templates/` — Template config files. Auto-discovered via `import.meta.glob()` in `index.js`.

### The Template System
Templates are self-contained JS config objects that drive ALL rendering. Each template defines colors, fonts (with Google Fonts import strings), sizes, spacing, typography rules, divider styles, header decorations, dot leaders, and borders. To add a template: drop a `.js` file in `/client/src/templates/` matching the schema — no other code changes needed.

Templates are shipped at build time (static imports). The server stores them as JSON in the `templates` table for PDF export access.

### MenuPreview: Dual-Purpose Renderer
`<MenuPreview>` is the single source of truth for menu layout. It renders identically in the browser (edit mode) and in Puppeteer (PDF export).

- **`interactive` mode**: Wraps content in dnd-kit `DndContext` + `SortableContext`. Drag handles on hover, `EditableText` wrappers for click-to-edit.
- **Non-interactive mode**: Pure read-only rendering. No drag handles, no editable wrappers. Used for PDF export.
- **All styles are inline**, derived from the template config object. No Tailwind, no CSS modules. This is load-bearing — it's what makes browser/Puppeteer parity work.

Layout Engine rules in MenuPreview: price column alignment (flexbox), text clamping (1-line names, 2-line descriptions), column balancing (greedy height estimation), empty state handling, title auto-scaling, price format normalization.

### PDF Export: Server-Side HTML Replication
`server/services/pdf.js` builds standalone HTML that replicates MenuPreview's layout logic. It is NOT React SSR — it's string-templated HTML using the same template config. The `formatPrice()`, `balanceColumns()`, divider/decoration rendering, and all spacing logic must stay in sync with the client-side MenuPreview.

**When changing MenuPreview layout, update `pdf.js` to match.**

### Drag-and-Drop
Two-level nesting with @dnd-kit: sections are top-level sortables, dishes are nested sortables within sections. Cross-section dish moves supported. PointerSensor with 5px activation distance prevents drag/edit conflicts. Drag overlay uses static (non-interactive) component variants.

### Autosave
`useAutosave` hook: 800ms debounce for text edits, immediate save for DnD reorders. Save status indicator: idle → saving → saved (auto-clears after 2s).

### PlateStack Integration
Optional. Set `PLATESTACK_DB_PATH` env var to a PlateStack SQLite DB. Read-only connection for dish import. Gracefully disabled when not configured.

## Database
SQLite at `./data/menuforge.db` (auto-created on first run). Tables: `menus`, `menu_sections`, `menu_dishes`, `templates`. Schema in `server/db.js`. Bulk section/dish updates use `PUT /api/menus/:id/sections` which deletes and re-inserts within a transaction.

## Deployment (Google Compute Engine)

The app runs on a GCE VM with Nginx reverse proxy and PM2 process manager. SQLite works natively on the persistent disk.

- **VM**: `e2-small` (2 vCPU, 2GB RAM) on Debian/Ubuntu. ~$5-7/mo.
- **Scripts in `/deploy/`**:
  - `setup.sh` — first-time server setup (Node.js, Chromium, Nginx, PM2)
  - `deploy.sh` — pull latest code, build, restart PM2
  - `nginx.conf` — reverse proxy template (replace `YOUR_DOMAIN_OR_IP`)
- **Puppeteer**: System Chromium installed via apt. `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- **Data**: SQLite DB lives at `/opt/menuforge/data/menuforge.db` on the persistent boot disk.
- **Process manager**: PM2 keeps the app alive and restarts on crash/reboot.
- **SSL**: Use `certbot --nginx -d your-domain.com` for free Let's Encrypt HTTPS.

### Quick deploy
```bash
# On the VM:
sudo bash /opt/menuforge/app/deploy/deploy.sh
```

## Style Rules
- Menu preview (`MenuPreview`): inline styles from template config only. No Tailwind, no CSS modules. No hardcoded colors, fonts, or sizes.
- Editor UI (sidebar, controls): Tailwind utility classes.
- `EditableText` inputs must have transparent backgrounds inheriting template styles (critical for dark templates).
