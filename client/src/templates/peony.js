// peony.js
export default {
  id: "peony",
  name: "Peony",
  description: "Soft blush and deep rose — modern femininity with gentle warmth.",
  category: "natural",
  previewColors: ["#FFF4F4", "#B5486A", "#2D1F2D"],
  starterSections: ["Small Plates", "Entrées", "Sides", "Sweets"],

  colors: {
    bg: "#FFF4F4",
    text: "#2D1F2D",
    accent: "#B5486A",
    muted: "#8C6A7A",
    divider: "#B5486A22",
    heading: "#B5486A",
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
    title: 32,
    subtitle: 11,
    section: 14,
    dish: 14,
    desc: 12,
    price: 14,
  },

  spacing: {
    sectionGap: 30,
    dishGap: 14,
    pagePadding: 46,
    headerBottom: 34,
    descTop: 3,
  },

  typography: {
    titleWeight: 400,
    titleLetterSpacing: "2px",
    titleTransform: "uppercase",
    titleStyle: "normal",
    sectionWeight: 400,
    sectionLetterSpacing: "3px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "italic",
  },

  layout: {
    dotLeader: true,
    dotChar: "·",
    dotColor: "#B5486A28",
    dividerStyle: "circle-line",
    headerDecor: "single-rule",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",
  },

  logo: { width: 60, height: 60, shape: "circle" },
  allergens: { iconSize: 12, iconColor: "#8C6A7A", position: "after-desc" },
};
