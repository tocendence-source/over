import type { NavItem } from "@/types/content";

export const navigation: NavItem[] = [
  { id: "network", label: "Network", index: "01", route: "/network", section: "network" },
  { id: "systems", label: "Systems", index: "02", route: "/systems", section: "systems" },
  { id: "methodology", label: "Methodology", index: "03", route: "/methodology", section: "methodology" },
  { id: "operator", label: "About", index: "04", route: "/operator", section: "operator" },
];

export const footerNavigation: NavItem[] = [
  ...navigation,
  { id: "contact", label: "Contact", index: "05", route: "/contact", section: "contact" },
];