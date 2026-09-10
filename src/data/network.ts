import type { Role } from "@/types/content";
import { destinations } from "@/data/contacts";

export const network = {
  title: "The network",
  headline: "Research is better\nwhen it's connected.",
  description: "OVER brings researchers, analysts, and data collectors together around open-source investigation. We connect digital traces, compare sources, and share the methods behind the findings.",
  detail: "The community is a place to discuss cases, work through search methods, and learn from one another. OVER Adapter connects the community and its public channels.",
  clan: { name: "OVER Clan", ...destinations.adapter },
} as const;

export const roles: Role[] = [
  { id: "osint", code: "OSINT", title: "Researchers", summary: "Collect digital traces, identify entities, and compare information across platforms. A username, profile, or document can be the starting point.", x: 22, y: 30 },
  { id: "int", code: "INTELLIGENCE", title: "Analysts", summary: "Look for patterns in the collected material. Behavioural modelling and geo-temporal correlation help explain how places, people, and events relate.", x: 76, y: 28 },
  { id: "pentest", code: "SECURITY", title: "Security", summary: "Study threats, protect users, and research infrastructure vulnerabilities. Pentesting and security research support the investigative work.", x: 76, y: 72 },
  { id: "data", code: "DATA", title: "Collectors", summary: "Maintain datasets, monitor sources, and build automated collection pipelines so researchers can work with organised, traceable information.", x: 24, y: 72 },
];