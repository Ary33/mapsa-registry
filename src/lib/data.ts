import { supabase } from "./supabase";
import type {
  InscriptionRecord,
  CandidateElement,
  ImageAsset,
  GroupingHypothesis,
  Annotation,
  Source,
} from "./types";

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/overlays/`;
const PHOTOS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inscription-photos/`;

/** Resolve a storage path to a full public URL */
export function overlayUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${STORAGE_BASE}${path}`;
}

export function photoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // Check if path looks like it belongs in overlays bucket (background, base)
  // For now, all slab assets are in the overlays bucket
  return `${STORAGE_BASE}${path}`;
}

/** Fetch a single record with all related data */
export async function fetchRecord(
  recordId: string
): Promise<InscriptionRecord | null> {
  // Fetch record
  const { data: record, error: recErr } = await supabase
    .from("records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (recErr || !record) {
    console.error("Record fetch error:", recErr);
    return null;
  }

  // Fetch elements
  const { data: elements } = await supabase
    .from("elements")
    .select("*")
    .eq("record_id", recordId)
    .order("sort_order", { ascending: true });

  // Fetch images
  const { data: images } = await supabase
    .from("images")
    .select("*")
    .eq("record_id", recordId)
    .order("sort_order", { ascending: true });

  // Fetch groupings with contributor name
  const { data: groupings } = await supabase
    .from("groupings")
    .select("*, profiles:contributor_id(full_name, affiliation)")
    .eq("record_id", recordId)
    .order("created_at", { ascending: true });

  // Fetch published annotations with contributor info
  const { data: annotations } = await supabase
    .from("annotations")
    .select("*, profiles:contributor_id(full_name, affiliation, orcid)")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });

  // Fetch sources related to this record
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .contains("related_record_ids", [recordId]);

  // Transform groupings to flatten joined profile
  const transformedGroupings: GroupingHypothesis[] = (groupings || []).map(
    (g: any) => ({
      ...g,
      contributor_name: g.profiles?.full_name || "Unknown",
    })
  );

  // Transform annotations to flatten joined profile
  const transformedAnnotations: Annotation[] = (annotations || []).map(
    (a: any) => ({
      ...a,
      contributor_name: a.profiles?.full_name || "Unknown",
      contributor_affiliation: a.profiles?.affiliation || null,
      contributor_orcid: a.profiles?.orcid || null,
    })
  );

  return {
    ...record,
    images: (images || []) as ImageAsset[],
    elements: (elements || []) as CandidateElement[],
    groupings: transformedGroupings,
    annotations: transformedAnnotations,
    sources: (sources || []) as Source[],
  } as InscriptionRecord;
}

/** Fetch all records (summary only, for dashboard) */
export async function fetchAllRecords(): Promise<
  Omit<InscriptionRecord, "images" | "elements" | "groupings" | "annotations" | "sources">[]
> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Records fetch error:", error);
    return [];
  }

  return data || [];
}

/** Submit a new annotation to Supabase */
export async function submitAnnotation(annotation: {
  record_id: string;
  target_type: string;
  target_id: string;
  contributor_id: string;
  type: string;
  body: string;
  sources_cited: string[];
  confidence: string;
  visibility: string;
}): Promise<{ data: Annotation | null; error: any }> {
  const { data, error } = await supabase
    .from("annotations")
    .insert({
      ...annotation,
      status: "published",
      version: "1.0",
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  return { data: data as Annotation | null, error };
}

/** Submit a new grouping hypothesis to Supabase */
export async function submitGrouping(grouping: {
  record_id: string;
  title: string;
  element_ids: string[];
  proposed_relationship: string;
  interpretation: string;
  interpretation_caution: string;
  contributor_id: string;
  source_ids: string[];
  confidence: string;
  parent_grouping_id?: string | null;
}): Promise<{ data: GroupingHypothesis | null; error: any }> {
  // Resolve the version label. UUID stays the functional id; version_label is
  // the human-facing lineage marker ("G01.2"). When deriving from a parent we
  // read every version already in that family and take the next free number.
  let versionLabel: string | null = null;
  const parentId = grouping.parent_grouping_id ?? null;

  if (parentId) {
    const { data: parent } = await supabase
      .from("groupings")
      .select("version_label, record_id")
      .eq("id", parentId)
      .single();

    const parentLabel: string | null = (parent as any)?.version_label ?? null;
    const stemMatch = parentLabel ? parentLabel.match(/^(G\d+)/) : null;
    const stem = stemMatch ? stemMatch[1] : null;

    if (stem) {
      const { data: family } = await supabase
        .from("groupings")
        .select("version_label")
        .eq("record_id", grouping.record_id)
        .like("version_label", `${stem}.%`);

      let maxMinor = 0;
      for (const row of family || []) {
        const m = (row as any).version_label?.match(/^G\d+\.(\d+)$/);
        if (m) maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
      }
      versionLabel = `${stem}.${maxMinor + 1}`;
    }
  }

  const { data, error } = await supabase
    .from("groupings")
    .insert({
      ...grouping,
      parent_grouping_id: parentId,
      version_label: versionLabel,
      status: "alternative hypothesis",
      version: "1.0",
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .select("*, profiles:contributor_id(full_name, affiliation)")
    .single();

  const transformed = data
    ? ({ ...data, contributor_name: (data as any).profiles?.full_name || "Unknown" } as GroupingHypothesis)
    : null;

  return { data: transformed, error };
}
