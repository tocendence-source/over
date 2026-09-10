export type System = {
  id: string;
  number: string;
  name: string;
  category: string;
  description: string;
  detail: string;
  features: string[];
  href: string;
  external: { label: string; url: string; handle?: string };
  secondary?: { label: string; url: string };
  linkNote?: string;
  status: "active" | "archive";
  artwork?: "adapter" | "shkolodrive";
};

export type Role = {
  id: string;
  code: string;
  title: string;
  summary: string;
  x: number;
  y: number;
};

export type MethodStage = {
  id: string;
  index: string;
  title: string;
  body: string;
  detail: string;
  output: string;
};

export type ConfidenceTier = {
  id: string;
  label: string;
  nodes: number;
  links: number;
  criteria: string;
  copy: string;
};

export type ContactChannel = {
  id: string;
  label: string;
  handle: string;
  url: string;
  purpose: string;
  kind: "node" | "module" | "operator" | "channel";
};

export type NavItem = {
  id: string;
  label: string;
  index: string;
  route: string;
  section?: string;
};