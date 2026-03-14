// celadon.js
export default {
  id: "celadon",
  name: "Celadon",
  description: "Soft jade-green palette inspired by Song dynasty celadon glaze ceramics.",
  category: "classic",
  previewColors: ["#EBF2EB", "#3D6B4C", "#1A2E1A"],
  starterSections: ["To Start", "Mains", "Sides", "Desserts"],

  colors: {
    bg: "#EBF2EB",
    text: "#1A2E1A",
    accent: "#3D6B4C",
    muted: "#5E7A65",
    divider: "#3D6B4C25",
    heading: "#3D6B4C",
  },

  fonts: {
    title: "'Cormorant Garamond', serif",
    heading: "'Cormorant Garamond', serif",
    body: "'DM Sans', sans-serif",
    price: "'DM Sans', sans-serif",
    imports: [
      "Cormorant+Garamond:wght@400;500;600;700",
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
    dishGap: 14,
    pagePadding: 48,
    headerBottom: 36,
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
    dotColor: "#3D6B4C30",
    dividerStyle: "ornamental-line",
    headerDecor: "double-rule",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",
  },

  logo: { width: 64, height: 64, shape: "circle" },
  allergens: { iconSize: 12, iconColor: "#5E7A65", position: "after-desc" },
};
