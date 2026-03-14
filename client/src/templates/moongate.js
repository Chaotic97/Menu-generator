// moongate.js
export default {
  id: "moongate",
  name: "Moongate",
  description: "Clean and contemplative — inspired by the circular gates of classical gardens.",
  category: "minimal",
  previewColors: ["#FAFAF8", "#6B8C7A", "#2A2A28"],
  starterSections: ["Appetizers", "Entrées", "Sides", "Desserts"],

  colors: {
    bg: "#FAFAF8",
    text: "#2A2A28",
    accent: "#6B8C7A",
    muted: "#8A8A84",
    divider: "#6B8C7A22",
    heading: "#6B8C7A",
  },

  fonts: {
    title: "'Josefin Sans', sans-serif",
    heading: "'Josefin Sans', sans-serif",
    body: "'Work Sans', sans-serif",
    price: "'Work Sans', sans-serif",
    imports: [
      "Josefin+Sans:wght@300;400;500;600",
      "Work+Sans:ital,wght@0,400;0,500;1,400",
    ],
  },

  sizes: {
    title: 28,
    subtitle: 10,
    section: 13,
    dish: 14,
    desc: 11,
    price: 14,
  },

  spacing: {
    sectionGap: 30,
    dishGap: 14,
    pagePadding: 50,
    headerBottom: 36,
    descTop: 3,
  },

  typography: {
    titleWeight: 300,
    titleLetterSpacing: "8px",
    titleTransform: "uppercase",
    titleStyle: "normal",
    sectionWeight: 400,
    sectionLetterSpacing: "5px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "normal",
  },

  layout: {
    dotLeader: true,
    dotChar: " ",
    dotColor: "#6B8C7A00",
    dividerStyle: "circle-line",
    headerDecor: "block-accent",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",
  },

  allergens: { iconSize: 12, iconColor: "#8A8A84", position: "after-desc" },
};
