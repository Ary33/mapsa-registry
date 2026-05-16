"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  InscriptionRecord,
  Source,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import GlyphSidebar from "./GlyphSidebar";
import StatusBadge from "./StatusBadge";
import { useAuth } from "@/lib/AuthContext";

interface RecordViewerProps {
  record: InscriptionRecord;
  sources: Source[];
}

export default function RecordViewer({ record, sources }: RecordViewerProps) {
  const { profile } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | SVGSVGElement>(null);

  const [activeImg, setActiveImg] = useState(record.images[0]?.id || "");
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);
  const [lockedEls, setLockedEls] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [imgRect, setImgRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(record.annotations);

  const activeImgData = record.images.find((i) => i.id === activeImg) || record.images[0];
  const hasRealImage = activeImgData?.src && activeImgData.src.length > 0;

  // Currently visible elements = locked + hovered
  const visibleEls = hoveredEl && !lockedEls.includes(hoveredEl)
    ? [...lockedEls, hoveredEl]
    : lockedEls;

  // Get full element data for visible elements
  const selectedElementData = record.elements.filter((el) =>
    visibleEls.includes(el.id)
  );

  // Get groupings that contain all locked elements
  const matchingGroupings = record.groupings.filter(
    (g) =>
      lockedEls.length > 0 &&
      lockedEls.every((id) => g.elementIds.includes(id))
  );

  // ── Layout sync ──
  const syncLayout = useCallback(() => {
    if (!wrapRef.current || !imgRef.current) return;
    const wr = wrapRef.current.getBoundingClientRect();
    const ir = imgRef.current.getBoundingClientRect();
    setImgRect({
      left: ir.left - wr.left,
      top: ir.top - wr.top,
      width: ir.width,
      height: ir.height,
    });
  }, []);

  useEffect(() => {
    syncLayout();
    const t = setTimeout(syncLayout, 200);
    window.addEventListener("resize", syncLayout);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", syncLayout);
    };
  }, [syncLayout, activeImg]);

  // ── Keyboard controls ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLockedEls([]);
        setMultiSelect(false);
      }
      if (e.key === "m" || e.key === "M") {
        setMultiSelect((prev) => !prev);
      }
      // Arrow navigation through elements
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        navElement(1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navElement(-1);
      }
      // Number keys to jump to element
      const num = parseInt(e.key);
      if (num >= 1 && num <= record.elements.length) {
        const el = record.elements[num - 1];
        setLockedEls([el.id]);
        setMultiSelect(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record.elements, lockedEls]);

  function navElement(dir: number) {
    const currentId = lockedEls[lockedEls.length - 1] || hoveredEl;
    const idx = record.elements.findIndex((el) => el.id === currentId);
    const next = idx < 0 ? 0 : (idx + dir + record.elements.length) % record.elements.length;
    setLockedEls([record.elements[next].id]);
    setMultiSelect(false);
  }

  function handleClickElement(id: string) {
    if (multiSelect) {
      setLockedEls((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setLockedEls((prev) =>
        prev.length === 1 && prev[0] === id ? [] : [id]
      );
    }
  }

  function handleSelectGrouping(g: GroupingHypothesis) {
    setLockedEls(g.elementIds);
    setMultiSelect(false);
  }

  function handleSelectElement(el: CandidateElement) {
    setLockedEls([el.id]);
    setMultiSelect(false);
  }

  const submitAnnotation = useCallback(
    (form: AnnotationFormData) => {
      const newAnn: Annotation = {
        id: `ann-${Date.now()}`,
        recordId: record.id,
        targetType: form.targetType as Annotation["targetType"],
        targetId: form.targetId || record.id,
        contributorId: profile?.id || "contrib-new",
        contributorName: profile?.full_name || form.name,
        affiliation: profile?.affiliation || form.affiliation || undefined,
        orcid: profile?.orcid || form.orcid || undefined,
        type: form.type as Annotation["type"],
        body:
          form.body +
          (form.boundaryCorrection
            ? `\n\n[Boundary correction suggestion: ${form.boundaryCorrection}]`
            : ""),
        sourcesCited: form.sourcesCited
          ? form.sourcesCited.split(",").map((s) => s.trim())
          : [],
        confidence: form.confidence as Annotation["confidence"],
        visibility: form.visibility as Annotation["visibility"],
        status: "pending",
        version: "1.0",
        dateSubmitted: new Date().toISOString().split("T")[0],
        citationText: `${profile?.full_name || form.name}, ${form.type}, MAPSA ${record.id}, ${new Date().getFullYear()}.`,
      };
      setLocalAnnotations((prev) => [newAnn, ...prev]);
    },
    [record.id, profile]
  );

  return (
    <div>
      {/* Status badges */}
      <div className="flex gap-1.5 flex-wrap px-4 py-2 items-center">
        {record.status.map((st) => (
          <StatusBadge
            key={st}
            text={st}
            variant={st === "NEEDS EXPERT REVIEW" ? "red" : "default"}
          />
        ))}
        <span className="mapsa-mono text-[0.69rem] ml-auto">
          v{record.recordVersion}
        </span>
      </div>

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 120px)" }}>
        {/* ── LEFT: Image + overlays ── */}
        <div className="flex-1 min-w-[320px] flex flex-col border-r border-mapsa-border overflow-hidden">
          {/* Image tabs */}
          <div className="flex gap-0.5 flex-wrap px-4 pt-3 pb-1 shrink-0">
            {record.images.map((img) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(img.id)}
                className={`mapsa-tab py-1.5 px-2.5 text-2xs ${activeImg === img.id ? "mapsa-tab-active" : ""}`}
              >
                {img.label}
              </button>
            ))}
          </div>

          {/* Image area */}
          <div className="flex-1 min-h-0 px-4 pb-2">
            <div
              ref={wrapRef}
              className="relative h-full overflow-hidden rounded-md border border-mapsa-border"
              onClick={() => {
                if (!multiSelect) {
                  setLockedEls([]);
                }
              }}
            >
              {hasRealImage ? (
                <img
                  ref={imgRef as React.RefObject<HTMLImageElement>}
                  src={activeImgData.src}
                  alt={activeImgData.label}
                  className="block h-full w-auto max-w-full object-contain select-none"
                  style={{
                    objectPosition: "top left",
                    boxShadow: "0 6px 28px rgba(0,0,0,.55)",
                  }}
                  onLoad={() => setTimeout(syncLayout, 50)}
                  draggable={false}
                />
              ) : (
                <svg
                  ref={imgRef as React.RefObject<SVGSVGElement>}
                  viewBox="0 0 600 500"
                  className="block h-full w-auto max-w-full"
                >
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3a332c" />
                      <stop offset="50%" stopColor="#2a2419" />
                      <stop offset="100%" stopColor="#1f1a14" />
                    </linearGradient>
                    <filter id="gr">
                      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" />
                      <feColorMatrix type="saturate" values="0" />
                      <feBlend in="SourceGraphic" mode="multiply" />
                    </filter>
                  </defs>
                  <rect width="600" height="500" fill="url(#sg)" />
                  <rect width="600" height="500" fill="rgba(0,0,0,0.12)" filter="url(#gr)" />
                  <g opacity="0.35" stroke="#c8a96e" strokeWidth="1.5" fill="none">
                    <path d="M 140 80 Q 160 50 200 55 Q 240 60 250 90 Q 255 120 240 140 Q 220 160 200 155 Q 180 150 170 130 Q 160 110 140 80 Z" />
                    <circle cx="210" cy="85" r="5" />
                    <circle cx="380" cy="120" r="8" />
                    <circle cx="375" cy="165" r="8" />
                    <circle cx="385" cy="210" r="8" />
                    <rect x="100" y="310" width="320" height="130" rx="4" />
                    <path d="M 130 340 L 390 340" />
                    <path d="M 130 380 Q 260 370 390 380" />
                  </g>
                  <text x="300" y="470" textAnchor="middle" fill="#b8ac98" fontFamily="Cinzel" fontSize="11" letterSpacing="2" opacity="0.6">
                    {activeImgData.label}
                  </text>
                </svg>
              )}

              {/* Element hotspot overlays */}
              {record.elements.map((el) => {
                const isHovered = hoveredEl === el.id;
                const isLocked = lockedEls.includes(el.id);
                const isVisible = isHovered || isLocked;

                return (
                  <div
                    key={el.id}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${imgRect.left + (el.boundingBox.x / 100) * imgRect.width}px`,
                      top: `${imgRect.top + (el.boundingBox.y / 100) * imgRect.height}px`,
                      width: `${(el.boundingBox.width / 100) * imgRect.width}px`,
                      height: `${(el.boundingBox.height / 100) * imgRect.height}px`,
                      zIndex: isVisible ? 20 : 10,
                      minWidth: "44px",
                      minHeight: "44px",
                    }}
                    onMouseEnter={() => {
                      if (!lockedEls.length || multiSelect) setHoveredEl(el.id);
                    }}
                    onMouseLeave={() => setHoveredEl(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClickElement(el.id);
                    }}
                  >
                    {/* Glow box */}
                    <div
                      className="absolute inset-0 rounded-sm"
                      style={{
                        transition: "all 0.3s ease",
                        border: isLocked
                          ? "2px solid rgba(200,169,110,0.85)"
                          : isHovered
                            ? "2px solid rgba(200,169,110,0.5)"
                            : "1px solid rgba(200,169,110,0.1)",
                        background: isLocked
                          ? "rgba(200,169,110,0.1)"
                          : isHovered
                            ? "rgba(200,169,110,0.05)"
                            : "transparent",
                        boxShadow: isLocked
                          ? "0 0 6px rgba(255,240,180,0.5), 0 0 16px rgba(255,220,120,0.3), 0 0 28px rgba(255,200,80,0.15), inset 0 0 8px rgba(200,169,110,0.08)"
                          : isHovered
                            ? "0 0 4px rgba(255,240,180,0.25), 0 0 10px rgba(255,220,120,0.15)"
                            : "none",
                      }}
                    />
                    {/* Label */}
                    <span
                      className="absolute -top-5 left-0.5 font-mono text-[0.6rem] tracking-wider font-semibold"
                      style={{
                        transition: "all 0.2s ease",
                        color: isLocked
                          ? "#e8d49a"
                          : isHovered
                            ? "#c8a96e"
                            : "rgba(200,169,110,0.25)",
                        textShadow: isLocked
                          ? "0 0 8px rgba(200,169,110,0.5)"
                          : "none",
                      }}
                    >
                      {el.label}
                    </span>
                    {/* Multi-select checkmark */}
                    {multiSelect && isLocked && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-mapsa-gold text-black text-[8px] flex items-center justify-center font-bold z-30">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Multi-select indicator */}
              {multiSelect && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="font-mono text-[0.56rem] text-mapsa-gold bg-black/70 px-2.5 py-1 rounded border border-mapsa-gold/40">
                    GROUP SELECT · Click elements · Press M to exit
                  </span>
                </div>
              )}

              {/* Hint */}
              {!lockedEls.length && !hoveredEl && record.elements.length > 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="font-cinzel text-[0.5rem] text-mapsa-muted/50 tracking-[0.2em] uppercase bg-black/30 px-3 py-1.5 rounded">
                    Hover to preview · Click to lock · M for multi-select · Esc to clear
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[0.69rem] text-mapsa-muted leading-snug">
              {activeImgData.caption}
            </p>
            <p className="text-[0.56rem] text-mapsa-muted">
              {activeImgData.photographer} · {activeImgData.date}
              {!activeImgData.isPrimaryEvidence && " · Interpretive aid"}
            </p>
          </div>

          {/* Citations panel (below image, like MVP) */}
          <div className="shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt px-4 py-3 min-h-[120px]">
            {selectedElementData.length === 0 ? (
              <p className="font-garamond text-sm text-mapsa-muted/50 italic">
                Select a glyph to view primary sources & citations.
              </p>
            ) : (
              <div>
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <span className="mapsa-label text-[0.5rem]">
                    Primary Sources & Citations
                  </span>
                  <span className="font-cinzel text-sm text-mapsa-gold-light font-semibold">
                    {selectedElementData.map((el) => el.label).join(" + ")}
                  </span>
                </div>
                {/* Element-specific annotations as citations */}
                {localAnnotations
                  .filter(
                    (ann) =>
                      ann.status === "published" &&
                      selectedElementData.some(
                        (el) => ann.targetId === el.id || ann.targetId === record.id
                      )
                  )
                  .slice(0, 3)
                  .map((ann) => (
                    <div
                      key={ann.id}
                      className="border-l-2 border-mapsa-gold/40 pl-3 py-1.5 mb-2 rounded-r bg-white/[0.03]"
                    >
                      <p className="font-mono text-[0.56rem] text-mapsa-gold mb-0.5">
                        {ann.contributorName}
                        {ann.affiliation && ` · ${ann.affiliation}`} · {ann.dateSubmitted}
                      </p>
                      <p className="font-garamond text-xs text-mapsa-text italic leading-snug">
                        {ann.type}
                      </p>
                      <p className="font-garamond text-xs text-mapsa-muted leading-relaxed line-clamp-2">
                        {ann.body}
                      </p>
                    </div>
                  ))}
                {/* Source citations */}
                {sources.slice(0, 2).map((src) => (
                  <div
                    key={src.id}
                    className="border-l-2 border-mapsa-gold/30 pl-3 py-1 mb-1.5 rounded-r bg-white/[0.02]"
                  >
                    <p className="font-mono text-[0.56rem] text-mapsa-gold">
                      {src.author} {src.year}
                    </p>
                    <p className="font-garamond text-xs text-mapsa-text italic">
                      {src.title}
                    </p>
                    <p className="font-garamond text-[0.6rem] text-mapsa-muted">
                      {src.publication}
                      {src.pages && `, pp. ${src.pages}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <GlyphSidebar
          record={record}
          sources={sources}
          annotations={localAnnotations}
          selectedElements={selectedElementData}
          lockedEls={lockedEls}
          matchingGroupings={matchingGroupings}
          multiSelect={multiSelect}
          onToggleMultiSelect={() => setMultiSelect((prev) => !prev)}
          onSelectElement={handleSelectElement}
          onSelectGrouping={handleSelectGrouping}
          onSubmitAnnotation={submitAnnotation}
        />
      </div>

      {/* Scholarly disclaimer */}
      <div className="mapsa-disclaimer mx-4 my-3">
        MAPSA separates visual evidence, candidate segmentation, grouping
        hypotheses, and interpretation. Overlays are interpretive aids, not
        substitutes for primary photographic evidence. All readings are
        attributed to named contributors and sources.
      </div>
    </div>
  );
}
