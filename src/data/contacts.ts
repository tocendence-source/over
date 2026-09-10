import type { ContactChannel } from "@/types/content";

// The source invitation is preserved; the public adapter is the primary link.
export const destinations = {
  adapter: { label: "OVER Adapter", handle: "@over_adpt", url: "https://t.me/over_adpt" },
  overnetting: { label: "OverNetting", handle: "@overnetting_bot", url: "https://t.me/overnetting_bot" },
  shkolodrive: { label: "ShkoloDrive", handle: "@ShkoloDrive", url: "https://t.me/ShkoloDrive" },
  shkolodriveChannel: { label: "ShkoloDrive channel", url: "https://t.me/+OI5UGXchMRg1NDY6" },
  cislog: { label: "CISLOG", handle: "@cislog", url: "https://t.me/cislog" },
  operator: { label: "New_Over", handle: "@New_Over", url: "https://t.me/New_Over" },
  alternate: { label: "Alternative contact", handle: "@cisinter_4", url: "https://t.me/cisinter_4" },
} as const;

export const contacts: ContactChannel[] = [
  { id: "operator", ...destinations.operator, purpose: "Questions, projects, and research", kind: "operator" },
  { id: "clan", ...destinations.adapter, purpose: "The OVER community and channels", kind: "node" },
  { id: "overnetting", ...destinations.overnetting, purpose: "Digital traces and relationship analysis", kind: "module" },
  { id: "shkolodrive", ...destinations.shkolodrive, purpose: "Practical OSINT methods and case breakdowns", kind: "channel" },
  { id: "cislog", ...destinations.cislog, label: "CISLOG (original link)", purpose: "Currently opens a VPN service", kind: "module" },
  { id: "cisinter", ...destinations.alternate, purpose: "Another way to reach New_Over", kind: "operator" },
];