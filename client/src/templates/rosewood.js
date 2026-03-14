// rosewood.js
export default {
  id: "rosewood",
  name: "Rosewood",
  description: "Deep mahogany and warm gold — the quiet luxury of heirloom furniture.",
  category: "formal",
  previewColors: ["#2A1610", "#D4A54A", "#F0E4D0"],
  starterSections: ["To Begin", "Entrées", "Sides", "Desserts"],

  colors: {
    bg: "#2A1610",
    text: "#F0E4D0",
    accent: "#D4A54A",
    muted: "#B8A48A",
    divider: "#D4A54A25",
    heading: "#D4A54A",
  },

  fonts: {
    title: "'Cormorant Garamond', serif",
    heading: "'Cormorant Garamond', serif",
    body: "'DM Sans', sans-serif",
    price: "'DM Sans', sans-serif",
    imports: [
      "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400",
      "DM+Sans:ital,wght@0,400;0,500;0,600;1,400",
    ],
  },

  sizes: {
    title: 34,
    subtitle: 11,
    section: 15,
    dish: 14,
    desc: 12,
    price: 14,
  },

  spacing: {
    sectionGap: 32,
    dishGap: 15,
    pagePadding: 48,
    headerBottom: 38,
    descTop: 3,
  },

  typography: {
    titleWeight: 600,
    titleLetterSpacing: "4px",
    titleTransform: "uppercase",
    titleStyle: "normal",
    sectionWeight: 600,
    sectionLetterSpacing: "3px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "italic",
  },

  layout: {
    dotLeader: true,
    dotChar: "·",
    dotColor: "#D4A54A30",
    dividerStyle: "ornamental-line",
    headerDecor: "double-rule",
    border: "solid 1px #D4A54A20",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",
  },

  logo: { width: 68, height: 68, shape: "circle" },
  allergens: { iconSize: 12, iconColor: "#B8A48A", position: "after-desc" },
};
