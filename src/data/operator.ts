import { destinations } from "@/data/contacts";

export const operator = {
  name: "New_Over",
  role: "OSINT researcher. OVER founder.",
  handles: [destinations.operator, destinations.alternate],
  paragraphs: [
    "I founded the OVER community and run OverNetting and ShkoloDrive. My work focuses on open-source research, user protection, and intelligence systems.",
    "This site brings those projects together: tools for working with digital traces, practical investigation methods, and the people who use them. For questions about a project or the community, message me directly.",
  ],
} as const;