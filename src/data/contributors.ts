import type { Contributor } from "@/lib/types";

export const contributors: Contributor[] = [
  {
    id: "contrib-001",
    name: "V. Diaz",
    affiliation: "MAHC / MAPSA",
    bio: "Director of MAHC and MAPSA. Field documentation and registry curation.",
    researchAreas: [
      "Monte Albán epigraphy",
      "Zapotec iconography",
      "field photography",
    ],
    contributions: ["MA-ST12-Z01"],
  },
  {
    id: "contrib-002",
    name: "Dr. R. Méndez",
    affiliation: "UNAM, Instituto de Investigaciones Antropológicas",
    orcid: "0000-0002-1234-5678",
    bio: "Specialist in Zapotec writing systems and Mesoamerican epigraphy.",
    researchAreas: [
      "Zapotec epigraphy",
      "Mesoamerican writing systems",
    ],
    contributions: [],
  },
];
