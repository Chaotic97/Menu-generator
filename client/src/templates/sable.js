// sable.js
export default {
  id: "sable",
  name: "Sable",
  description: "Warm charcoal and amber glow — understated nighttime sophistication.",
  category: "formal",
  previewColors: ["#1C1917", "#C9943A", "#F0EBE3"],
  starterSections: ["To Begin", "Mains", "Sides", "To Finish"],

  colors: {
    bg: "#1C1917",
    text: "#F0EBE3",
    accent: "#C9943A",
    muted: "#A89E90",
    divider: "#C9943A22",
    heading: "#C9943A",
  },

  fonts: {
    title: "'Crimson Pro', serif",
    heading: "'Crimson Pro', serif",
    body: "'Manrope', sans-serif",
    price: "'Manrope', sans-serif",
    imports: [
      "Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400",
      "Manrope:wght@400;500;600",
    ],
  },

  sizes: {
    title: 34,
    subtitle: 10,
    section: 14,
    dish: 14,
    desc: 12,
    price: 14,
  },

  spacing: {
    sectionGap: 34,
    dishGap: 15,
    pagePadding: 48,
    headerBottom: 38,
    descTop: 3,
  },

  typography: {
    titleWeight: 700,
    titleLetterSpacing: "3px",
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
    dotColor: "#C9943A28",
    dividerStyle: "thick-rule",
    headerDecor: "top-rule",
    border: "none",
    outerBorder: "solid 1px #C9943A18",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",
  },

  logo: { width: 66, height: 66, shape: "circle" },
  allergens: { iconSize: 12, iconColor: "#A89E90", position: "after-desc" },
};
