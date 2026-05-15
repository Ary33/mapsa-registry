// ─── MAPSA Data Model ────────────────────────────────────────────
// Clean TypeScript interfaces ready for Supabase migration.
// When migrating: these become your row types + Supabase generated types.

export type ImageType =
  | "full_object"
  | "inscription_zone"
  | "detail"
  | "left_angle"
  | "right_angle"
  | "raking_light"
  | "enhanced"
  | "drawing_overlay";

export type OverlayType =
  | "line_drawing"
  | "candidate_elements"
  | "grouping_hypothesis";

export type OverlayConfidence = "observational" | "interpretive" | "uncertain";

export type SegmentationStatus =
  | "clear independent element"
  | "probable independent element"
  | "possible sub-element"
  | "possible numeral/coefficient"
  | "possible affix/modifier"
  | "possible compound component"
  | "uncertain"
  | "not segmented";

export type Confidence = "low" | "cautious" | "moderate" | "high";

export type ProposedRelationship =
  | "belong together"
  | "may belong together"
  | "likely separate"
  | "visually adjacent only"
  | "uncertain"
  | "current segmentation should be revised";

export type GroupingStatus =
  | "neutral default"
  | "published hypothesis"
  | "alternative hypothesis"
  | "disputed"
  | "superseded";

export type AnnotationType =
  | "segmentation hypothesis"
  | "bibliographic note"
  | "interpretive note"
  | "correction"
  | "field observation"
  | "photo request response";

export type AnnotationVisibility =
  | "public attributed"
  | "private advisory"
  | "anonymous public";

export type AnnotationStatus =
  | "pending"
  | "published"
  | "rejected"
  | "superseded";

export type PhotoRequestType =
  | "closer crop"
  | "wider context"
  | "left angle"
  | "right angle"
  | "morning light"
  | "afternoon light"
  | "raking light"
  | "surface texture"
  | "scale reference if permitted"
  | "nearby carved elements"
  | "other";

export type PhotoRequestStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "declined";

// ─── Core Interfaces ─────────────────────────────────────────────

export interface ImageAsset {
  id: string;
  type: ImageType;
  label: string;
  src: string;
  caption: string;
  photographer: string;
  date: string;
  isPrimaryEvidence: boolean;
}

export interface Overlay {
  id: string;
  recordId: string;
  type: OverlayType;
  label: string;
  author: string;
  date: string;
  basedOnImages: string[];
  confidence: OverlayConfidence;
  note: string;
  visibleByDefault: boolean;
}

export interface BoundingBox {
  x: number; // percentage
  y: number;
  width: number;
  height: number;
}

export interface CandidateElement {
  id: string;
  recordId: string;
  label: string;
  neutralDescription: string;
  segmentationStatus: SegmentationStatus;
  boundingBox: BoundingBox;
  confidence: Confidence;
  notes: string;
}

export interface GroupingHypothesis {
  id: string;
  recordId: string;
  title: string;
  elementIds: string[];
  proposedRelationship: ProposedRelationship;
  interpretation: string;
  interpretationCaution: string;
  contributorId: string;
  contributorName: string;
  sourceIds: string[];
  confidence: Confidence;
  status: GroupingStatus;
  version: string;
  dateSubmitted: string;
  citationText: string;
}

export interface Annotation {
  id: string;
  recordId: string;
  targetType: "record" | "element" | "grouping" | "source" | "image";
  targetId: string;
  contributorId: string;
  contributorName: string;
  affiliation?: string;
  orcid?: string;
  type: AnnotationType;
  body: string;
  sourcesCited: string[];
  confidence: Confidence;
  visibility: AnnotationVisibility;
  status: AnnotationStatus;
  version: string;
  dateSubmitted: string;
  citationText: string;
}

export interface Source {
  id: string;
  author: string;
  title: string;
  year: string;
  publication: string;
  pages?: string;
  url?: string;
  doi?: string;
  notes: string;
  relatedRecordIds: string[];
}

export interface PhotoRequest {
  id: string;
  recordId: string;
  requestedBy: string;
  affiliation?: string;
  email: string;
  requestTypes: PhotoRequestType[];
  message: string;
  permissionToCredit: boolean;
  status: PhotoRequestStatus;
  dateSubmitted: string;
}

export interface Contributor {
  id: string;
  name: string;
  affiliation?: string;
  orcid?: string;
  bio?: string;
  researchAreas: string[];
  contributions: string[];
}

export interface InscriptionRecord {
  id: string;
  fieldId: string;
  title: string;
  site: string;
  area: string;
  structure: string;
  objectType: string;
  locationDescription: string;
  datePhotographed: string;
  photographer: string;
  recordVersion: string;
  status: string[];
  description: string;
  condition: string;
  lightingNotes: string;
  interpretationStatus: string;
  segmentationStatus: string;
  images: ImageAsset[];
  overlays: Overlay[];
  elements: CandidateElement[];
  groupings: GroupingHypothesis[];
  annotations: Annotation[];
  sources: Source[];
  photoRequests: PhotoRequest[];
}
