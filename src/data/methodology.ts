import type { ConfidenceTier, MethodStage } from "@/types/content";

export const methodology = {
  title: "From a trace\nto a finding.",
  intro: "A repeatable process for gathering information, checking the connections, and explaining what the evidence supports.",
  corePhrase: "Data is noise. Patterns are truth.",
} as const;

export const stages: MethodStage[] = [
  { id: "input", index: "01", title: "Input", body: "Start with a digital trace.", detail: "A username, phone number, email, IP address, or piece of metadata provides a starting point. Record where the information came from before working with it.", output: "Initial trace" },
  { id: "extraction", index: "02", title: "Extraction", body: "Collect the relevant entities.", detail: "Extract entities from open sources and sources available with permission. Separate names, profiles, locations, and timestamps while retaining their source references.", output: "Organised entities" },
  { id: "correlation", index: "03", title: "Correlation", body: "Compare across platforms.", detail: "Look for matching attributes and connections between entities. A shared detail is a lead to investigate, not proof that two records describe the same person.", output: "Relationship graph" },
  { id: "validation", index: "04", title: "Validation", body: "Check with independent sources.", detail: "Test the connections against independent information. Record contradictions and assign a confidence state: LOW, MED, HIGH, or CONFIRMED.", output: "Checked relationships" },
  { id: "evidence", index: "05", title: "Evidence", body: "Document the conclusion.", detail: "Bring the entities, relationships, sources, and confidence levels into a final report. Keep the reasoning visible so the conclusion can be reviewed.", output: "Evidence report" },
];

export const confidenceTiers: ConfidenceTier[] = [
  { id: "low", label: "LOW", nodes: 2, links: 0, criteria: "An initial lead", copy: "A trace has been found but has not been independently checked. Keep it as a lead, not a conclusion." },
  { id: "med", label: "MED", nodes: 4, links: 2, criteria: "A partial match", copy: "Some details agree across sources. The connection still needs further verification." },
  { id: "high", label: "HIGH", nodes: 6, links: 5, criteria: "Independent agreement", copy: "Independent sources support the connection. Remaining uncertainty should still be recorded." },
  { id: "confirmed", label: "CONFIRMED", nodes: 8, links: 10, criteria: "A verified relationship", copy: "The relationship has been checked against independent sources and can be documented with its supporting evidence." },
];