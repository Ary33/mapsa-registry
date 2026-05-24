// ─── MAPSA Data Model ────────────────────────────────────────────
// TypeScript interfaces matching the Supabase schema.
// Used for both client-side rendering and Supabase query typing.

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
  | "draft"
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
  record_id: string;
  type: ImageType;
  label: string;
  storage_path: string;
  caption: string;
  photographer: string;
  date_taken: string;
  is_primary_evidence: boolean;
  sort_order: number;
}

export interface Overlay {
  id: string;
  record_id: string;
  type: OverlayType;
  label: string;
  storage_path: string | null;
  based_on_images: string[];
  confidence: OverlayConfidence;
  note: string;
  visible_by_default: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BBoxZone {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CandidateElement {
  id: string;
  record_id: string;
  label: string;
  neutral_description: string;
  segmentation_status: SegmentationStatus;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  confidence: Confidence;
  notes: string;
  overlay_path: string | null;
  inferred_overlay_path: string | null;
  sort_order: number;
  bbox_zones: BBoxZone[];
}

export interface GroupingHypothesis {
  id: string;
  record_id: string;
  title: string;
  element_ids: string[];
  proposed_relationship: ProposedRelationship;
  interpretation: string;
  interpretation_caution: string;
  contributor_id: string;
  source_ids: string[];
  confidence: Confidence;
  status: GroupingStatus;
  version: string;
  is_published: boolean;
  citation_text: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  contributor_name?: string;
}

export interface Annotation {
  id: string;
  record_id: string;
  target_type: "record" | "element" | "grouping" | "source" | "image";
  target_id: string;
  contributor_id: string;
  type: AnnotationType;
  body: string;
  sources_cited: string[];
  confidence: Confidence;
  visibility: AnnotationVisibility;
  status: AnnotationStatus;
  version: string;
  is_published: boolean;
  citation_text: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  contributor_name?: string;
  contributor_affiliation?: string;
  contributor_orcid?: string;
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
  related_record_ids: string[];
}

export interface PhotoRequest {
  id: string;
  record_id: string;
  requested_by: string;
  request_types: PhotoRequestType[];
  message: string;
  permission_to_credit: boolean;
  status: PhotoRequestStatus;
  created_at: string;
}

export interface Contributor {
  id: string;
  full_name: string;
  affiliation?: string;
  orcid?: string;
  bio?: string;
  research_areas: string[];
  role: string;
}

export interface InscriptionRecord {
  id: string;
  field_id: string;
  title: string;
  site: string;
  area: string;
  structure: string;
  object_type: string;
  location_description: string;
  date_photographed: string;
  photographer: string;
  record_version: string;
  status: string[];
  description: string;
  condition: string;
  lighting_notes: string;
  interpretation_status: string;
  segmentation_status: string;
  background_path: string | null;
  base_overlay_path: string | null;
  // Joined relations
  images: ImageAsset[];
  elements: CandidateElement[];
  groupings: GroupingHypothesis[];
  annotations: Annotation[];
  sources: Source[];
}
