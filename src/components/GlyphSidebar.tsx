"use client";

import type {
  InscriptionRecord,
  Source,
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
  sources: Source[];
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

type SidebarMode = "glyph" | "evidence" | "annotations" | "sources" | "citation" | "photo";

export default function GlyphSidebar({
  record,
  sources,
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
      selectedElements.some((el) => ann.targetId === el.id) ||
      ann.targetId === record.id
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
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-7 text-center opacity-40">
              <span className="text-3xl">◈</span>
              <span className="font-cinzel text-sm tracking-[0.15em] text-mapsa-gold/80">
                Select a Glyph
              </span>
              <span className="font-garamond text-sm text-mapsa-muted leading-relaxed max-w-[230px]">
                Hover to preview. Click to lock.
                <br />
                Press M for multi-select.
                <br />
                Esc to unlock.
              </span>
            </div>
          ) : (
            /* Element detail */
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
                    {singleEl.segmentationStatus}
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
                      {singleEl.neutralDescription}
                    </p>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="mapsa-tag">
                        {CONFIDENCE_ICON[singleEl.confidence]} {singleEl.confidence}
                      </span>
                      <span className="mapsa-tag mapsa-tag-epi">
                        {singleEl.segmentationStatus}
                      </span>
                    </div>
                  </div>
                )}

                {/* Multi-select: show all selected elements */}
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
                        {el.neutralDescription}
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
                        {g.interpretationCaution && (
                          <p className="font-garamond text-xs text-mapsa-muted mt-1">
                            ⚠ {g.interpretationCaution}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-garamond text-[0.6rem] text-mapsa-muted">
                            {g.contributorName} · v{g.version} · {g.dateSubmitted}
                          </span>
                          <span className="mapsa-tag text-[0.5rem]">
                            {CONFIDENCE_ICON[g.confidence]} {g.confidence}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All groupings for this record */}
                {lockedEls.length > 0 && matchingGroupings.length === 0 && (
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
                          [{g.elementIds.join(", ")}]
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
                      .filter((a) => a.status === "published")
                      .slice(0, 5)
                      .map((ann) => (
                        <div
                          key={ann.id}
                          className="mb-2.5 border-l-2 border-mapsa-gold/30 pl-3"
                        >
                          <p className="font-mono text-[0.5rem] text-mapsa-gold/70 mb-0.5">
                            {ann.contributorName}
                            {ann.affiliation && ` · ${ann.affiliation}`}
                          </p>
                          <p className="font-garamond text-xs text-mapsa-text leading-relaxed">
                            {ann.body}
                          </p>
                          <p className="font-garamond text-[0.56rem] text-mapsa-muted italic mt-0.5">
                            {ann.type} · {ann.dateSubmitted} · {CONFIDENCE_ICON[ann.confidence]} {ann.confidence}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend + navigation (always visible at bottom) */}
          <div className="shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt">
            {/* Element legend */}
            <div className="px-4 py-2.5 flex flex-col gap-1">
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
                        borderColor: isActive
                          ? "var(--mapsa-gold, #c8a96e)"
                          : "var(--mapsa-gold, #c8a96e)",
                      }}
                    />
                    <span className="font-garamond text-xs">
                      {el.label} · {el.neutralDescription.slice(0, 50)}
                      {el.neutralDescription.length > 50 ? "…" : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Nav bar */}
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
          <SourcesTab sources={sources} />
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
