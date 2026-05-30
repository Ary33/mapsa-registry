"use client";

import { useState, useCallback } from "react";
import type {
  InscriptionRecord,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import { CONFIDENCE_ICON, CONFIDENCE_LEVELS, reportProblemMailto } from "@/lib/utils";
import { submitGrouping, submitAnnotation } from "@/lib/data";
import { useAuth } from "@/lib/AuthContext";
import AnnotationsTab from "./sidebar/AnnotationsTab";
import EvidenceTab from "./sidebar/EvidenceTab";
import SourcesTab from "./sidebar/SourcesTab";
import CitationTab from "./sidebar/CitationTab";
import PhotoRequestTab from "./sidebar/PhotoRequestTab";

interface GlyphSidebarProps {
  record: InscriptionRecord;
  annotations: Annotation[];
  selectedElements: CandidateElement[];
  lockedEls: string[];
  matchingGroupings: GroupingHypothesis[];
  multiSelect: boolean;
  hiddenSubs: Set<string>;
  isMobile: boolean;
  activeGroupId: string | null;
  onSetActiveGroup: (id: string | null) => void;
  onToggleSub: (key: string) => void;
  onToggleMultiSelect: () => void;
  onSelectElement: (el: CandidateElement) => void;
  onSelectGrouping: (g: GroupingHypothesis) => void;
  onSubmitAnnotation: (form: AnnotationFormData) => void;
  onAddGrouping: (g: GroupingHypothesis) => void;
}

type SidebarMode = "glyph" | "evidence" | "annotations" | "sources" | "citation" | "photo";

const RELATIONSHIP_OPTIONS = [
  "belong together",
  "may belong together",
  "likely separate",
  "visually adjacent only",
  "uncertain",
  "current segmentation should be revised",
] as const;

// Confidence badge colors
const CONF_COLORS: Record<string, string> = {
  high: '#c8a96e',
  moderate: '#a89060',
  cautious: '#7a6f5f',
  low: '#5a5248',
};

export default function GlyphSidebar({
  record, annotations, selectedElements, lockedEls, matchingGroupings,
  multiSelect, hiddenSubs, isMobile, activeGroupId, onSetActiveGroup, onToggleSub, onToggleMultiSelect, onSelectElement, onSelectGrouping,
  onSubmitAnnotation, onAddGrouping,
}: GlyphSidebarProps) {
  const { profile, isResearcher, isAdmin, isPending } = useAuth();
  const canContribute = isResearcher || isAdmin;
  const [mode, setMode] = useState<SidebarMode>("glyph");
  const [photoSubmitted, setPhotoSubmitted] = useState(false);
  const [showBrowse, setShowBrowse] = useState(true);

  // Group form state
  const [groupTitle, setGroupTitle] = useState("");
  const [groupRelationship, setGroupRelationship] = useState<string>("may belong together");
  const [groupInterpretation, setGroupInterpretation] = useState("");
  const [groupCaution, setGroupCaution] = useState("");
  const [groupConfidence, setGroupConfidence] = useState("cautious");
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupSuccess, setGroupSuccess] = useState(false);

  // Group annotation form
  const [groupAnnotation, setGroupAnnotation] = useState("");
  const [groupAnnConfidence, setGroupAnnConfidence] = useState("cautious");
  const [groupAnnSubmitting, setGroupAnnSubmitting] = useState(false);
  const [groupAnnSuccess, setGroupAnnSuccess] = useState(false);

  const hasSelection = selectedElements.length > 0;
  const singleEl = selectedElements.length === 1 ? selectedElements[0] : null;

  const relevantAnnotations = annotations.filter(
    (ann) => selectedElements.some((el) => ann.target_id === el.id) || ann.target_id === record.id
  );

  // Get element labels for a grouping
  function getGroupLabels(g: GroupingHypothesis): string {
    return record.elements
      .filter((el) => g.element_ids.includes(el.id))
      .map((el) => el.label)
      .join(', ');
  }

  // If the current locked selection is a strict superset of an existing
  // grouping's element set, treat that grouping as the parent we're expanding.
  // Prefer the active grouping if it qualifies; otherwise the largest subset match.
  const lockedSet = new Set(lockedEls);
  const expandParent: GroupingHypothesis | null = (() => {
    const candidates = record.groupings.filter(
      (g) =>
        g.element_ids.length >= 2 &&
        g.element_ids.length < lockedEls.length &&
        g.element_ids.every((id) => lockedSet.has(id))
    );
    if (candidates.length === 0) return null;
    if (activeGroupId) {
      const act = candidates.find((g) => g.id === activeGroupId);
      if (act) return act;
    }
    return candidates.sort((a, b) => b.element_ids.length - a.element_ids.length)[0];
  })();
  const expandParentId: string | null = expandParent?.id ?? null;

  function handleSelectGroupCard(g: GroupingHypothesis) {
    const next = activeGroupId === g.id ? null : g.id;
    onSetActiveGroup(next);
    if (next) onSelectGrouping(g);
  }

  // ── Submit grouping ──
  const handleSubmitGroup = useCallback(async () => {
    if (!profile || !canContribute || lockedEls.length < 2 || !groupTitle.trim()) return;
    setGroupSubmitting(true);
    const { data, error } = await submitGrouping({
      record_id: record.id, title: groupTitle.trim(), element_ids: lockedEls,
      proposed_relationship: groupRelationship, interpretation: groupInterpretation.trim(),
      interpretation_caution: groupCaution.trim(), contributor_id: profile.id,
      source_ids: [], confidence: groupConfidence,
      parent_grouping_id: expandParentId,
    });
    setGroupSubmitting(false);
    if (error) { console.error("Group submission error:", error); return; }
    if (data) {
      onAddGrouping({ ...data, contributor_name: profile.full_name });
      setGroupSuccess(true);
      setGroupTitle(""); setGroupInterpretation(""); setGroupCaution("");
      setTimeout(() => setGroupSuccess(false), 3000);
    }
  }, [profile, canContribute, record.id, lockedEls, groupTitle, groupRelationship, groupInterpretation, groupCaution, groupConfidence, expandParentId, onAddGrouping]);

  // ── Submit group annotation ──
  const handleSubmitGroupAnnotation = useCallback(async () => {
    if (!profile || !canContribute || !groupAnnotation.trim()) return;
    // If an established grouping is active, attach to its UUID so the annotation
    // joins that grouping's thread. Otherwise fall back to the ad-hoc element set.
    const targetIsGrouping = !!activeGroupId;
    const targetId = activeGroupId || lockedEls.join("+");
    if (!targetIsGrouping && lockedEls.length < 2) return;
    setGroupAnnSubmitting(true);
    const { data, error } = await submitAnnotation({
      record_id: record.id, target_type: "grouping",
      target_id: targetId,
      contributor_id: profile.id, type: "interpretive note", body: groupAnnotation.trim(),
      sources_cited: [], confidence: groupAnnConfidence, visibility: "public attributed",
    });
    setGroupAnnSubmitting(false);
    if (error) { console.error("Group annotation error:", error); return; }
    if (data) {
      setGroupAnnSuccess(true); setGroupAnnotation("");
      setTimeout(() => setGroupAnnSuccess(false), 3000);
    }
  }, [profile, canContribute, record.id, activeGroupId, lockedEls, groupAnnotation, groupAnnConfidence]);

  return (
    <div className="w-full lg:w-[420px] shrink-0 bg-mapsa-panel flex flex-col overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-mapsa-border overflow-x-auto shrink-0">
        {([
          ["glyph", "Glyphs"],
          ["evidence", "Evidence"],
          ["annotations", "Annotations"],
          ["sources", "Sources"],
          ["citation", "Cite"],
          ["photo", "Photo Req"],
        ] as [SidebarMode, string][]).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`mapsa-tab ${mode === m ? 'mapsa-tab-active' : ''}`}>
            {label}
            {m === 'glyph' && lockedEls.length > 0 && (
              <span className="ml-1 text-[0.5rem] text-mapsa-gold">({lockedEls.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Glyph Mode ─── */}
      {mode === "glyph" && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* ══ GROUP MODE UI ══ */}
          {multiSelect && lockedEls.length >= 2 ? (
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4 pb-3 border-b border-mapsa-border">
                <div className="font-mono text-[0.56rem] tracking-[0.17em] text-mapsa-gold/70 uppercase mb-1.5">
                  Group Mode · {lockedEls.length} elements selected
                </div>
                <div className="font-cinzel text-lg font-bold text-mapsa-gold-light leading-tight">
                  {selectedElements.map((el) => el.label).join(" + ")}
                </div>
              </div>
              <div className="px-5 py-4 flex flex-col gap-5">
                <div className="border border-mapsa-border rounded-md p-4 bg-mapsa-panel-alt">
                  <div className="mapsa-section-label mb-3">Set Group</div>
                  <div className="mb-2.5">
                    <label className="mapsa-label">Group Title</label>
                    <input className="mapsa-input" placeholder="e.g. Cartouche Assembly"
                      value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} />
                  </div>
                  <div className="mb-2.5">
                    <label className="mapsa-label">Proposed Relationship</label>
                    <select className="mapsa-input" value={groupRelationship}
                      onChange={(e) => setGroupRelationship(e.target.value)}>
                      {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="mb-2.5">
                    <label className="mapsa-label">Interpretation</label>
                    <textarea className="mapsa-input min-h-[60px] resize-y" placeholder="Why these elements belong together..."
                      value={groupInterpretation} onChange={(e) => setGroupInterpretation(e.target.value)} />
                  </div>
                  <div className="mb-2.5">
                    <label className="mapsa-label">Caution / Caveats</label>
                    <textarea className="mapsa-input min-h-[40px] resize-y" placeholder="Optional: uncertainties..."
                      value={groupCaution} onChange={(e) => setGroupCaution(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="mapsa-label">Confidence</label>
                    <select className="mapsa-input" value={groupConfidence}
                      onChange={(e) => setGroupConfidence(e.target.value)}>
                      {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_ICON[c]} {c}</option>)}
                    </select>
                  </div>
                  {!canContribute ? (
                    <p className="text-xs text-mapsa-muted italic">
                      {isPending ? "Your account is awaiting approval before you can propose groupings." : "Sign in as an approved researcher to submit groupings."}
                    </p>
                  ) : (
                    <button className="mapsa-btn-gold w-full" disabled={groupSubmitting || !groupTitle.trim()}
                      onMouseDown={(e) => { e.preventDefault(); handleSubmitGroup(); }}>
                      {groupSubmitting ? "Submitting..." : groupSuccess ? "✓ Group Saved" : "Save Group"}</button>
                  )}
                </div>
                <div className="border border-mapsa-border rounded-md p-4 bg-mapsa-panel-alt">
                  <div className="mapsa-section-label mb-3">Annotate This Group</div>
                  <div className="mb-2.5">
                    <label className="mapsa-label">Annotation</label>
                    <textarea className="mapsa-input min-h-[70px] resize-y" placeholder="Your observation..."
                      value={groupAnnotation} onChange={(e) => setGroupAnnotation(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="mapsa-label">Confidence</label>
                    <select className="mapsa-input" value={groupAnnConfidence}
                      onChange={(e) => setGroupAnnConfidence(e.target.value)}>
                      {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_ICON[c]} {c}</option>)}
                    </select>
                  </div>
                  {!canContribute ? (
                    <p className="text-xs text-mapsa-muted italic">
                      {isPending ? "Your account is awaiting approval before you can annotate." : "Sign in as an approved researcher to submit annotations."}
                    </p>
                  ) : (
                    <button className="mapsa-btn-gold w-full" disabled={groupAnnSubmitting || !groupAnnotation.trim()}
                      onMouseDown={(e) => { e.preventDefault(); handleSubmitGroupAnnotation(); }}>
                      {groupAnnSubmitting ? "Submitting..." : groupAnnSuccess ? "✓ Saved" : "Submit Annotation"}</button>
                  )}
                </div>
                {matchingGroupings.length > 0 && (
                  <div>
                    <div className="mapsa-section-label">Existing Groupings</div>
                    {matchingGroupings.map((g) => (
                      <div key={g.id} className="mb-2 p-3 rounded border border-mapsa-border bg-mapsa-panel-alt cursor-pointer hover:border-mapsa-gold/40"
                        onClick={() => onSelectGrouping(g)}>
                        <span className="font-cinzel text-sm text-mapsa-gold font-semibold">{g.title}</span>
                        <p className="font-garamond text-xs text-mapsa-text italic mt-1">{g.interpretation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* ══ NORMAL MODE ══ */
            <div className="flex-1 overflow-y-auto">

              {/* ── Selected Element Detail (appears on top, smooth transition) ── */}
              <div style={{
                maxHeight: (hasSelection && !activeGroupId) ? '2000px' : '0',
                opacity: (hasSelection && !activeGroupId) ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, opacity 0.25s ease',
              }}>
              {hasSelection && !activeGroupId && (
                <div>
                  <div className="px-5 pt-4 pb-3 border-b border-mapsa-border">
                    <div className="font-mono text-[0.56rem] tracking-[0.17em] text-mapsa-gold/70 uppercase mb-1.5 leading-relaxed">
                      {singleEl
                        ? `Element ${singleEl.label} · ${record.structure} · ${record.id}`
                        : `${selectedElements.length} Elements · ${record.id}`}
                    </div>
                    <div className="font-cinzel text-lg font-bold text-mapsa-gold-light leading-tight">
                      {singleEl ? singleEl.label : selectedElements.map((el) => el.label).join(" + ")}
                    </div>
                    {singleEl && (
                      <div className="font-garamond text-sm text-mapsa-muted italic mt-1">{singleEl.segmentation_status}</div>
                    )}
                  </div>

                  <div className="px-5 py-4 flex flex-col gap-4">
                    {singleEl && (
                      <div>
                        <div className="mapsa-section-label">Epigraphic Description</div>
                        <p className="font-garamond text-sm leading-[1.75] text-mapsa-text">{singleEl.neutral_description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <span className="mapsa-tag">{CONFIDENCE_ICON[singleEl.confidence]} {singleEl.confidence}</span>
                          <span className="mapsa-tag mapsa-tag-epi">{singleEl.segmentation_status}</span>
                          {singleEl.inferred_overlay_path && (
                            <span className="mapsa-tag" style={{ borderColor: '#7ea8be', color: '#7ea8be' }}>has inferred reconstruction</span>
                          )}
                        </div>
                        {singleEl.inferred_overlay_path && lockedEls.includes(singleEl.id) && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onMouseDown={(e) => { e.preventDefault(); onToggleSub(`${singleEl.label}-relief`); }}
                              className={`mapsa-btn text-2xs ${!hiddenSubs.has(`${singleEl.label}-relief`) ? 'mapsa-btn-active' : ''}`}
                              style={{ borderColor: '#c8a96e' }}>
                              Relief {!hiddenSubs.has(`${singleEl.label}-relief`) ? '✓' : '✗'}</button>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); onToggleSub(`${singleEl.label}-inferred`); }}
                              className={`mapsa-btn text-2xs ${!hiddenSubs.has(`${singleEl.label}-inferred`) ? 'mapsa-btn-active' : ''}`}
                              style={{ borderColor: '#7ea8be' }}>
                              Inferred {!hiddenSubs.has(`${singleEl.label}-inferred`) ? '✓' : '✗'}</button>
                          </div>
                        )}
                      </div>
                    )}

                    {!singleEl && !activeGroupId && selectedElements.map((el) => (
                      <div key={el.id} className="border-l-2 border-mapsa-gold/30 pl-3">
                        <p className="font-mono text-xs text-mapsa-gold-light font-semibold">{el.label}</p>
                        <p className="font-garamond text-sm text-mapsa-text leading-relaxed">{el.neutral_description}</p>
                        <span className="mapsa-tag text-[0.5rem] mt-1 inline-block">{CONFIDENCE_ICON[el.confidence]} {el.confidence}</span>
                      </div>
                    ))}

                    {singleEl?.notes && (
                      <div>
                        <div className="mapsa-section-label">Notes</div>
                        <p className="font-garamond text-sm text-mapsa-muted leading-relaxed">{singleEl.notes}</p>
                      </div>
                    )}

                    {relevantAnnotations.length > 0 && (
                      <div>
                        <div className="mapsa-section-label">Annotations</div>
                        {relevantAnnotations.filter((a) => a.status === 'published' || a.status === 'pending').slice(0, 5).map((ann) => (
                          <div key={ann.id} className="mb-2.5 border-l-2 border-mapsa-gold/30 pl-3">
                            <p className="font-mono text-[0.5rem] text-mapsa-gold/70 mb-0.5">
                              {ann.contributor_name}{ann.contributor_affiliation && ` · ${ann.contributor_affiliation}`}</p>
                            <p className="font-garamond text-xs text-mapsa-text leading-relaxed">{ann.body}</p>
                            <p className="font-garamond text-[0.56rem] text-mapsa-muted italic mt-0.5">
                              {ann.type} · {ann.created_at?.split('T')[0]} · {CONFIDENCE_ICON[ann.confidence]} {ann.confidence}
                              {ann.status === 'pending' && ' · ⏳ pending'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* ── Groupings Grid (always visible, pushed down by element detail) ── */}
              {showBrowse && record.groupings.length > 0 && (
                <div className="px-4 py-3 border-t border-mapsa-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setShowBrowse((p) => !p); }}
                      className="mapsa-btn text-2xs mapsa-btn-active">
                      ◈ Groupings
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {record.groupings.map((g) => {
                      const isActive = activeGroupId === g.id;
                      const labels = getGroupLabels(g);
                      const confColor = CONF_COLORS[g.confidence] || '#7a6f5f';
                      return (
                        <div key={g.id}
                          className="rounded-md border cursor-pointer transition-all"
                          style={{
                            borderColor: isActive ? '#c8a96e' : '#3a332c',
                            background: isActive ? 'rgba(200,169,110,0.08)' : '#1f1a14',
                          }}
                          onClick={() => handleSelectGroupCard(g)}>
                          <div className="p-2.5">
                            <div className="font-cinzel text-[0.65rem] text-mapsa-gold leading-tight mb-1">
                              {(g.version_label ? `${g.version_label} · ` : '') + g.title.replace(/ \/ .*/, '')}
                            </div>
                            <div className="font-mono text-[0.5rem] text-mapsa-muted/60 mb-1.5 leading-snug">
                              {labels}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: confColor }} />
                              <span className="font-mono text-[0.45rem] text-mapsa-muted/50">{g.confidence}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Active Grouping Detail ── */}
              <div style={{
                maxHeight: activeGroupId ? '3000px' : '0',
                opacity: activeGroupId ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, opacity 0.25s ease',
              }}>
              {activeGroupId && (() => {
                const g = record.groupings.find((gr) => gr.id === activeGroupId);
                if (!g) return null;
                const labels = getGroupLabels(g);
                const heading = g.version_label ? `${g.version_label} · ${g.title}` : g.title;
                const groupAnns = annotations.filter(
                  (a) => a.target_id === g.id &&
                    (a.status === 'published' || a.status === 'pending')
                );
                const canExpandHere = expandParentId === g.id && lockedEls.length > g.element_ids.length;
                return (
                  <div className="px-4 pb-3">
                    <div className="border border-mapsa-gold/30 rounded-md p-4 bg-mapsa-panel-alt">
                      {/* Title / version */}
                      <div className="font-cinzel text-sm text-mapsa-gold font-semibold mb-1">
                        {heading}
                      </div>
                      {/* Element IDs */}
                      <div className="font-mono text-[0.56rem] text-mapsa-gold/60 mb-2">
                        {labels}
                      </div>
                      {/* Interpretation */}
                      <div className="mapsa-section-label mb-1">Interpretation</div>
                      <p className="font-garamond text-[0.81rem] text-mapsa-text leading-relaxed mb-2">
                        {g.interpretation || <span className="italic text-mapsa-muted">No interpretation provided.</span>}
                      </p>
                      {/* Caution / Caveats */}
                      {g.interpretation_caution && (
                        <>
                          <div className="mapsa-section-label mb-1">Caution / Caveats</div>
                          <p className="font-garamond text-[0.75rem] text-mapsa-muted italic leading-relaxed mb-2">
                            {g.interpretation_caution}
                          </p>
                        </>
                      )}
                      {/* Base Citation */}
                      <div className="mapsa-section-label mb-1">Base Citation</div>
                      <div className="font-mono text-[0.56rem] text-mapsa-muted/70 mb-2 leading-snug">
                        {g.citation_text || <span className="italic">Citation generated on publish.</span>}
                      </div>
                      {/* Confidence + status */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="mapsa-tag text-[0.5rem]">{CONFIDENCE_ICON[g.confidence]} {g.confidence}</span>
                        <span className="mapsa-tag text-[0.5rem]">{g.status}</span>
                        <span className="font-mono text-[0.5rem] text-mapsa-muted/50">{g.contributor_name}</span>
                      </div>
                      {/* Report a problem */}
                      <a
                        href={reportProblemMailto({ recordId: record.id, versionLabel: g.version_label, groupingId: g.id, title: g.title })}
                        className="inline-block font-mono text-[0.5rem] text-mapsa-muted/60 underline hover:text-mapsa-gold mt-1"
                      >
                        ⚐ Report a problem with this grouping
                      </a>
                    </div>

                    {/* ── This grouping's annotation thread ── */}
                    <div className="mt-3">
                      <div className="mapsa-section-label mb-1.5">
                        Annotations on this grouping ({groupAnns.length})
                      </div>
                      {groupAnns.length === 0 ? (
                        <p className="font-garamond text-xs text-mapsa-muted/60 italic mb-2">
                          No annotations yet. {canContribute ? 'Add the first below.' : ''}
                        </p>
                      ) : (
                        groupAnns.slice(0, 8).map((ann) => (
                          <div key={ann.id} className="mb-2 border-l-2 border-mapsa-gold/30 pl-3">
                            <p className="font-mono text-[0.5rem] text-mapsa-gold/70 mb-0.5">
                              {ann.contributor_name}{ann.contributor_affiliation && ` · ${ann.contributor_affiliation}`}</p>
                            <p className="font-garamond text-xs text-mapsa-text leading-relaxed">{ann.body}</p>
                            <p className="font-garamond text-[0.56rem] text-mapsa-muted italic mt-0.5">
                              {ann.type} · {ann.created_at?.split('T')[0]} · {CONFIDENCE_ICON[ann.confidence]} {ann.confidence}
                              {ann.status === 'pending' && ' · ⏳ pending'}</p>
                          </div>
                        ))
                      )}

                      {/* Annotate this grouping */}
                      {canContribute ? (
                        <div className="border border-mapsa-border rounded-md p-3 bg-mapsa-panel-alt mt-2">
                          <label className="mapsa-label">Annotate this grouping</label>
                          <textarea className="mapsa-input min-h-[60px] resize-y" placeholder="Your observation on this grouping..."
                            value={groupAnnotation} onChange={(e) => setGroupAnnotation(e.target.value)} />
                          <div className="flex items-center gap-2 mt-2">
                            <select className="mapsa-input flex-1" value={groupAnnConfidence}
                              onChange={(e) => setGroupAnnConfidence(e.target.value)}>
                              {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_ICON[c]} {c}</option>)}
                            </select>
                            <button className="mapsa-btn-gold" disabled={groupAnnSubmitting || !groupAnnotation.trim()}
                              onMouseDown={(e) => { e.preventDefault(); handleSubmitGroupAnnotation(); }}>
                              {groupAnnSubmitting ? "..." : groupAnnSuccess ? "✓" : "Post"}</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-mapsa-muted italic mt-2">
                          {isPending
                            ? "Your account is awaiting approval. Once approved you can annotate and propose groupings."
                            : "Sign in as an approved researcher to annotate this grouping."}
                        </p>
                      )}

                      {/* Expand into a new version */}
                      {canExpandHere && canContribute && (
                        <div className="border border-mapsa-gold/40 rounded-md p-3 bg-mapsa-panel-alt mt-3">
                          <div className="mapsa-section-label mb-1">Expand into a new version</div>
                          <p className="font-garamond text-[0.7rem] text-mapsa-muted leading-relaxed mb-2">
                            Your current selection adds {lockedEls.length - g.element_ids.length} element(s) to {g.version_label || g.title}.
                            Saving creates a new version in this family, attributed to you. The original is unchanged.
                          </p>
                          <input className="mapsa-input mb-2" placeholder="Title for the new version"
                            value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} />
                          <textarea className="mapsa-input min-h-[50px] resize-y mb-2" placeholder="Why expand this grouping?"
                            value={groupInterpretation} onChange={(e) => setGroupInterpretation(e.target.value)} />
                          <button className="mapsa-btn-gold w-full" disabled={groupSubmitting || !groupTitle.trim()}
                            onMouseDown={(e) => { e.preventDefault(); handleSubmitGroup(); }}>
                            {groupSubmitting ? "Saving..." : groupSuccess ? "✓ New version saved" : "Save as new version"}</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              </div>

              {/* ── Collapsed groupings toggle ── */}
              {!showBrowse && (
                <div className="px-4 py-3">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setShowBrowse(true); }}
                    className="mapsa-btn text-2xs">
                    ◇ Show Groupings
                  </button>
                </div>
              )}

              {/* ── Empty state ── */}
              {!hasSelection && !activeGroupId && record.groupings.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-7 text-center opacity-40 py-12">
                  <span className="text-3xl">◈</span>
                  <span className="font-cinzel text-sm tracking-[0.15em] text-mapsa-gold/80">Select a Glyph</span>
                  <span className="font-garamond text-sm text-mapsa-muted leading-relaxed max-w-[230px]">
                    Select a glyph to view its description, groupings, and annotations.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Legend + nav — desktop only */}
          {!isMobile && (
          <div className="shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt">
            <div className="px-4 py-2.5 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
              {record.elements.map((el) => {
                const isActive = lockedEls.includes(el.id);
                return (
                  <div key={el.id}
                    className={`flex items-center gap-2.5 text-sm cursor-pointer py-0.5 transition-colors ${isActive ? 'text-mapsa-gold' : 'text-mapsa-muted hover:text-mapsa-gold-light'}`}
                    onClick={() => onSelectElement(el)}>
                    <span className="w-2.5 h-2.5 rounded-sm border shrink-0" style={{
                      background: isActive ? 'var(--mapsa-gold, #c8a96e)' : 'rgba(212,168,75,0.1)',
                      borderColor: 'var(--mapsa-gold, #c8a96e)',
                    }} />
                    <span className="font-garamond text-xs">
                      {el.label} · {el.neutral_description.slice(0, 50)}{el.neutral_description.length > 50 ? '…' : ''}</span>
                    {el.inferred_overlay_path && <span className="text-[0.5rem] ml-auto shrink-0" style={{ color: '#7ea8be' }}>inf</span>}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-mapsa-border flex items-center justify-between">
              <button onMouseDown={(e) => { e.preventDefault(); onToggleMultiSelect(); }}
                className={`mapsa-btn text-2xs ${multiSelect ? 'mapsa-btn-active' : ''}`}>
                {multiSelect ? 'Exit Multi' : 'Multi-Select (M)'}</button>
              <span className="font-mono text-[0.56rem] text-mapsa-muted/50">
                {lockedEls.length ? `${lockedEls.length} / ${record.elements.length}` : `— / ${record.elements.length}`}</span>
            </div>
          </div>
          )}
        </div>
      )}

      {mode === "evidence" && <div className="flex-1 overflow-y-auto p-4"><EvidenceTab record={record} /></div>}
      {mode === "annotations" && <div className="flex-1 overflow-y-auto p-4"><AnnotationsTab annotations={annotations} onSubmit={onSubmitAnnotation} /></div>}
      {mode === "sources" && <div className="flex-1 overflow-y-auto p-4"><SourcesTab sources={record.sources} /></div>}
      {mode === "citation" && <div className="flex-1 overflow-y-auto p-4"><CitationTab record={record} selected={singleEl} /></div>}
      {mode === "photo" && <div className="flex-1 overflow-y-auto p-4"><PhotoRequestTab recordId={record.id} submitted={photoSubmitted} onSubmit={() => setPhotoSubmitted(true)} /></div>}
    </div>
  );
}
