import type {
  Confidence,
  InscriptionRecord,
  CandidateElement,
  GroupingHypothesis,
  Annotation,
} from "./types";

// ─── Confidence Display ──────────────────────────────────────────

export const CONFIDENCE_ICON: Record<Confidence, string> = {
  low: "◇",
  cautious: "◈",
  moderate: "◆",
  high: "●",
};

// ─── Grouping Colors ─────────────────────────────────────────────

export const GROUP_COLORS: Record<string, string> = {
  G01: "#c8a96e",
  G02: "#7ea8be",
  G03: "#b87e5a",
  G04: "#8ab87e",
  G05: "#be7ea8",
};

export function getGroupColor(id: string): string {
  return GROUP_COLORS[id] || "#c8a96e";
}

// ─── Citation Generators ─────────────────────────────────────────

export function generateChicago(
  record: InscriptionRecord,
  target?: CandidateElement | GroupingHypothesis | Annotation | null
): string {
  const today = new Date().toISOString().split("T")[0];
  if (!target || target.id === record.id) {
    return `"${record.title}," MAPSA Monte Albán Inscription Registry, ${record.id}, v${record.recordVersion}, accessed ${today}.`;
  }
  if ("citationText" in target && target.citationText) {
    return target.citationText;
  }
  const label = "label" in target ? target.label : target.id;
  return `"${label}," in MAPSA ${record.id}, accessed ${today}.`;
}

export function generateAPA(
  record: InscriptionRecord,
  target?: CandidateElement | GroupingHypothesis | Annotation | null
): string {
  const year = record.datePhotographed.slice(0, 4);
  if (!target || target.id === record.id) {
    return `MAPSA. (${year}). ${record.title} [${record.id}]. Monte Albán Inscription Registry, v${record.recordVersion}.`;
  }
  const label = "label" in target ? target.label : target.id;
  return `MAPSA. (${year}). ${label} [${record.id}]. Monte Albán Inscription Registry.`;
}

export function generateBibTeX(
  record: InscriptionRecord,
  target?: CandidateElement | GroupingHypothesis | Annotation | null
): string {
  const id = target?.id || record.id;
  const key = id.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const title =
    !target || target.id === record.id
      ? record.title
      : "label" in target
        ? target.label
        : target.id;
  return `@misc{mapsa_${key},
  title={${title}},
  author={MAPSA},
  year={${record.datePhotographed.slice(0, 4)}},
  note={${record.id}, Monte Albán Inscription Registry}
}`;
}

// ─── Clipboard ───────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── Annotation Types List ───────────────────────────────────────

export const ANNOTATION_TYPES = [
  "segmentation hypothesis",
  "bibliographic note",
  "interpretive note",
  "correction",
  "field observation",
  "photo request response",
] as const;

export const CONFIDENCE_LEVELS: Confidence[] = [
  "low",
  "cautious",
  "moderate",
  "high",
];

export const PHOTO_REQUEST_TYPES = [
  "closer crop",
  "wider context",
  "left angle",
  "right angle",
  "morning light",
  "afternoon light",
  "raking light",
  "surface texture",
  "scale reference if permitted",
  "nearby carved elements",
  "other",
] as const;
