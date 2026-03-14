# Prixie Template Creation Guide

You are designing menu templates for Prixie, a restaurant menu design app. Each template is a single `.js` file that exports a config object. Drop it in `client/src/templates/` and it works automatically — no other code changes needed.

---

## Output Format

Return each template as a fenced code block with the filename as a comment on line 1. Example:

```js
// tropical-bistro.js
export default {
  id: "tropical-bistro",
  ...
};
```

---

## Full Schema

Every field below is required unless marked optional.

```js
export default {
  // Identity
  id: "kebab-case-id",              // Unique slug. Lowercase, hyphens only.
  name: "Display Name",             // Short name shown in template picker (1-2 words).
  description: "...",               // One sentence describing the vibe.
  category: "formal",               // One of: "formal", "classic", "minimal", "natural", "editorial"
  previewColors: ["#bg", "#accent", "#text"],  // Exactly 3 hex colors for the thumbnail swatch.
  starterSections: ["Appetizers", "Mains", "Sides", "Desserts"],  // Default section names for new menus.

  // Colors — all must be valid CSS color values (hex preferred)
  colors: {
    bg: "#FFFFFF",       // Page background
    text: "#111111",     // Primary text (dish names, titles)
    accent: "#C45D2C",   // Accent color (section headings, decorations, dividers)
    muted: "#888888",    // Secondary text (descriptions, subtitles)
    divider: "#00000020", // Divider lines (usually accent + low alpha, e.g. "#C45D2C33")
    heading: "#C45D2C",  // Section heading color (often same as accent)
  },

  // Fonts — must be Google Fonts. Wrap in quotes for CSS.
  fonts: {
    title: "'Playfair Display', serif",    // Restaurant name
    heading: "'Playfair Display', serif",  // Section headings
    body: "'Source Sans 3', sans-serif",   // Dish names + descriptions
    price: "'Source Sans 3', sans-serif",  // Prices
    imports: [                             // Google Fonts API family strings
      "Playfair+Display:wght@400;500;600;700",
      "Source+Sans+3:ital,wght@0,400;0,500;0,600;1,400",
    ],
  },

  // Sizes — all in px
  sizes: {
    title: 32,     // Restaurant name (range: 24-40)
    subtitle: 11,  // Subtitle text (range: 9-14)
    section: 15,   // Section headings (range: 12-20)
    dish: 14,      // Dish name (range: 13-16)
    desc: 12,      // Description (range: 10-13)
    price: 14,     // Price (range: 13-16, usually matches dish)
  },

  // Spacing — all in px
  spacing: {
    sectionGap: 30,    // Between sections (range: 24-40)
    dishGap: 14,       // Between dish rows (range: 10-18)
    pagePadding: 44,   // Page edge padding (range: 36-56)
    headerBottom: 34,  // Below header/title area (range: 28-44)
    descTop: 3,        // Above description text (range: 2-6)
  },

  // Typography
  typography: {
    titleWeight: 700,                  // 300-700
    titleLetterSpacing: "3px",         // "0px" to "8px"
    titleTransform: "uppercase",       // "uppercase" | "none"
    titleStyle: "normal",              // "normal" | "italic" (optional, defaults to "normal")
    sectionWeight: 600,                // 400-700
    sectionLetterSpacing: "3px",       // "0px" to "6px"
    sectionTransform: "uppercase",     // "uppercase" | "none"
    dishWeight: 500,                   // 400-600
    descStyle: "italic",               // "normal" | "italic"
  },

  // Layout
  layout: {
    dotLeader: true,            // Show dots/chars between dish name and price
    dotChar: "·",               // Leader character: "·", ".", "–", "-", " " (space = no dots)
    dotColor: "#00000033",      // Leader color (usually accent or divider + alpha)
    dividerStyle: "ornamental-line",  // See options below
    headerDecor: "double-rule",       // See options below
    border: "none",             // Inner border: "none" or CSS border string, e.g. "solid 1px #D4A54A33"
    outerBorder: "none",        // Outer border: same format
    borderInset: 0,             // Px gap between outer and inner border (0 if no double border)
    priceAlignment: "right",    // Always "right"
    sectionAlignment: "center", // "center" | "left"
  },

  // Logo placeholder (optional — omit entirely to hide)
  logo: { width: 70, height: 70, shape: "circle" },  // shape: "circle" | "square"

  // Allergens (optional — safe to copy as-is)
  allergens: { iconSize: 12, iconColor: "#888888", position: "after-desc" },
};
```

