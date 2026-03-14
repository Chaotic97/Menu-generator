// cloud-terrace.js
export default {
  id: "cloud-terrace",
  name: "Cloud Terrace",
  description: "Soft lavender mist and plum — quiet elegance with a modern edge.",
  category: "classic",
  previewColors: ["#F4F2F7", "#7A5F8A", "#221C28"],
  starterSections: ["Appetizers", "Mains", "Sides", "Desserts"],

  colors: {
    bg: "#F4F2F7",
    text: "#221C28",
    accent: "#7A5F8A",
    muted: "#8A8294",
    divider: "#7A5F8A20",
    heading: "#7A5F8A",
  },

  fonts: {
    title: "'Lora', serif",
    heading: "'Lora', serif",
    body: "'Nunito Sans', sans-serif",
    price: "'Nunito Sans', sans-serif",
    imports: [
      "Lora:ital,wght@0,400;0,500;0,600;0,700;1,400",
      "Nunito+Sans:ital,wght@0,400;0,500;0,600;1,400",
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
    titleWeight: 600,
    titleLetterSpacing: "3px",
    titleTransform: "uppercase",
    titleStyle: "normal",
    sectionWeight: 600,
    sectionLetterSpacing: "2px",
    sectionTransform: "uppercase",
    dishWeight: 500,
    descStyle: "italic",
  },

  layout: {
    dotLeader: true,
    dotChar: "·",
    dotColor: "#7A5F8A25",
    dividerStyle: "simple-line",
    headerDecor: "single-rule",
    border: "none",
    outerBorder: "none",
    borderInset: 0,
    priceAlignment: "right",
    sectionAlignment: "center",
  },

  logo: { width: 62, height: 62, shape: "circle" },
  allergens: { iconSize: 12, iconColor: "#8A8294", position: "after-desc" },
};
