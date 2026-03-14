// persimmon.js
export default {
  id: "persimmon",
  name: "Persimmon",
  description: "Crisp white with bold coral punch — editorial energy, modern warmth.",
  category: "editorial",
  previewColors: ["#FFFFFF", "#D35F3E", "#1C1816"],
  starterSections: ["Small Plates", "Mains", "Sides", "To Finish"],

  colors: {
    bg: "#FFFFFF",
    text: "#1C1816",
    accent: "#D35F3E",
    muted: "#7A736D",
    divider: "#D35F3E28",
    heading: "#D35F3E",
  },

  fonts: {
    title: "'Fraunces', serif",
    heading: "'Fraunces', serif",
    body: "'Inter', sans-serif",
    price: "'Inter', sans-serif",
    imports: [
      "Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400",
      "Inter:wght@400;500;600",
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
    sectionGap: 32,
    dishGap: 14,
    pagePadding: 44,
    headerBottom: 36,
    descTop: 4,
  },

  typography: {
    titleWeight: 700,
    titleLetterSpacing: "1px",
    titleTransform: "none",
    titleStyle: "normal",
    sectionWeight: 600,
    sectionLetterSpacing: "2px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "normal",
  },

  layout: {
    dotLeader: true,
    dotChar: "·",
    dotColor: "#D35F3E30",
    dividerStyle: "thick-rule",
    headerDecor: "top-rule",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "left",
  },

  logo: { width: 56, height: 56, shape: "square" },
  allergens: { iconSize: 12, iconColor: "#7A736D", position: "after-desc" },
};
