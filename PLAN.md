# MenuForge — Implementation Plan

## Progress

- [x] Phase 1: Core App Scaffold (steps 1-5)
- [x] Phase 2: Menu Editor UI (drag-and-drop, inline editing, autosave)
- [x] Phase 3: PDF Export (Puppeteer)
- [x] Phase 4: PlateStack Integration (dish import)
- [ ] Phase 5: Polish & Extended Features (allergen icons, QR code, etc.)

### What's Built (Phase 1)
- Project scaffold: React/Vite client + Express/SQLite server with separate package.jsons
- Database: SQLite with WAL mode, foreign keys, all tables + indexes, auto-migration on startup
- All 10 template configs in `/client/src/templates/`, auto-discovered and seeded into DB
- Full API: menu CRUD, bulk section/dish update, template list/get/create, export placeholder
- `<MenuPreview>` with layout engine: price alignment, text clamping, title auto-scale, column balancing, empty state handling, price normalization, all divider/header decoration styles, Google Fonts loading
- `<MenuEditor>` with sidebar (dishes + style tabs), template switching, layout toggle
- `<MenuListView>` homepage with create/delete
- `npm run dev` starts both servers concurrently

### What's Built (Phase 2)
- Drag-and-drop on preview via @dnd-kit: dish reorder within/across sections, section reorder via header drag
- Inline click-to-edit on preview: all text elements (dish name, price, description, section name, title, subtitle)
- Drag handles appear on hover (left edge), click-to-edit is separate (no drag/edit conflict)
- `<EditableText>` component: transparent-background input inheriting template styles
- Autosave with 800ms debounce via `useAutosave` hook, "Saving..."/"Saved" indicator
- Immediate save for drag-and-drop reorders, debounced save for text edits
- `mode="export"` strips all interactive chrome (no handles, no editable wrappers)

### What's Built (Phase 3)
- PDF export via Puppeteer (`server/services/pdf.js`)
- Static HTML template replicating MenuPreview layout (not React SSR)
- All divider styles, header decorations, dot leaders, two-col layout, borders
- Google Fonts loaded via `<link>`, waits for `document.fonts.ready`
- Page sizes: letter (8.5"x11"), half (5.5"x8.5"), bleed option
- "Export PDF" button in editor sidebar

### What's Built (Phase 4 - partial)
- PlateStack dish import service (`server/services/platestack.js`)
- Read-only connection to PlateStack's SQLite DB via `PLATESTACK_DB_PATH` env var
- API routes: `/api/platestack/status`, `/api/platestack/dishes`, `/api/platestack/tags`
- Import modal in editor: dishes grouped by tag, select all/individual, auto-creates sections
- Link icon on imported dishes in sidebar
- Graceful fallback when PlateStack is not configured

### What's Next
- Allergen icons on menu preview
- QR code web menu
- Duplicate menu, version history
- Custom template builder

---

## What This Is

A purpose-built web app for restaurant menu design. The core value proposition over Canva: every interaction defaults to a well-formatted menu. You type dishes, pick a theme, drag to reorder — the output is always print-ready. No fighting with alignment, font pairing, or element positioning.

Target user: restaurant operators (starting with PlateStack integration for Dylan's restaurant).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Frontend (React + Vite)                        │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Menu      │  │ Live       │  │ Theme      │ │
│  │ Editor    │  │ Preview    │  │ Engine     │ │
│  │ (sidebar) │  │ (canvas)   │  │ (configs)  │ │
│  └───────────┘  └────────────┘  └────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────┐
│  Backend (Node.js + Express)                    │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Menu CRUD │  │ PDF Export │  │ PlateStack │ │
│  │ API       │  │ (Puppeteer)│  │ Bridge     │ │
│  └───────────┘  └────────────┘  └────────────┘ │
│                       │                         │
│              ┌────────┴────────┐                │
│              │  SQLite (menus, │                │
│              │  dishes, themes)│                │
│              └─────────────────┘                │
└─────────────────────────────────────────────────┘
```

**Stack**: React 18 (Vite), Node.js/Express, SQLite (via better-sqlite3), Puppeteer for PDF.

This mirrors PlateStack's stack intentionally — same patterns, easy to merge later.

---

## Database Schema

```sql
-- Saved menus
CREATE TABLE menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  restaurant_name TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  theme_id TEXT NOT NULL DEFAULT 'jade-palace',
  layout TEXT NOT NULL DEFAULT 'single', -- 'single' | 'two-col'
  custom_overrides TEXT, -- JSON partial override of theme (nullable)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Menu sections (e.g. "Appetizers", "Entrées")
CREATE TABLE menu_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Individual dishes within sections
CREATE TABLE menu_dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price TEXT NOT NULL DEFAULT '0', -- TEXT to support "MP", "AQ", seasonal notation
  sort_order INTEGER NOT NULL DEFAULT 0,
  platestack_dish_id INTEGER -- nullable FK for PlateStack integration
);

