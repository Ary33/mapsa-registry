"use client";

import { useState, useCallback } from "react";
import type {
  InscriptionRecord,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import { CONFIDENCE_ICON, CONFIDENCE_LEVELS } from "@/lib/utils";
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

export default function GlyphSidebar({
  record, annotations, selectedElements, lockedEls, matchingGroupings,
  multiSelect, hiddenSubs, isMobile, onToggleSub, onToggleMultiSelect, onSelectElement, onSelectGrouping,
  onSubmitAnnotation, onAddGrouping,
}: GlyphSidebarProps) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<SidebarMode>("glyph");
  const [photoSubmitted, setPhotoSubmitted] = useState(false);

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

  // ── Submit grouping ──
  const handleSubmitGroup = useCallback(async () => {
    if (!profile || lockedEls.length < 2 || !groupTitle.trim()) return;
    setGroupSubmitting(true);
    const { data, error } = await submitGrouping({
      record_id: record.id,
      title: groupTitle.trim(),
      element_ids: lockedEls,
      proposed_relationship: groupRelationship,
      interpretation: groupInterpretation.trim(),
      interpretation_caution: groupCaution.trim(),
      contributor_id: profile.id,
      source_ids: [],
      confidence: groupConfidence,
    });
    setGroupSubmitting(false);
    if (error) { console.error("Group submission error:", error); return; }
    if (data) {
      onAddGrouping({ ...data, contributor_name: profile.full_name });
      setGroupSuccess(true);
      setGroupTitle(""); setGroupInterpretation(""); setGroupCaution("");
      setTimeout(() => setGroupSuccess(false), 3000);
    }
  }, [profile, record.id, lockedEls, groupTitle, groupRelationship, groupInterpretation, groupCaution, groupConfidence, onAddGrouping]);

  // ── Submit group annotation ──
  const handleSubmitGroupAnnotation = useCallback(async () => {
    if (!profile || lockedEls.length < 2 || !groupAnnotation.trim()) return;
    setGroupAnnSubmitting(true);
    const { data, error } = await submitAnnotation({
      record_id: record.id,
      target_type: "grouping",
      target_id: lockedEls.join("+"),
      contributor_id: profile.id,
      type: "interpretive note",
      body: groupAnnotation.trim(),
      sources_cited: [],
      confidence: groupAnnConfidence,
      visibility: "public attributed",
    });
    setGroupAnnSubmitting(false);
    if (error) { console.error("Group annotation error:", error); return; }
    if (data) {
      setGroupAnnSuccess(true);
      setGroupAnnotation("");
      setTimeout(() => setGroupAnnSuccess(false), 3000);
    }
  }, [profile, record.id, lockedEls, groupAnnotation, groupAnnConfidence]);

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
          {/* ── GROUP MODE UI ── */}
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
                {/* Set Group form */}
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
                    <textarea className="mapsa-input min-h-[40px] resize-y" placeholder="Optional: uncertainties, alternative readings..."
                      value={groupCaution} onChange={(e) => setGroupCaution(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label className="mapsa-label">Confidence</label>
                    <select className="mapsa-input" value={groupConfidence}
                      onChange={(e) => setGroupConfidence(e.target.value)}>
                      {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_ICON[c]} {c}</option>)}
                    </select>
                  </div>

                  {!profile ? (
                    <p className="text-xs text-mapsa-muted italic">Sign in to submit groupings.</p>
                  ) : (
                    <button className="mapsa-btn-gold w-full" disabled={groupSubmitting || !groupTitle.trim()}
                      onMouseDown={(e) => { e.preventDefault(); handleSubmitGroup(); }}>
                      {groupSubmitting ? "Submitting..." : groupSuccess ? "✓ Group Saved" : "Save Group"}
                    </button>
                  )}
                </div>

                {/* Quick annotation for group */}
                <div className="border border-mapsa-border rounded-md p-4 bg-mapsa-panel-alt">
                  <div className="mapsa-section-label mb-3">Annotate This Group</div>

                  <div className="mb-2.5">
                    <label className="mapsa-label">Annotation</label>
                    <textarea className="mapsa-input min-h-[70px] resize-y" placeholder="Your observation about this group of elements..."
                      value={groupAnnotation} onChange={(e) => setGroupAnnotation(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label className="mapsa-label">Confidence</label>
                    <select className="mapsa-input" value={groupAnnConfidence}
                      onChange={(e) => setGroupAnnConfidence(e.target.value)}>
                      {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_ICON[c]} {c}</option>)}
                    </select>
                  </div>

                  {!profile ? (
                    <p className="text-xs text-mapsa-muted italic">Sign in to submit annotations.</p>
                  ) : (
                    <button className="mapsa-btn-gold w-full" disabled={groupAnnSubmitting || !groupAnnotation.trim()}
                      onMouseDown={(e) => { e.preventDefault(); handleSubmitGroupAnnotation(); }}>
                      {groupAnnSubmitting ? "Submitting..." : groupAnnSuccess ? "✓ Annotation Saved" : "Submit Annotation"}
                    </button>
                  )}
                </div>

                {/* Existing groupings that match */}
                {matchingGroupings.length > 0 && (
                  <div>
                    <div className="mapsa-section-label">Existing Groupings</div>
                    {matchingGroupings.map((g) => (
                      <div key={g.id} className="mb-2 p-3 rounded border border-mapsa-border bg-mapsa-panel-alt cursor-pointer hover:border-mapsa-gold/40"
                        onClick={() => onSelectGrouping(g)}>
                        <span className="font-cinzel text-sm text-mapsa-gold font-semibold">{g.title}</span>
                        <p className="font-garamond text-xs text-mapsa-text italic mt-1">{g.interpretation}</p>
                        <p className="font-garamond text-[0.56rem] text-mapsa-muted mt-1">
                          {g.contributor_name} · {CONFIDENCE_ICON[g.confidence]} {g.confidence}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !hasSelection ? (
            /* ── Empty state ── */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-7 text-center opacity-40">
              <span className="text-3xl">◈</span>
              <span className="font-cinzel text-sm tracking-[0.15em] text-mapsa-gold/80">Select a Glyph</span>
              <span className="font-garamond text-sm text-mapsa-muted leading-relaxed max-w-[230px]">
                Select a glyph to view its description, groupings, and annotations.
                Use Group Select to combine multiple glyphs.
              </span>
            </div>
          ) : (
            /* ── Single/multi selection (non-group mode) ── */
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4 pb-3 border-b border-mapsa-border">
                <div className="font-mono text-[0.56rem] tracking-[0.17em] text-mapsa-gold/70 uppercase mb-1.5 leading-relaxed">
                  {singleEl
                    ? `Element ${singleEl.label} · ${record.structure} · ${record.id}`
                    : `${selectedElements.length} Elements Selected · ${record.id}`}
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
                    {/* Sub-layer toggles for split elements */}
                    {singleEl.inferred_overlay_path && lockedEls.includes(singleEl.id) && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onMouseDown={(e) => { e.preventDefault(); onToggleSub(`${singleEl.label}-relief`); }}
                          className={`mapsa-btn text-2xs ${!hiddenSubs.has(`${singleEl.label}-relief`) ? 'mapsa-btn-active' : ''}`}
                          style={{ borderColor: '#c8a96e' }}
                        >Relief {!hiddenSubs.has(`${singleEl.label}-relief`) ? '✓' : '✗'}</button>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); onToggleSub(`${singleEl.label}-inferred`); }}
                          className={`mapsa-btn text-2xs ${!hiddenSubs.has(`${singleEl.label}-inferred`) ? 'mapsa-btn-active' : ''}`}
                          style={{ borderColor: '#7ea8be' }}
                        >Inferred {!hiddenSubs.has(`${singleEl.label}-inferred`) ? '✓' : '✗'}</button>
                      </div>
                    )}
                  </div>
                )}

                {!singleEl && selectedElements.map((el) => (
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

                {matchingGroupings.length > 0 && (
                  <div>
                    <div className="mapsa-section-label">Grouping Hypotheses</div>
                    {matchingGroupings.map((g) => (
                      <div key={g.id} className="mb-3 p-3 rounded border border-mapsa-border bg-mapsa-panel-alt cursor-pointer hover:border-mapsa-gold/40 transition-colors"
                        onClick={() => onSelectGrouping(g)}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-cinzel text-sm text-mapsa-gold font-semibold">{g.title}</span>
                          <span className="mapsa-tag text-[0.5rem]">{g.status}</span>
                        </div>
                        <p className="font-garamond text-xs text-mapsa-text italic leading-relaxed">{g.interpretation}</p>
                        {g.interpretation_caution && <p className="font-garamond text-xs text-mapsa-muted mt-1">⚠ {g.interpretation_caution}</p>}
                        <span className="font-garamond text-[0.6rem] text-mapsa-muted">
                          {g.contributor_name} · v{g.version} · {g.created_at?.split('T')[0]} · {CONFIDENCE_ICON[g.confidence]} {g.confidence}</span>
                      </div>
                    ))}
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

          {/* Legend + nav */}
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
