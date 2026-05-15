import type { Source } from "@/lib/types";

export const sources: Source[] = [
  {
    id: "src-001",
    author: "Caso, Alfonso",
    title: "Las estelas zapotecas",
    year: "1928",
    publication:
      "Monografías del Museo Nacional de Arqueología, Historia y Etnografía",
    pages: "pp. 12–45",
    notes:
      "Foundational catalog of Monte Albán stelae including early descriptions of Stela 12.",
    relatedRecordIds: ["MA-ST12-Z01"],
  },
  {
    id: "src-002",
    author: "Marcus, Joyce",
    title: "Zapotec Writing",
    year: "1980",
    publication: "Scientific American 242(2)",
    pages: "pp. 46–60",
    notes:
      "Overview of Zapotec writing systems with discussion of conquest slab conventions and carved clusters.",
    relatedRecordIds: ["MA-ST12-Z01"],
  },
  {
    id: "src-003",
    author: "Urcid, Javier",
    title: "Zapotec Hieroglyphic Writing",
    year: "2001",
    publication:
      "Studies in Pre-Columbian Art and Archaeology, No. 34, Dumbarton Oaks",
    notes:
      "Comprehensive treatment of Zapotec writing conventions, segmentation challenges, and glyph classification.",
    relatedRecordIds: ["MA-ST12-Z01"],
  },
];