---

## Divider Styles (`layout.dividerStyle`)

These render between sections (not before the first):

| Value | Look |
|---|---|
| `"ornamental-line"` | Thin line with a centered star/ornament |
| `"thick-rule"` | Bold 3px accent-colored bar |
| `"simple-line"` | Short centered 60px line |
| `"neon-bar"` | Short 30px accent block |
| `"circle-line"` | Line with centered circle |
| `"left-accent"` | 4px left border on section heading (no line between sections) |
| `"line-through"` | Lines flanking the section heading text |
| `"none"` | No divider |

## Header Decorations (`layout.headerDecor`)

These render above/around the restaurant name:

| Value | Look |
|---|---|
| `"double-rule"` | Two lines (thick accent + thin) above and below title |
| `"single-rule"` | One subtle line above and below title |
| `"underline"` | Accent underline on the title itself |
| `"block-accent"` | Centered square accent block above title |
| `"top-rule"` | Bold 6px rule at very top |
| `"dots-and-rule"` | Centered dots + subtle line |
| `"ornament-row"` | Row of star ornaments |
| `"none"` | No decoration |

---

## Design Rules

1. **Contrast**: Ensure `text` on `bg` has WCAG AA contrast (4.5:1 minimum). Same for `accent`/`heading` on `bg`.
2. **Dark templates**: If `bg` is dark, `text` must be light. `muted` should be softer than `text` but still readable.
3. **Light templates**: If `bg` is light/white, `text` should be dark. `muted` is typically a medium gray.
4. **Divider alpha**: Use hex alpha for divider colors (e.g. `#D4A54A33` = gold at 20% opacity). This keeps dividers subtle.
5. **Font pairing**: Use max 2 font families. Title/heading usually share one; body/price share another. Serif + sans-serif combos work well.
6. **`previewColors`**: Should be `[bg, accent, text]` — these appear as color dots in the UI.
7. **`imports`**: Must exactly match the Google Fonts API format. Use `+` for spaces in family names. Include the weights you reference.

---

## Categories

- **formal**: Rich, dark backgrounds, gold/silver accents, ornamental dividers. Upscale dining.
- **classic**: Traditional, warm. Serif fonts, subtle borders, cream/white backgrounds.
- **minimal**: Clean, Swiss-style. Sans-serif, lots of whitespace, stark contrast.
- **natural**: Earthy, organic. Warm neutrals, greens/browns, relaxed typography.
- **editorial**: Bold, magazine-inspired. Large type, strong visual hierarchy, asymmetric layouts.

---

## Existing Templates (avoid duplicating these vibes)

| ID | Name | Vibe |
|---|---|---|
| jade-palace | Evergreen | Deep jade, gold ornaments, formal serif |
| midnight-market | Sterling | Navy, silver accents, modern luxury |
| brasserie | Bordeaux | Cream, wine-red, French bistro |
| copperplate | Copperplate | Warm white, copper/bronze, engraved feel |
| silk-road | Caravan | Parchment, burnt orange, exotic warmth |
| red-lantern | Vermillion | Charcoal, red, East Asian inspired |
| tea-house | Chamomile | Warm paper, soft brown, cozy |
| bamboo | Terroir | Earthy green, organic, farm-to-table |
| coastline | Driftwood | White, slate blue, nautical |
| modernist | Gridline | Pure white, black, Swiss minimal |
| ink-steam | Monotype | Off-white, black, typewriter/letterpress |
| porcelain | Delft | White, cobalt blue, refined |

---

## Example Request

> Design 3 new templates: a vibrant Mexican cantina style, a sleek Tokyo izakaya, and a rustic Italian trattoria.

You should output 3 complete `.js` files following the schema above, each with a unique `id`, distinct color palette, appropriate fonts, and complementary layout options.
