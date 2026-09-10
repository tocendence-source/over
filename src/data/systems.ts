import type { System } from "@/types/content";
import { destinations } from "@/data/contacts";

export const systems: System[] = [
  {
    id: "overnetting", number: "01", name: "OverNetting", category: "OSINT bot",
    description: "Find connections in digital traces.",
    detail: "An OSINT bot for collecting and comparing information associated with usernames, phone numbers, email addresses, and IPs. A relationship graph helps organise the connections for further investigation.",
    features: ["Username, phone, email, and IP search", "Cross-platform analysis", "Built-in AI assistant", "Maltego-style relationship graph"],
    href: "/systems/overnetting", external: destinations.overnetting, status: "active",
  },
  {
    id: "shkolodrive", number: "02", name: "ShkoloDrive", category: "OSINT education",
    description: "Learn the methods behind a finding.",
    detail: "An educational OSINT channel built around real investigations and practical methods. Case breakdowns walk through the search process, from the initial question to the sources used to check a result.",
    features: ["GEOINT: geospatial research", "Temporal OSINT: behaviour over time", "SOCMINT: social-media research", "Step-by-step search algorithms and complex case breakdowns"],
    href: "/systems/shkolodrive", external: destinations.shkolodrive,
    secondary: destinations.shkolodriveChannel, status: "active", artwork: "shkolodrive",
  },
  {
    id: "over-adapter", number: "03", name: "OVER Adapter", category: "Community infrastructure",
    description: "The connection between OVER projects.",
    detail: "The infrastructure layer connecting OVER's community, channels, and data flows. Start here to find the network and navigate between its Telegram projects.",
    features: ["Telegram channel infrastructure", "Routing between projects and channels", "Management of data flows", "A starting point for the OVER community"],
    href: "/systems/over-adapter", external: destinations.adapter, status: "active", artwork: "adapter",
  },
  {
    id: "cislog", number: "04", name: "CISLOG", category: "User protection",
    description: "Identify scams and label threats.",
    detail: "The previous OVER site describes CISLOG as a free, CIS-focused user-protection project, with scam and threat labelling and a way to reference @cislog in profile descriptions.",
    features: ["Scam and threat labelling", "CIS-focused user protection", "Public guidance through @cislog", "Free for users"],
    href: "/systems/cislog", external: destinations.cislog, status: "archive",
    linkNote: "The original @cislog link now displays a VPN service. This description is retained from the previous OVER site; a current user-protection destination has not been verified.",
  },
];

export const getSystem = (id?: string) => systems.find((system) => system.id === id);
export const systemNeighbours = (id: string) => {
  const index = systems.findIndex((system) => system.id === id);
  return index < 0 ? {} : {
    prev: systems[(index + systems.length - 1) % systems.length],
    next: systems[(index + 1) % systems.length],
  };
};