// sesame.js
export default {
  id: "sesame",
  name: "Sesame",
  description: "Warm cream and toasted brown — friendly, clean, and inviting.",
  category: "minimal",
  previewColors: ["#FBF7F0", "#8B6914", "#2C2418"],
  starterSections: ["Starters", "Mains", "Sides", "Desserts"],

  colors: {
    bg: "#FBF7F0",
    text: "#2C2418",
    accent: "#8B6914",
    muted: "#8A7D6B",
    divider: "#8B691420",
    heading: "#8B6914",
  },

  fonts: {
    title: "'Outfit', sans-serif",
    heading: "'Outfit', sans-serif",
    body: "'Outfit', sans-serif",
    price: "'Outfit', sans-serif",
    imports: [
      "Outfit:wght@300;400;500;600;700",
    ],
  },

  sizes: {
    title: 30,
    subtitle: 10,
    section: 13,
    dish: 14,
    desc: 12,
    price: 14,
  },

  spacing: {
    sectionGap: 28,
    dishGap: 13,
    pagePadding: 44,
    headerBottom: 32,
    descTop: 3,
  },

  typography: {
    titleWeight: 600,
    titleLetterSpacing: "5px",
    titleTransform: "uppercase",
    titleStyle: "normal",
    sectionWeight: 600,
    sectionLetterSpacing: "4px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "normal",
  },

  layout: {
    dotLeader: true,
    dotChar: "–",
    dotColor: "#8B691425",
    dividerStyle: "simple-line",
    headerDecor: "none",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "left",
  },

  allergens: { iconSize: 12, iconColor: "#8A7D6B", position: "after-desc" },
};