-- Templates: visual theme + starter content structure
-- Each template is a single JSON file in /client/src/templates/
-- This table caches them for API access and tracks custom user templates
CREATE TABLE templates (
  id TEXT PRIMARY KEY,           -- 'jade-palace', 'ink-steam', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,        -- 'asian', 'modern', 'fusion', 'custom'
  theme_config TEXT NOT NULL,    -- full JSON theme config (colors, fonts, spacing, layout)
  starter_sections TEXT,         -- JSON array of section names for new menu scaffolding
  is_builtin INTEGER DEFAULT 1, -- 0 for user-created templates
  preview_colors TEXT NOT NULL,  -- JSON array of 3 hex colors for thumbnail swatch
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sections_menu ON menu_sections(menu_id);
CREATE INDEX idx_dishes_section ON menu_dishes(section_id);
CREATE INDEX idx_dishes_platestack ON menu_dishes(platestack_dish_id);
CREATE INDEX idx_templates_category ON templates(category);
```

---

## Implementation Phases

### Phase 1: Core App Scaffold

**Goal**: Standing web app with React frontend, Express backend, SQLite, basic project structure.

#### Tasks

1. **Initialize project**
   ```
   menuforge/
   ├── client/              # React (Vite)
   │   ├── src/
   │   │   ├── components/  # React components
   │   │   ├── templates/   # Template config files (one per .js file, auto-discovered)
   │   │   ├── hooks/       # Custom hooks
   │   │   ├── api/         # API client functions
   │   │   └── App.jsx
   │   ├── index.html
   │   └── vite.config.js
   ├── server/
   │   ├── index.js         # Express entry
   │   ├── db.js            # SQLite setup + migrations
   │   ├── routes/
   │   │   ├── menus.js     # CRUD for menus
   │   │   ├── templates.js # Template endpoints
   │   │   └── export.js    # PDF export
   │   └── services/
   │       ├── pdf.js       # Puppeteer rendering
   │       └── platestack.js # PlateStack bridge (Phase 4)
   ├── package.json
   └── CLAUDE.md
   ```

2. **Express server** with SQLite via better-sqlite3. Run migrations on startup. Serve the Vite build in production. In dev, Vite dev server proxies API calls to Express.

3. **Vite + React** scaffold with Tailwind CSS for the editor UI (sidebar, controls). The menu preview itself uses inline styles driven by theme configs — not Tailwind — because the preview must render identically in Puppeteer for PDF export.

4. **API routes**:
   - `GET /api/menus` — list saved menus
   - `POST /api/menus` — create menu (accepts `template_id`, scaffolds starter sections)
   - `GET /api/menus/:id` — full menu with sections + dishes
   - `PUT /api/menus/:id` — update menu metadata
   - `DELETE /api/menus/:id` — delete menu
   - `PUT /api/menus/:id/sections` — bulk update sections + dishes (reorder, add, remove)
   - `GET /api/templates` — list all templates (built-in + custom)
   - `GET /api/templates/:id` — full template config
   - `POST /api/templates` — save custom template
   - `POST /api/export/:id/pdf` — generate and return PDF

5. **Seed 10 built-in templates** into the templates table on first run. Template configs are JSON files in `/client/src/templates/` — see Template Library section below. Each contains the full theme config plus starter section names.

#### Acceptance criteria
- `npm run dev` starts both Vite and Express
- Can create a menu, add sections/dishes via API, retrieve the full menu
- All 10 templates seeded and retrievable via `GET /api/templates`
- React app renders with placeholder UI

---

### Phase 2: Menu Editor UI

**Goal**: Full drag-and-drop editor with live preview, inline editing, theme switching.

#### Components

```
<App>
  <MenuListView />          # Homepage: list saved menus, create new
  <MenuEditor>              # Main editor layout (route: /menus/:id)
    <EditorSidebar>         # Left panel — add/remove/manage (not reorder)
      <MenuMetaForm />      # Restaurant name, subtitle
      <TabSwitcher />       # "Dishes" | "Style" tabs
      <DishesTab>
        <SectionBlock>      # Per-section: dish list (read-only order), add/remove
          <DishListItem />  # Non-draggable — shows name + price + delete button
          <AddDishForm />   # Inline add form
        </SectionBlock>
        <AddSectionButton />
      </DishesTab>
      <StyleTab>
        <TemplateGrid />    # Template selector with color swatch thumbnails
        <LayoutToggle />    # Single / two-column
        <SubtitleInput />
      </StyleTab>
    </EditorSidebar>
    <PreviewCanvas>         # Right panel — the rendered menu IS the editor
      <MenuPreview>         # The actual menu layout
        <DraggableDish />   # Each dish is draggable within/across sections
        <DraggableSection/> # Sections themselves are reorderable
        <Editable />        # Click-to-edit on all text elements
        <DropZone />        # Visual drop indicators between dishes
      </MenuPreview>
    </PreviewCanvas>
  </MenuEditor>
</App>
```

#### Key behaviors

1. **Drag and drop on the preview itself** — Dishes are draggable directly on the rendered menu. Hover over a dish on the preview and a subtle drag handle appears (left edge). Drag to reorder within a section or move across sections. Drop zones render as thin accent-colored lines between dishes during drag. Sections are also reorderable by dragging section headers.

   **Implementation**: Use `@dnd-kit/core` + `@dnd-kit/sortable` instead of HTML5 drag API. HTML5 drag conflicts with inline editing (both need click events on the same elements) and doesn't support the visual polish needed — custom drag overlays, smooth animations, accessible keyboard reorder. dnd-kit handles all of this and supports nested sortable contexts (dishes within sections, sections within the menu).

   **Interaction states on preview**:
   - **Default**: Menu looks exactly like the final print output. No handles, no outlines.
   - **Hover on dish**: Subtle drag handle fades in on the left edge. Light highlight on the dish row.
   - **Dragging**: The dish lifts with a slight scale + shadow (drag overlay). A colored insertion line appears at valid drop positions. Other dishes shift to make room with smooth animation.
   - **Hover on section header**: Drag handle appears. Sections can be reordered by dragging the header.
   - **Click on any text**: Enters inline edit mode (same as before).

   The sidebar dish list mirrors the current order (read-only) so you can see the structure at a glance, but all reordering happens on the preview.

2. **Inline editing on preview** — Click any text element on the rendered menu preview (dish name, price, description, title, subtitle) to edit in-place. This is the core UX differentiator. Implementation: each text element renders as a `<span>` that switches to an `<input>` on click, commits on blur/Enter, reverts on Escape. The `@dnd-kit` drag handle is separate from the text area, so click-to-edit and drag don't conflict.

3. **Autosave** — Debounced save (800ms after last change) via `PUT /api/menus/:id/sections`. Show a subtle "Saving..." / "Saved" indicator. All state lives in React; API is the persistence layer, not the source of truth during editing.

4. **Template switching** — Instant. All visual properties are inline styles derived from the template config object. No server round-trip needed. Template selection saved to menu record. Switching templates preserves all dish data — only the visual presentation changes.

5. **Responsive preview** — The preview panel scrolls independently. The menu itself is a fixed-width element (500px single-col, 660px two-col) centered on a dot-grid background to reinforce the "design canvas" metaphor.

#### Acceptance criteria
- Can create a menu from the homepage, enter the editor
- Drag dishes directly on the menu preview to reorder within and across sections
- Drag section headers to reorder sections
- Hover states on preview: drag handles appear without disrupting the menu's visual design
- Click-to-edit on preview works for all text elements (no conflict with drag)
- Template switching is instant and total
- Two-column layout toggle works
- Sidebar dish list reflects current order but does not handle reordering

---

### Phase 3: PDF Export

**Goal**: Print-ready PDF output that exactly matches the preview.

#### Architecture

The PDF export renders the exact same React `<MenuPreview>` component server-side using Puppeteer. This is critical — the preview IS the PDF. No separate PDF template to maintain.

#### Implementation

1. **Puppeteer service** (`server/services/pdf.js`):
   - Maintain a single Puppeteer browser instance (launch on server start, reuse).
   - On export request: render an HTML page containing the `<MenuPreview>` component with the menu's data and theme, injecting Google Fonts via `<link>` tags. Wait for fonts to load.
   - Use `page.pdf()` with exact dimensions matching the preview (single: 500px wide, two-col: 660px wide, height: auto based on content).
   - Return the PDF buffer.

2. **Export HTML template** (`server/templates/export.html`):
   - A standalone HTML file that imports the `MenuPreview` component's styles (extracted as a static CSS file or inlined).
   - Receives menu data as a JSON blob injected into a `<script>` tag.
   - Renders the menu layout using the same CSS/structure as the React component.
   - **Important**: This is NOT React SSR. It's a static HTML template that replicates the preview's layout using the same theme configs. This avoids the complexity of server-side React rendering. The theme config objects contain all the information needed to render: fonts, sizes, colors, spacing, divider styles.

3. **Export endpoint** (`POST /api/export/:id/pdf`):
   - Fetch menu data from DB
   - Render HTML template with data + theme config
   - Pass to Puppeteer
   - Return `Content-Type: application/pdf`

4. **Print options**:
   - Standard (8.5" x 11" letter)
   - Half-page (5.5" x 8.5" — common for single-fold menus)
   - Custom dimensions (for laminated table menus, etc.)
   - Bleed option: adds 0.125" bleed area for professional printing

5. **Font handling**: Google Fonts loaded via `<link>` in the export template. Puppeteer waits for `document.fonts.ready` before generating PDF. Fallback: if a font fails to load, the template config specifies system font fallbacks in the font-family stack.

#### Acceptance criteria
- "Export PDF" button in editor generates a downloadable PDF
- PDF matches the preview exactly (fonts, spacing, colors, layout)
- Two-column menus export correctly
- All 4 dark templates (Jade Palace, Neon District, Wok & Fire, Midnight Market) export with correct background colors filling to page edges
- Run the Print Fidelity Checklist (see Layout Engine section) against all 10 templates

---

### Phase 4: PlateStack Integration

**Goal**: Pull dishes directly from PlateStack's database. Allergen indicators from Big 9 data.

#### Approach

Two integration paths depending on deployment:

**Option A — Shared SQLite (same server)**:
MenuForge reads PlateStack's SQLite DB directly (read-only connection). Simplest if both apps run on the same machine.

```javascript
// server/services/platestack.js
const platestack = require('better-sqlite3')('/path/to/platestack.db', { readonly: true });

function getDishes() {
  return platestack.prepare(`
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
}
```

**Option B — API bridge (separate servers)**:
MenuForge calls PlateStack's API. Requires adding a read endpoint to PlateStack.

```
GET /api/platestack/dishes         — all dishes with allergens and tags
GET /api/platestack/dishes?tag=X   — filtered by tag
GET /api/platestack/tags           — all tags (for section auto-grouping)
```

#### Features

1. **Import from PlateStack** — "Import dishes" button in the editor opens a modal showing PlateStack dishes. Select dishes to add to the current menu. Auto-groups by tag into sections (e.g., all dishes tagged "appetizer" go into an "Appetizers" section).

2. **Sync indicator** — Dishes imported from PlateStack show a link icon. If the PlateStack dish is updated (name, description, price), the menu dish shows a "sync available" indicator. User chooses to accept or keep the menu version.

3. **Allergen icons** — Dishes with allergen data show small icons on the menu preview. Icons for the FDA Big 9: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame. Rendered as small SVG icons next to the dish description. Can be toggled on/off per menu.

4. **Section auto-population from tags** — When creating a new menu, offer "Auto-populate from PlateStack" which creates sections from tag categories and fills them with matching dishes.

#### Acceptance criteria
- Can import dishes from PlateStack into a menu
- Allergen icons render correctly on preview and PDF
- Tag-based auto-grouping creates reasonable menu sections
- Changes in PlateStack dishes surface as syncable updates

---

### Phase 5: Polish & Extended Features

**Goal**: Features that make it genuinely better than Canva for this use case.

1. **Duplicate menu** — Copy an existing menu to create a variant (lunch vs dinner, seasonal update).

2. **Version history** — Keep last 10 saves. "Revert to previous version" in the editor.

3. **QR code menu** — Generate a shareable URL that renders the menu as a responsive web page (no PDF needed). Uses `<MenuPreview mode="export">` with responsive scaling. Include a QR code generator that produces a printable card linking to the web menu.

4. **Multi-page support** — Automatic page breaks when content exceeds the page height. Manual page break insertion. Page numbers in footer. Orphan/widow rules from the Layout Engine apply here.

5. **Custom template builder** — Pick a base template, override colors, fonts, spacing. Save as a new custom template (stored in DB with `is_builtin: 0`). This is where Haiku can optionally help: "Generate a template that feels like a 1930s Shanghai jazz club" → Haiku returns a theme config JSON matching the schema.

6. **Image support** — Logo placement (top center, corner), decorative background images (watermarks), dish photos (grid layout option for photo-heavy menus).

7. **Template marketplace** — Export/import templates as JSON files. Share between restaurants or publish community templates.

---

## Template Library (10 Built-In)

Templates are the product. Each one must produce a menu that looks professionally designed with zero user intervention beyond typing dish names. A template is a theme config (visual rules) plus starter section names plus formatting intelligence.

### Adding New Templates

Drop a single JS file into `/client/src/templates/`. The system auto-discovers and seeds it on startup.

```
client/src/templates/
├── index.js              # Auto-exports all templates in directory
├── jade-palace.js
├── ink-steam.js
├── red-lantern.js
├── bamboo.js
├── neon-district.js
├── tea-house.js
├── wok-fire.js
├── porcelain.js
├── silk-road.js
└── midnight-market.js
```

`index.js` does a dynamic import sweep:

```javascript
const templates = import.meta.glob('./*.js', { eager: true, import: 'default' });
export default Object.fromEntries(
  Object.values(templates).map(t => [t.id, t])
);
```

To add a template: create a new `.js` file in this directory matching the config schema below. It appears in the app on next startup. No other code changes needed.

### Template Config Schema

```javascript
export default {
  id: "jade-palace",                    // URL-safe slug, unique
  name: "Jade Palace",
  description: "Dark jade + gold, formal Chinese banquet",
  category: "asian",                    // 'asian' | 'modern' | 'fusion' | 'custom'
  previewColors: ["#0C2E1F", "#D4A54A", "#F0E6D0"],  // 3-color swatch for picker UI

  // Starter sections — scaffolded when user creates a new menu with this template
  starterSections: ["Appetizers", "Soups", "Entrées", "Noodles & Rice", "Desserts"],

  // === VISUAL THEME CONFIG ===
  colors: {
    bg: "#0C2E1F",
    text: "#F0E6D0",
    accent: "#D4A54A",
    muted: "#A89878",
    divider: "#D4A54A33",
    heading: "#D4A54A",
  },

  fonts: {
    title: "'Cinzel', serif",
    heading: "'Cinzel', serif",
    body: "'Cormorant Garamond', serif",
    price: "'Cormorant Garamond', serif",
    imports: [
      "Cinzel:wght@400;500;600;700",
      "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400"
    ]
  },

  sizes: { title: 34, subtitle: 12, section: 17, dish: 15, desc: 12, price: 15 },

  spacing: {
    sectionGap: 30,
    dishGap: 14,
    pagePadding: 46,
    headerBottom: 36,
    descTop: 3,
  },

  typography: {
    titleWeight: 700,
    titleLetterSpacing: "3px",
    titleTransform: "uppercase",
    sectionWeight: 500,
    sectionLetterSpacing: "4px",
    sectionTransform: "uppercase",
    dishWeight: 600,
    descStyle: "italic",
  },

  layout: {
    dotLeader: true,
    dotChar: "·",
    dotColor: "#D4A54A44",
    dividerStyle: "ornamental-line",
    headerDecor: "double-rule",
    border: "solid 1px #D4A54A33",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
  },

  allergens: {
    iconSize: 12,
    iconColor: "#A89878",
    position: "after-desc",
  }
};
```

### The 10 Templates

Each template is specified below with its design intent. Claude Code should implement each as a separate file following the schema above. The font pairings and color values are exact — do not approximate.

---

**1. Jade Palace**
- *Vibe*: Formal Chinese banquet hall. Deep jade green background, gold accents, ornamental dividers.
- *Colors*: bg `#0C2E1F`, text `#F0E6D0`, accent `#D4A54A`, muted `#A89878`
- *Fonts*: Cinzel (titles/sections) + Cormorant Garamond (body/price)
- *Divider*: Ornamental — centered diamond `✦` flanked by fine gold lines
- *Header decor*: Double gold rule above and below title
- *Dot leader*: Gold dots, low opacity
- *Sections*: Appetizers, Soups, Entrées, Noodles & Rice, Desserts
- *Border*: Thin gold border, no inset

**2. Ink & Steam**
- *Vibe*: Japanese minimalism meets modern design. Maximum whitespace, dramatic restraint.
- *Colors*: bg `#FAFAF8`, text `#1A1A1A`, accent `#1A1A1A`, muted `#999999`
- *Fonts*: Josefin Sans 300 weight (titles) + DM Sans (body)
- *Divider*: None — section names stand alone with generous top margin
- *Header decor*: Single thin black line below title, very tight
- *Dot leader*: No dots — just open space, price right-aligned with no connector
- *Sections*: To Start, Main, Rice & Noodles, Sweet
- *Border*: None. The whitespace IS the frame.
- *Note*: This template relies on spacing for hierarchy, not decoration. The title should be light weight (300), very large. Section names are tiny uppercase.

**3. Red Lantern**
- *Vibe*: Bold Chinese-American. Confident red, cream background, strong serif typography.
- *Colors*: bg `#FBF5EC`, text `#1C1C1C`, accent `#B82025`, muted `#6B5E4F`
- *Fonts*: Playfair Display 800 (title) + Libre Baskerville (body/sections)
- *Divider*: Thick red rule (3px) above each section name
- *Header decor*: Large red square/block above title as a bold graphic element
- *Dot leader*: Dotted, muted
- *Sections*: Small Plates, Large Plates, Sides, Drinks
- *Border*: None

**4. Bamboo**
- *Vibe*: Organic modern Asian. Natural greens, warm paper tone, clean but warm.
- *Colors*: bg `#F4F1E8`, text `#2C3E2D`, accent `#5A7C3A`, muted `#7A8B6A`
- *Fonts*: Lora (title, italic) + DM Sans (body)
- *Divider*: Simple centered line, thin, muted green
- *Header decor*: None — just the restaurant name in italic serif, understated
- *Dot leader*: Soft dashes (low opacity green)
- *Sections*: Appetizers, Entrées, From the Wok, Vegetables & Sides, Desserts
- *Border*: None

**5. Neon District**
- *Vibe*: Night market meets cyberpunk. Very dark background, electric accent color, modern sans-serif. High contrast.
- *Colors*: bg `#0D0D0D`, text `#F0F0F0`, accent `#FF2D55`, muted `#888888`
- *Fonts*: Bebas Neue (titles/sections) + DM Sans (body)
- *Divider*: Short neon accent bar (4px wide, 30px long) left-aligned above section name
- *Header decor*: None — title in huge Bebas Neue caps, letterspaced wide
- *Dot leader*: No dots — thin dark line (subtle, `#222222`)
- *Sections*: Snacks, Skewers, Bowls, Noodles, Drinks
- *Border*: None
- *Note*: Price color should be the neon accent. Descriptions in mid-gray for contrast hierarchy.

**6. Tea House**
- *Vibe*: Serene. Japanese/Chinese tea ceremony aesthetic. Warm earth tones, generous breathing room.
- *Colors*: bg `#F7F3EB`, text `#3D352B`, accent `#8C6D46`, muted `#A0927E`
- *Fonts*: EB Garamond (title/heading) + EB Garamond (body — same face, weight differentiation only)
- *Divider*: Centered thin line with small circle `○` in the middle
- *Header decor*: Small decorative rule below title, very refined
- *Dot leader*: Spaced dots, warm brown
- *Sections*: Light Bites, Tea Pairings, Main Dishes, Rice & Congee, Sweets
- *Border*: None
- *Note*: Everything should feel unhurried. Extra spacing between sections. Description text slightly smaller than other templates.

**7. Wok & Fire**
- *Vibe*: Energetic street food. Charcoal background, bright orange/amber heat. Punchy and bold.
- *Colors*: bg `#1E1E1E`, text `#F5F0E8`, accent `#E8722A`, muted `#B0A898`
- *Fonts*: Josefin Sans 700 (titles/sections) + DM Sans (body)
- *Divider*: Bold orange left-border (4px solid line on left side of section header, like a vertical accent)
- *Header decor*: Orange underline beneath title
- *Dot leader*: No dots — open space, price right-aligned
- *Sections*: Small Eats, From the Wok, Grilled, Fried Rice & Noodles, Something Sweet
- *Border*: None
- *Note*: Section headers should be left-aligned, not centered. More casual/energetic feel.

**8. Porcelain**
- *Vibe*: Chinese blue-and-white pottery. Clean white background, rich blue accents. Delicate and refined.
- *Colors*: bg `#FFFFFF`, text `#1A2744`, accent `#2B5BA3`, muted `#7889A0`
- *Fonts*: Playfair Display (title) + Cormorant Garamond (body)
- *Divider*: Thin blue line through section header (same as classic "line-through" but in blue)
- *Header decor*: Three small blue dots `· · ·` above title, fine rule below
- *Dot leader*: Blue dots, medium opacity
- *Sections*: Appetizers, Seafood, Poultry & Meat, Vegetables & Tofu, Noodles & Rice, Desserts
- *Border*: Double blue border with 6px inset (mirrors the classic template's double-border technique but in blue)

**9. Silk Road**
- *Vibe*: Pan-Asian modern editorial. Warm spice tones — saffron, paprika, warm cream. Magazine layout influence.
- *Colors*: bg `#FAF4EC`, text `#2A1F17`, accent `#C45D2C`, muted `#8B7562`
- *Fonts*: Playfair Display 800 italic (title only) + Lora (sections) + DM Sans (body)
- *Divider*: Thick rule (2.5px) in text color — editorial style
- *Header decor*: Thick top rule (6px) at the very top of the menu, then title in large italic serif
- *Dot leader*: Subtle, warm brown
- *Sections*: To Begin, Curries & Braises, From the Grill, Grains & Noodles, To Finish
- *Border*: None
- *Note*: The editorial feel comes from the thick rules and the italic serif title at large scale. Section fonts should be different from the title — Lora regular at small caps.

**10. Midnight Market**
- *Vibe*: Upscale night market. Near-black background with warm gold. Luxe but approachable.
- *Colors*: bg `#111111`, text `#E8DCC8`, accent `#C9A84C`, muted `#9B8E78`
- *Fonts*: Cinzel Decorative (title only) + EB Garamond (sections + body)
- *Divider*: Gold ornamental — two fine lines with `✦` center (similar to Jade Palace but more decorative)
- *Header decor*: Gold ornament row above title `✦ ✦ ✦`, fine rule below
- *Dot leader*: Gold dots
- *Sections*: Starters, Dim Sum, Mains, Noodles & Rice, Desserts & Drinks
- *Border*: Thin gold border with inset

---

## Layout Engine — Formatting Hardening

The layout engine is the difference between "looks good with sample data" and "looks good with ANY data." Every rule below must be implemented in `<MenuPreview>`. These aren't nice-to-haves — they prevent the ugly menus Dylan's worried about.

### Price Alignment

Prices must form a clean vertical column on the right edge regardless of dish name length. Implementation:

```
flexbox row:
  [dish name, flex-shrink: 1, overflow: ellipsis]
  [dot leader / spacer, flex: 1, min-width: 20px]
  [price, flex-shrink: 0, text-align: right, min-width: 40px]
```

The dot leader (or empty spacer for templates without dots) fills the variable gap. If a dish name is so long it would squeeze the spacer below `min-width`, the name truncates with ellipsis. The price column NEVER misaligns.

### Text Wrapping & Long Content

**Dish names**: Single line, truncate with ellipsis if longer than available space (roughly 70% of menu width). This is a design decision — menu dish names should be concise. If a name is too long, that's a content problem the user should fix, and the ellipsis signals it.

**Descriptions**: Wrap to max 2 lines. Clamp with CSS `line-clamp: 2`. Descriptions are supporting text, not the focus. If truncated, the full text is still in the data and editable — it just doesn't render past 2 lines.

**Section names**: Single line, ellipsis. In practice section names are short ("Entrées", "Small Plates") so this rarely triggers.

**Restaurant title**: Wraps freely. Large titles on narrow menus (single-col) should scale down. Implement with a max-font-size that steps down if the title exceeds 2 lines:

```javascript
// In MenuPreview, measure title lines
const titleRef = useRef();
const [titleScale, setTitleScale] = useState(1);

useEffect(() => {
  if (titleRef.current) {
    const lineHeight = parseFloat(getComputedStyle(titleRef.current).lineHeight);
    const height = titleRef.current.scrollHeight;
    if (height > lineHeight * 2.2) setTitleScale(0.75); // step down if > 2 lines
    else setTitleScale(1);
  }
}, [title, theme]);
```

### Section Spacing Consistency

The gap between the last dish of one section and the header of the next section must be exactly `sectionGap` from the theme config. Never more, never less. This seems obvious but breaks easily when:

- A description wraps to 2 lines (the gap should still be measured from the bottom of the description, not the dish name)
- A section has zero dishes (hide the section entirely — don't render an empty section header)
- The last dish in a section has no description (gap is from the price row, not from a phantom description)

Use consistent margin-bottom on the section container, not margin-top on the next section. One direction only.

### Column Balancing (Two-Column Layout)

When layout is `two-col`, sections distribute across columns. The naive approach (first half of sections in col 1, second half in col 2) produces unbalanced columns when sections vary wildly in size.

Better approach: estimate section height based on dish count (each dish ≈ `dishGap + 40px` for name+desc, section header ≈ `60px`), then greedily assign sections to the shorter column. This keeps columns roughly equal without splitting a section across columns (never split a section).

```javascript
function balanceColumns(sections, theme) {
  const estimateHeight = (dishes) =>
    60 + dishes.length * (theme.spacing.dishGap + 40);

  const col1 = [], col2 = [];
  let h1 = 0, h2 = 0;

  for (const [name, dishes] of Object.entries(sections)) {
    const h = estimateHeight(dishes);
    if (h1 <= h2) { col1.push([name, dishes]); h1 += h; }
    else { col2.push([name, dishes]); h2 += h; }
  }
  return [col1, col2];
}
```

### Orphan / Widow Prevention

For multi-page menus (Phase 5), a section header should never appear at the bottom of a page without at least 2 dishes following it. If only 0-1 dishes fit below the section header, push the entire section to the next page.

For now (single-page), this translates to: if the menu content exceeds the page height, it overflows cleanly (no cut-off mid-dish). The print/PDF output handles pagination.

### Price Format Normalization

The layout engine normalizes price display consistently:

- Numeric string `"18"` → renders as `18` (no dollar sign — dollar signs are clutter on a menu where everything is priced)
- `"MP"` → renders as `M.P.`
- `"AQ"` → renders as `A.Q.`
- Empty or `"0"` → renders as nothing (no price shown, dot leader extends to right margin)
- User can toggle dollar sign display globally in menu settings if they want it

### Empty State Handling

- **No dishes in a section**: Hide the section entirely in the preview. Show it in the sidebar with a "(empty)" label so the user knows it exists and can add dishes.
- **No sections at all**: Show a centered prompt on the preview: "Add your first section to get started" — styled in the theme's muted color and body font so it doesn't look like an error state.
- **Single dish in a section**: Render normally. One dish per section is fine (e.g., "Chef's Special" section with one item).

### Dark Theme Robustness

Templates with dark backgrounds (Jade Palace, Neon District, Wok & Fire, Midnight Market) must:

- Set text selection color to be visible against dark bg (`::selection { background: accent; color: bg }`)
- Ensure inline edit inputs have transparent backgrounds with themed text color (not browser-default white input on dark bg)
- Dot leaders and dividers must have sufficient contrast — minimum 15% opacity against the background

### Print / Export Fidelity Checklist

Every template must pass these checks in Puppeteer PDF output:

- [ ] Fonts render correctly (Google Fonts loaded, fallbacks specified)
- [ ] Dark backgrounds fill to page edges (no white margins)
- [ ] Dot leaders align with prices (no flex rounding errors)
- [ ] Decorative elements (ornaments, rules) render at correct thickness
- [ ] Two-column divider line extends full height of content area
- [ ] No interactive elements visible (drag handles, hover outlines, edit cursors)

---

## Theme Config Schema

Templates are self-contained config objects. Every rendering decision is driven by the config — no hardcoded styles in components.

```javascript
// Full schema reference — every field shown with the Jade Palace values
export default {
  id: "jade-palace",
  name: "Jade Palace",
  description: "Dark jade + gold, formal Chinese banquet",
  category: "asian",
  previewColors: ["#0C2E1F", "#D4A54A", "#F0E6D0"],
  starterSections: ["Appetizers", "Soups", "Entrées", "Noodles & Rice", "Desserts"],

  colors: {
    bg: "#0C2E1F",
    text: "#F0E6D0",
    accent: "#D4A54A",       // prices, decorative elements
    muted: "#A89878",        // descriptions
    divider: "#D4A54A33",    // lines, dot leaders
    heading: "#D4A54A",      // section headings
  },

  fonts: {
    title: "'Cinzel', serif",
    heading: "'Cinzel', serif",
    body: "'Cormorant Garamond', serif",
    price: "'Cormorant Garamond', serif",
    imports: [
      "Cinzel:wght@400;500;600;700",
      "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400"
    ]
  },

  sizes: {
    title: 34,
    subtitle: 12,
    section: 17,
    dish: 15,
    desc: 12,
    price: 15,
  },

  spacing: {
    sectionGap: 30,          // between sections
    dishGap: 14,             // between dishes
    pagePadding: 46,         // menu edge padding
    headerBottom: 36,        // below header block
    descTop: 3,              // desc below dish name
  },

  typography: {
    titleWeight: 700,
    titleLetterSpacing: "3px",
    titleTransform: "uppercase",
    sectionWeight: 500,
    sectionLetterSpacing: "4px",
    sectionTransform: "uppercase",
    dishWeight: 600,
    descStyle: "italic",     // "italic" | "normal"
  },

  layout: {
    dotLeader: true,         // show connector between name and price
    dotChar: "·",            // character for dot leader ("·", "—", " " for line-only)
    dotColor: "#D4A54A44",
    dividerStyle: "ornamental-line",  // section header style
    headerDecor: "double-rule",       // menu title decoration
    border: "solid 1px #D4A54A33",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",       // "center" | "left"
  },

  allergens: {
    iconSize: 12,
    iconColor: "#A89878",
    position: "after-desc",  // "after-desc" | "after-name" | "footer"
  }
};
```

**Rendering contract**: The `<MenuPreview>` component accepts `template` (config object) and `menu` (data) as props. It reads ONLY from these two objects. No component makes its own styling decisions. This is what guarantees template switching is instant and total, and that PDF export matches the preview. All formatting hardening rules from the Layout Engine section above are implemented inside `<MenuPreview>` — price alignment, text clamping, empty state handling, column balancing, title scaling.

A `mode` prop controls interactivity:
- `mode="edit"` (default) — drag handles on hover, click-to-edit, drop zones during drag.
- `mode="export"` — clean output with zero interactive elements. Used by Puppeteer PDF export and QR code web menu. This is what gets printed.

---

## Key Technical Decisions

### Why Puppeteer for PDF (not reportlab, pdfmake, etc.)

The menu preview is an HTML/CSS layout. Puppeteer renders the same HTML to PDF. One layout to maintain, not two. The alternative — building a parallel PDF rendering pipeline with a library like pdfmake — means every theme change, every layout feature, every decorative element has to be implemented twice. Puppeteer eliminates this entirely.

Tradeoff: Puppeteer is heavy (~400MB) and slow to cold-start. Mitigation: keep a warm browser instance, generate PDFs async with a loading indicator.

### Why SQLite (not Postgres)

Matches PlateStack's stack. Single-file DB, zero config, easy backup. A menu builder for a single restaurant doesn't need concurrent write throughput. If this scales to multi-tenant SaaS later, migrate to Postgres then.

### Why inline styles on the preview (not CSS classes)

The preview component must render identically in:
1. The React app (browser)
2. The Puppeteer export (headless Chrome)
3. Potentially a standalone web menu URL

Inline styles derived from theme config objects are the most portable approach. No CSS class name conflicts, no stylesheet loading order issues, no Tailwind purge problems.

### Why @dnd-kit (not HTML5 drag API)

Drag-and-drop lives on the menu preview itself, not a separate sidebar list. This creates two problems HTML5 drag can't solve cleanly:

1. **Drag/click conflict** — every dish element needs to be both draggable and click-to-editable. HTML5 drag captures the mousedown, so you can't distinguish "user wants to drag" from "user wants to click to edit" without hacky distance thresholds. dnd-kit has built-in activation constraints (distance: 8px) that handle this properly.

2. **Visual polish** — The preview is the product. Drag operations need smooth animations, styled drag overlays (the dish "lifts" with a shadow), and insertion indicators that match the theme's accent color. HTML5 drag gives you a ghosted screenshot of the element. dnd-kit gives you full control over the drag overlay rendering.

3. **Cross-section moves** — Dragging a dish from "Appetizers" to "Entrées" requires nested sortable contexts. dnd-kit's `SortableContext` handles this natively with its `onDragEnd` event reporting source and destination containers.

**PDF export consideration**: dnd-kit adds drag handles and hover states to the preview. These must be stripped for PDF export. The export template renders `<MenuPreview>` with a `mode="export"` prop that disables all interactive elements (no handles, no hover states, no Editable wrappers). This is also the mode used for the QR code web menu.

### Autosave vs explicit save

Autosave. Menu editing is a flow state activity — "remember to save" is friction. Debounce at 800ms. Show save status indicator. Keep version history for undo safety net.

---

## CLAUDE.md for the Project

```markdown
# MenuForge

Restaurant menu design web app. React + Vite frontend, Express + SQLite backend.

## Commands
- `npm run dev` — starts Vite dev server + Express API concurrently
- `npm run build` — production build
- `npm start` — production server (serves built frontend)
- `npm test` — run tests

## Architecture
- `/client` — React app (Vite). Menu editor UI with live preview.
- `/client/src/templates/` — Template config files. One JS file per template. Auto-discovered.
- `/server` — Express API. Menu CRUD, template management, PDF export.
- `/server/db.js` — SQLite via better-sqlite3. Migrations run on startup.
- `/server/services/pdf.js` — Puppeteer-based PDF generation.

## Key patterns
- Templates are self-contained JSON config objects in `/client/src/templates/`.
  They drive ALL rendering decisions. To add a new template: drop a .js file matching
  the schema into this directory. No other code changes needed.
- `<MenuPreview>` is the single source of truth for menu layout. It renders identically
  in the browser and in Puppeteer for PDF export. It uses inline styles only (no Tailwind).
- The Layout Engine rules are hardcoded into MenuPreview: price column alignment,
  text clamping (1-line names, 2-line descriptions), column balancing, empty state
  handling, title auto-scaling. These guarantee good output regardless of content.
- Drag-and-drop happens on the preview itself using @dnd-kit/core + @dnd-kit/sortable.
  Dishes drag within/across sections. Section headers are draggable to reorder sections.
  The sidebar shows structure but does NOT handle reordering.
- Inline editing and drag coexist on the preview: drag handles are on the left edge,
  clicking text enters edit mode. @dnd-kit's activation constraints prevent accidental drags.
- Autosave: debounced 800ms after any change. `PUT /api/menus/:id/sections` for bulk updates.
- `<MenuPreview mode="export">` strips all interactive chrome for PDF/web output.

## Database
SQLite at `./data/menuforge.db`. Tables: menus, menu_sections, menu_dishes, templates.
Migrations in `/server/migrations/`. Run automatically on server start.

## PDF export
Puppeteer renders an HTML template with the same layout logic as MenuPreview.
Template: `/server/templates/export.html`. Fonts loaded via Google Fonts CDN.
Browser instance kept warm — do not create new browsers per request.

## PlateStack integration
Optional. Set PLATESTACK_DB_PATH env var to enable.
Read-only connection to PlateStack's SQLite DB for dish import.

## Style rules
- Menu preview: inline styles from template config. No Tailwind, no CSS modules.
- Editor UI (sidebar, controls): Tailwind utility classes are fine.
- No component should hardcode colors, fonts, or sizes — always read from template config.
- Every formatting decision comes from either the template config or the Layout Engine rules.
```

---

## Dev Sequence for Claude Code

Feed this to Claude Code as the plan. Recommended build order:

1. ~~Scaffold project structure, install deps, get dev server running~~ **DONE**
2. ~~Database schema + migrations~~ **DONE**
3. ~~Implement all 10 template config files in `/client/src/templates/` with auto-discovery index. Seed into DB on startup.~~ **DONE**
4. ~~API routes (menu CRUD, bulk section update, template list)~~ **DONE**
5. ~~`<MenuPreview>` component with full Layout Engine hardening~~ **DONE**
6. ~~Drag-and-drop on preview — @dnd-kit sortable dishes within sections, cross-section moves, section reorder via header drag~~ **DONE**
7. ~~Inline editing on preview — click-to-edit with @dnd-kit activation constraints to avoid drag/edit conflicts~~ **DONE**
8. ~~Editor sidebar — dishes tab + style tab~~ **DONE** (built alongside step 5)
9. ~~Menu creation flow — pick template, get starter sections scaffolded, enter editor~~ **DONE**
10. ~~Autosave with debounce~~ **DONE**
11. ~~Menu list homepage (create, open, delete menus)~~ **DONE**
12. ~~PDF export via Puppeteer — run the Print Fidelity Checklist against all 10 templates~~ **DONE**
13. ~~PlateStack dish import~~ **DONE**
14. Allergen icons
