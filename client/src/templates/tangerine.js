// tangerine.js
export default {
  id: "tangerine",
  name: "Tangerine",
  description: "Bright citrus energy on warm peach — playful, bold, and cheerful.",
  category: "editorial",
  previewColors: ["#FFF8F2", "#E07B30", "#2A1E16"],
  starterSections: ["Snacks", "Mains", "Sides", "Sweets"],

  colors: {
    bg: "#FFF8F2",
    text: "#2A1E16",
    accent: "#E07B30",
    muted: "#947A64",
    divider: "#E07B3022",
    heading: "#E07B30",
  },

  fonts: {
    title: "'DM Serif Display', serif",
    heading: "'DM Serif Display', serif",
    body: "'DM Sans', sans-serif",
    price: "'DM Sans', sans-serif",
    imports: [
      "DM+Serif+Display:ital@0;1",
      "DM+Sans:ital,wght@0,400;0,500;0,600;1,400",
    ],
  },

  sizes: {
    title: 36,
    subtitle: 10,
    section: 16,
    dish: 14,
    desc: 12,
    price: 14,
  },

  spacing: {
    sectionGap: 30,
    dishGap: 14,
    pagePadding: 42,
    headerBottom: 32,
    descTop: 4,
  },

  typography: {
    titleWeight: 400,
    titleLetterSpacing: "1px",
    titleTransform: "none",
    titleStyle: "italic",
    sectionWeight: 400,
    sectionLetterSpacing: "3px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "normal",
  },

  layout: {
    dotLeader: true,
    dotChar: "·",
    dotColor: "#E07B3028",
    dividerStyle: "neon-bar",
    headerDecor: "underline",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "left",
  },

  logo: { width: 54, height: 54, shape: "square" },
  allergens: { iconSize: 12, iconColor: "#947A64", position: "after-desc" },
};
