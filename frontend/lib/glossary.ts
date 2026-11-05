export type GlossaryRole = (typeof glossaryRoles)[number];

export type GlossaryTerm = {
  id: string;
  english: string;
  japanese: string;
  kana?: string;
  vietnamese: string;
  roles: GlossaryRole[];
  category: (typeof glossaryCategories)[number];
  note: string;
  example?: string;
};

import { advancedGlossaryTerms } from "./glossaryAdvanced";
import { coreTerms1 } from "./glossaryCore/coreTerms1";
import { coreTerms2 } from "./glossaryCore/coreTerms2";
import { coreTerms3 } from "./glossaryCore/coreTerms3";
import { coreTerms4 } from "./glossaryCore/coreTerms4";

export const glossaryTerms: GlossaryTerm[] = [
  ...advancedGlossaryTerms,
  ...coreTerms1,
  ...coreTerms2,
  ...coreTerms3,
  ...coreTerms4,
];

export const glossaryRoles = [
  "BrSE",
  "PM",
  "PO",
  "BA",
  "Comtor",
  "QA",
  "Tester",
  "Dev",
  "Architect",
  "DevOps",
  "Manager",
  "Team",
  "Scrum Master",
  "Designer",
  "Sales",
  "DBA",
  "SRE",
  "All",
] as const;

export const glossaryCategories = [
  "Requirement",
  "Project",
  "Quality",
  "Communication",
  "Release",
  "Business",
  "System Design",
  "Agile",
  "Security",
  "Cloud",
  "Backend",
  "Frontend",
  "Database",
  "Finance",
  "Banking",
  "Insurance",
  "Manufacturing",
  "Game",
  "EC",
  "Medical",
  "Logistics",
  "Real Estate",
  "Travel",
  "Education",
  "Telecom",
  "E-Government",
] as const;
