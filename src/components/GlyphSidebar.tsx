"use client";

import type {
  InscriptionRecord,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import { CONFIDENCE_ICON } from "@/lib/utils";
import AnnotationsTab from "./sidebar/AnnotationsTab";
import EvidenceTab from "./sidebar/EvidenceTab";
import SourcesTab from "./sidebar/SourcesTab";
import CitationTab from "./sidebar/CitationTab";
import PhotoRequestTab from "./sidebar/PhotoRequestTab";
import { useState } from "react";

interface GlyphSidebarProps {
  record: InscriptionRecord;
  annotations: Annotation[];
  selectedElements: CandidateElement[];
  lockedEls: string[];
  matchingGroupings: GroupingHypothesis[];
  multiSelect: boolean;
  onToggleMultiSelect: () => void;
  onSelectElement: (el: CandidateElement) => void;
  onSelectGrouping: (g: GroupingHypothesis) => void;
  onSubmitAnnotation: (form: AnnotationFormData) => void;
}

type SidebarMode =
  | "glyph"
  | "evidence"
  | "annotations"
  | "sources"
  | "citation"
  | "photo";

export default function GlyphSidebar({
  record,
  annotations,
  selectedElements,
  lockedEls,
  matchingGroupings,
  multiSelect,
  onToggleMultiSelect,
  onSelectElement,
  onSelectGrouping,
  onSubmitAnnotation,
}: GlyphSidebarProps) {
  const [mode, setMode] = useState<SidebarMode>("glyph");
  const [photoSubmitted, setPhotoSubmitted] = useState(false);

  const hasSelection = selectedElements.length > 0;
  const singleEl = selectedElements.length === 1 ? selectedElements[0] : null;

  // Annotations for selected elements
  const relevantAnnotations = annotations.filter(
    (ann) =>
      selectedElements.some((el) => ann.target_id === el.id) ||
      ann.target_id === record.id
  );

  return (
    <div className="w-full lg:w-[420px] shrink-0 bg-mapsa-panel flex flex-col overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-mapsa-border overflow-x-auto shrink-0">
        {(
          [
            ["glyph", "Glyphs"],
            ["evidence", "Evidence"],
            ["annotations", "Annotations"],
            ["sources", "Sources"],
            ["citation", "Cite"],
            ["photo", "Photo Req"],
          ] as [SidebarMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`mapsa-tab ${mode === m ? "mapsa-tab-active" : ""}`}
          >
            {label}
            {m === "glyph" && lockedEls.length > 0 && (
              <span className="ml-1 text-[0.5rem] text-mapsa-gold">
                ({lockedEls.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Glyph Mode ─── */}
      {mode === "glyph" && (
        <div className="flex-1 flex flex-col min-h-0">
          {!hasSelection ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-7 text-center opacity-40">
              <span className="text-3xl">◈</span>
              <span className="font-cinzel text-sm tracking-[0.15em] text-mapsa-gold/80">
                Select a Glyph
              </span>
              <span className="font-garamond text-sm text-mapsa-muted leading-relaxed max-w-[230px]">
                Select a glyph to view its
                <br />
                description, groupings, and
                <br />
                annotations. Use Group Select
                <br />
                to combine multiple glyphs.
              </span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-mapsa-border">
                <div className="font-mono text-[0.56rem] tracking-[0.17em] text-mapsa-gold/70 uppercase mb-1.5 leading-relaxed">
                  {singleEl
                    ? `Element ${singleEl.label} · ${record.structure} · ${record.id}`
                    : `${selectedElements.length} Elements Selected · ${record.id}`}
                </div>
                <div className="font-cinzel text-lg font-bold text-mapsa-gold-light leading-tight">
                  {singleEl
                    ? singleEl.label
                    : selectedElements.map((el) => el.label).join(" + ")}
                </div>
                {singleEl && (
                  <div className="font-garamond text-sm text-mapsa-muted italic mt-1">
                    {singleEl.segmentation_status}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="px-5 py-4 flex flex-col gap-4">
                {/* Single element description */}
                {singleEl && (
                  <div>
                    <div className="mapsa-section-label">
                      Epigraphic Description
                    </div>
                    <p className="font-garamond text-sm leading-[1.75] text-mapsa-text">
                      {singleEl.neutral_description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="mapsa-tag">
                        {CONFIDENCE_ICON[singleEl.confidence]}{" "}
                        {singleEl.confidence}
                      </span>
                      <span className="mapsa-tag mapsa-tag-epi">
                        {singleEl.segmentation_status}
                      </span>
                      {singleEl.inferred_overlay_path && (
                        <span
                          className="mapsa-tag"
                          style={{ borderColor: "#7ea8be", color: "#7ea8be" }}
                        >
                          has inferred reconstruction
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Multi-select */}
                {!singleEl &&
                  selectedElements.map((el) => (
                    <div
                      key={el.id}
                      className="border-l-2 border-mapsa-gold/30 pl-3"
                    >
                      <p className="font-mono text-xs text-mapsa-gold-light font-semibold">
                        {el.label}
                      </p>
                      <p className="font-garamond text-sm text-mapsa-text leading-relaxed">
                        {el.neutral_description}
                      </p>
                      <span className="mapsa-tag text-[0.5rem] mt-1 inline-block">
                        {CONFIDENCE_ICON[el.confidence]} {el.confidence}
                      </span>
                    </div>
                  ))}

                {/* Notes */}
                {singleEl?.notes && (
                  <div>
                    <div className="mapsa-section-label">Notes</div>
                    <p className="font-garamond text-sm text-mapsa-muted leading-relaxed">
                      {singleEl.notes}
                    </p>
                  </div>
                )}

                {/* Matching groupings */}
                {matchingGroupings.length > 0 && (
                  <div>
                    <div className="mapsa-section-label">
                      Grouping Hypotheses
                    </div>
                    {matchingGroupings.map((g) => (
                      <div
                        key={g.id}
                        className="mb-3 p-3 rounded border border-mapsa-border bg-mapsa-panel-alt cursor-pointer hover:border-mapsa-gold/40 transition-colors"
                        onClick={() => onSelectGrouping(g)}
                      >
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-cinzel text-sm text-mapsa-gold font-semibold">
                            {g.title}
                          </span>
                          <span className="mapsa-tag text-[0.5rem]">
                            {g.status}
                          </span>
                        </div>
                        <p className="font-garamond text-xs text-mapsa-text italic leading-relaxed">
                          {g.interpretation}
                        </p>
                        {g.interpretation_caution && (
                          <p className="font-garamond text-xs text-mapsa-muted mt-1">
                            ⚠ {g.interpretation_caution}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-garamond text-[0.6rem] text-mapsa-muted">
                            {g.contributor_name} · v{g.version} ·{" "}
                            {g.created_at?.split("T")[0]}
                          </span>
                          <span className="mapsa-tag text-[0.5rem]">
                            {CONFIDENCE_ICON[g.confidence]} {g.confidence}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All groupings when no match */}
                {lockedEls.length > 0 &&
                  matchingGroupings.length === 0 &&
                  record.groupings.length > 0 && (
                    <div>
                      <div className="mapsa-section-label">
                        All Groupings for Record
                      </div>
                      {record.groupings.map((g) => (
                        <div
                          key={g.id}
                          className="mb-2 p-2 rounded border border-mapsa-border/50 bg-mapsa-panel-alt/50 cursor-pointer hover:border-mapsa-gold/30 transition-colors"
                          onClick={() => onSelectGrouping(g)}
                        >
                          <span className="font-cinzel text-xs text-mapsa-gold/80">
                            {g.title}
                          </span>
                          <span className="font-mono text-[0.5rem] text-mapsa-muted ml-2">
                            [{g.element_ids?.length || 0} elements]
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Relevant annotations */}
                {relevantAnnotations.length > 0 && (
                  <div>
                    <div className="mapsa-section-label">Annotations</div>
                    {relevantAnnotations
                      .filter(
                        (a) =>
                          a.status === "published" || a.status === "pending"
                      )
                      .slice(0, 5)
                      .map((ann) => (
                        <div
                          key={ann.id}
                          className="mb-2.5 border-l-2 border-mapsa-gold/30 pl-3"
                        >
                          <p className="font-mono text-[0.5rem] text-mapsa-gold/70 mb-0.5">
                            {ann.contributor_name}
                            {ann.contributor_affiliation &&
                              ` · ${ann.contributor_affiliation}`}
                          </p>
                          <p className="font-garamond text-xs text-mapsa-text leading-relaxed">
                            {ann.body}
                          </p>
                          <p className="font-garamond text-[0.56rem] text-mapsa-muted italic mt-0.5">
                            {ann.type} · {ann.created_at?.split("T")[0]} ·{" "}
                            {CONFIDENCE_ICON[ann.confidence]} {ann.confidence}
                            {ann.status === "pending" && " · ⏳ pending"}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend + navigation */}
          <div className="shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt">
            <div className="px-4 py-2.5 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
              {record.elements.map((el) => {
                const isActive = lockedEls.includes(el.id);
                return (
                  <div
                    key={el.id}
                    className={`flex items-center gap-2.5 text-sm cursor-pointer py-0.5 transition-colors ${
                      isActive
                        ? "text-mapsa-gold"
                        : "text-mapsa-muted hover:text-mapsa-gold-light"
                    }`}
                    onClick={() => onSelectElement(el)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm border shrink-0"
                      style={{
                        background: isActive
                          ? "var(--mapsa-gold, #c8a96e)"
                          : "rgba(212,168,75,0.1)",
                        borderColor: "var(--mapsa-gold, #c8a96e)",
                      }}
                    />
                    <span className="font-garamond text-xs">
                      {el.label} ·{" "}
                      {el.neutral_description.slice(0, 50)}
                      {el.neutral_description.length > 50 ? "…" : ""}
                    </span>
                    {el.inferred_overlay_path && (
                      <span
                        className="text-[0.5rem] ml-auto shrink-0"
                        style={{ color: "#7ea8be" }}
                      >
                        inf
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-2 border-t border-mapsa-border flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={onToggleMultiSelect}
                  className={`mapsa-btn text-2xs ${multiSelect ? "mapsa-btn-active" : ""}`}
                >
                  {multiSelect ? "Exit Multi" : "Multi-Select (M)"}
                </button>
              </div>
              <span className="font-mono text-[0.56rem] text-mapsa-muted/50">
                {lockedEls.length
                  ? `${lockedEls.length} / ${record.elements.length}`
                  : `— / ${record.elements.length}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Other modes ─── */}
      {mode === "evidence" && (
        <div className="flex-1 overflow-y-auto p-4">
          <EvidenceTab record={record} />
        </div>
      )}
      {mode === "annotations" && (
        <div className="flex-1 overflow-y-auto p-4">
          <AnnotationsTab
            annotations={annotations}
            onSubmit={onSubmitAnnotation}
          />
        </div>
      )}
      {mode === "sources" && (
        <div className="flex-1 overflow-y-auto p-4">
          <SourcesTab sources={record.sources} />
        </div>
      )}
      {mode === "citation" && (
        <div className="flex-1 overflow-y-auto p-4">
          <CitationTab
            record={record}
            selected={selectedElements.length === 1 ? selectedElements[0] : null}
          />
        </div>
      )}
      {mode === "photo" && (
        <div className="flex-1 overflow-y-auto p-4">
          <PhotoRequestTab
            recordId={record.id}
            submitted={photoSubmitted}
            onSubmit={() => setPhotoSubmitted(true)}
          />
        </div>
      )}
    </div>
  );
}
