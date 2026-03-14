// matcha.js
export default {
  id: "matcha",
  name: "Matcha",
  description: "Gentle green-white with earthy depth — calm, natural, approachable.",
  category: "natural",
  previewColors: ["#F5F8F2", "#4A6741", "#1E2B1A"],
  starterSections: ["Starters", "Mains", "Sides", "Desserts"],

  colors: {
    bg: "#F5F8F2",
    text: "#1E2B1A",
    accent: "#4A6741",
    muted: "#6E7D68",
    divider: "#4A674120",
    heading: "#4A6741",
  },

  fonts: {
    title: "'Libre Baskerville', serif",
    heading: "'Libre Baskerville', serif",
    body: "'Karla', sans-serif",
    price: "'Karla', sans-serif",
    imports: [
      "Libre+Baskerville:ital,wght@0,400;0,700;1,400",
      "Karla:ital,wght@0,400;0,500;0,600;1,400",
    ],
  },

  sizes: {
    title: 30,
    subtitle: 11,
    section: 14,
    dish: 14,
    desc: 12,
    price: 14,
  },

  spacing: {
    sectionGap: 28,
    dishGap: 13,
    pagePadding: 44,
    headerBottom: 30,
    descTop: 3,
  },

  typography: {
    titleWeight: 700,
    titleLetterSpacing: "2px",
    titleTransform: "uppercase",
    titleStyle: "normal",
    sectionWeight: 400,
    sectionLetterSpacing: "2px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "italic",
  },

  layout: {
    dotLeader: true,
    dotChar: ".",
    dotColor: "#4A674128",
    dividerStyle: "left-accent",
    headerDecor: "none",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "left",
  },

  allergens: { iconSize: 12, iconColor: "#6E7D68", position: "after-desc" },
};
