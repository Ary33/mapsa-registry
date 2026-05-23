"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  InscriptionRecord,
  Source,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import { overlayUrl, photoUrl, submitAnnotation } from "@/lib/data";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import GlyphSidebar from "./GlyphSidebar";
import StatusBadge from "./StatusBadge";
import { useAuth } from "@/lib/AuthContext";

interface RecordViewerProps {
  record: InscriptionRecord;
}

// ─── Canvas hit-detection helper ─────────────────────────────────
// Loads each overlay PNG into an offscreen canvas for alpha testing.
interface HitCanvas {
  elementId: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

function buildHitCanvas(
  img: HTMLImageElement,
  elementId: string
): HitCanvas | null {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return { elementId, canvas, ctx, width: img.naturalWidth, height: img.naturalHeight };
}

function hitTest(
  hitCanvases: HitCanvas[],
  x: number, // 0-1 normalized coordinates
  y: number
): string | null {
  // Test in reverse order (top-most element first)
  for (let i = hitCanvases.length - 1; i >= 0; i--) {
    const hc = hitCanvases[i];
    const px = Math.floor(x * hc.width);
    const py = Math.floor(y * hc.height);
    if (px < 0 || px >= hc.width || py < 0 || py >= hc.height) continue;
    const pixel = hc.ctx.getImageData(px, py, 1, 1).data;
    if (pixel[3] > 20) {
      // Non-transparent pixel — hit
      return hc.elementId;
    }
  }
  return null;
}

export default function RecordViewer({ record }: RecordViewerProps) {
  const { profile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Layer toggles
  const [showBackground, setShowBackground] = useState(true);
  const [showGlyphs, setShowGlyphs] = useState(true);
  const [showInferred, setShowInferred] = useState(true);

  // Element selection state
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);
  const [lockedEls, setLockedEls] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Annotation state (persisted to Supabase)
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(
    record.annotations
  );

  // Hit detection canvases
  const [hitCanvases, setHitCanvases] = useState<HitCanvas[]>([]);
  const [overlayImages, setOverlayImages] = useState<
    Map<string, HTMLImageElement>
  >(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Image dimensions for coordinate mapping
  const [imgRect, setImgRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Detect touch/mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(
        window.innerWidth <= 768 ||
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0
      );
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Currently visible elements
  const visibleEls =
    hoveredEl && !lockedEls.includes(hoveredEl)
      ? [...lockedEls, hoveredEl]
      : lockedEls;

  const selectedElementData = record.elements.filter((el) =>
    visibleEls.includes(el.id)
  );

  const matchingGroupings = record.groupings.filter(
    (g) =>
      lockedEls.length > 0 &&
      lockedEls.every((id) => g.element_ids.includes(id))
  );

  // ── Preload overlay images + build hit canvases ──
  useEffect(() => {
    const imgMap = new Map<string, HTMLImageElement>();
    const canvases: HitCanvas[] = [];
    let loadCount = 0;

    const elementsWithOverlays = record.elements.filter(
      (el) => el.overlay_path
    );
    const totalToLoad = elementsWithOverlays.length;

    if (totalToLoad === 0) {
      setImagesLoaded(true);
      return;
    }

    elementsWithOverlays.forEach((el) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imgMap.set(el.id, img);
        const hc = buildHitCanvas(img, el.id);
        if (hc) canvases.push(hc);
        loadCount++;
        if (loadCount === totalToLoad) {
          setOverlayImages(new Map(imgMap));
          setHitCanvases([...canvases]);
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load overlay for ${el.label}: ${el.overlay_path}`);
        loadCount++;
        if (loadCount === totalToLoad) {
          setOverlayImages(new Map(imgMap));
          setHitCanvases([...canvases]);
          setImagesLoaded(true);
        }
      };
      img.src = overlayUrl(el.overlay_path) || "";
    });
  }, [record.elements]);

  // ── Layout sync ──
  const syncLayout = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const ir = imgRef.current.getBoundingClientRect();
    setImgRect({
      left: ir.left - cr.left,
      top: ir.top - cr.top,
      width: ir.width,
      height: ir.height,
    });
  }, []);

  useEffect(() => {
    syncLayout();
    const t = setTimeout(syncLayout, 300);
    window.addEventListener("resize", syncLayout);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", syncLayout);
    };
  }, [syncLayout, showBackground]);

  // ── Mouse/touch coordinate → element hit ──
  function getHitElement(clientX: number, clientY: number): string | null {
    if (!containerRef.current || hitCanvases.length === 0) return null;
    const cr = containerRef.current.getBoundingClientRect();
    // Map to image-relative normalized coordinates
    const relX = (clientX - cr.left - imgRect.left) / imgRect.width;
    const relY = (clientY - cr.top - imgRect.top) / imgRect.height;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;
    return hitTest(hitCanvases, relX, relY);
  }

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
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        navElement(1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navElement(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record.elements, lockedEls]);

  function navElement(dir: number) {
    const currentId = lockedEls[lockedEls.length - 1] || hoveredEl;
    const idx = record.elements.findIndex((el) => el.id === currentId);
    const next =
      idx < 0
        ? 0
        : (idx + dir + record.elements.length) % record.elements.length;
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
    setLockedEls(g.element_ids);
    setMultiSelect(false);
  }

  function handleSelectElement(el: CandidateElement) {
    setLockedEls([el.id]);
    setMultiSelect(false);
  }

  // ── Annotation submission (writes to Supabase) ──
  const handleSubmitAnnotation = useCallback(
    async (form: AnnotationFormData) => {
      if (!profile) return;

      const { data, error } = await submitAnnotation({
        record_id: record.id,
        target_type: form.targetType,
        target_id: form.targetId || record.id,
        contributor_id: profile.id,
        type: form.type,
        body:
          form.body +
          (form.boundaryCorrection
            ? `\n\n[Boundary correction suggestion: ${form.boundaryCorrection}]`
            : ""),
        sources_cited: form.sourcesCited
          ? form.sourcesCited.split(",").map((s) => s.trim())
          : [],
        confidence: form.confidence,
        visibility: form.visibility,
      });

      if (error) {
        console.error("Annotation submission error:", error);
        return;
      }

      if (data) {
        // Add to local state with contributor info
        const newAnn: Annotation = {
          ...data,
          contributor_name: profile.full_name,
          contributor_affiliation: profile.affiliation || undefined,
          contributor_orcid: profile.orcid || undefined,
        };
        setLocalAnnotations((prev) => [newAnn, ...prev]);
      }
    },
    [record.id, profile]
  );

  // ── Resolve image URLs ──
  const backgroundUrl = photoUrl(record.background_path);
  const baseOverlayUrl = overlayUrl(record.base_overlay_path);

  // ── Get glow style for an overlay element ──
  function getOverlayStyle(elId: string): React.CSSProperties {
    const isHovered = hoveredEl === elId;
    const isLocked = lockedEls.includes(elId);

    if (isLocked) {
      return {
        filter:
          "drop-shadow(0 0 4px rgba(255,240,180,0.6)) drop-shadow(0 0 12px rgba(255,220,120,0.35)) drop-shadow(0 0 22px rgba(255,200,80,0.15))",
        opacity: 1,
      };
    }
    if (isHovered) {
      return {
        filter:
          "drop-shadow(0 0 3px rgba(255,240,180,0.35)) drop-shadow(0 0 8px rgba(255,220,120,0.2))",
        opacity: 1,
      };
    }
    return {
      filter: "none",
      opacity: 0.85,
    };
  }

  return (
    <div>
      {/* Status badges */}
      <div className="flex gap-2 flex-wrap px-4 py-3 items-center border-b border-mapsa-border/40">
        {record.status.map((st) => (
          <StatusBadge
            key={st}
            text={st}
            variant={st === "NEEDS EXPERT REVIEW" ? "red" : "default"}
          />
        ))}
        <span className="mapsa-mono text-[0.69rem] ml-auto">
          v{record.record_version}
        </span>
      </div>

      {/* Split layout */}
      <div
        className="flex flex-col lg:flex-row"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        {/* ── LEFT: Image + overlays ── */}
        <div className="flex-1 min-w-[320px] flex flex-col border-r border-mapsa-border overflow-hidden">
          {/* Layer toggles */}
          <div className="flex gap-2 flex-wrap px-4 pt-3 pb-2 shrink-0 border-b border-mapsa-border/40">
            <span className="mapsa-label self-center mr-1">Layers</span>
            <button
              onClick={() => setShowBackground((p) => !p)}
              className={`mapsa-btn text-2xs ${showBackground ? "mapsa-btn-active" : ""}`}
            >
              Background
            </button>
            <button
              onClick={() => setShowGlyphs((p) => !p)}
              className={`mapsa-btn text-2xs ${showGlyphs ? "mapsa-btn-active" : ""}`}
            >
              Glyph Shapes
            </button>
            <button
              onClick={() => setShowInferred((p) => !p)}
              className={`mapsa-btn text-2xs ${showInferred ? "mapsa-btn-active" : ""}`}
              style={{
                borderColor: showInferred ? "#7ea8be" : undefined,
                background: showInferred ? "#7ea8be" : undefined,
                color: showInferred ? "#18140f" : undefined,
              }}
            >
              Inferred
            </button>
          </div>

          {/* Image area */}
          <div className="flex-1 min-h-0 px-4 pb-2">
            <div
              ref={containerRef}
              className="relative h-full overflow-hidden rounded-md border border-mapsa-border"
              style={{ cursor: showGlyphs ? "crosshair" : "default" }}
              onMouseMove={(e) => {
                if (isMobile || !showGlyphs) return;
                const hit = getHitElement(e.clientX, e.clientY);
                setHoveredEl(hit);
              }}
              onMouseLeave={() => {
                if (isMobile) return;
                setHoveredEl(null);
              }}
              onClick={(e) => {
                if (!showGlyphs) return;
                const hit = getHitElement(e.clientX, e.clientY);
                if (hit) {
                  handleClickElement(hit);
                } else if (!multiSelect) {
                  setLockedEls([]);
                }
              }}
              onTouchEnd={(e) => {
                if (!showGlyphs || !e.changedTouches[0]) return;
                const touch = e.changedTouches[0];
                const hit = getHitElement(touch.clientX, touch.clientY);
                if (hit) {
                  handleClickElement(hit);
                }
              }}
            >
              {/* Base photograph */}
              {showBackground && backgroundUrl && (
                <img
                  ref={imgRef}
                  src={backgroundUrl}
                  alt="Base photograph"
                  className="block h-full w-auto max-w-full object-contain select-none"
                  style={{
                    objectPosition: "top left",
                    boxShadow: "0 6px 28px rgba(0,0,0,.55)",
                  }}
                  onLoad={() => setTimeout(syncLayout, 50)}
                  draggable={false}
                />
              )}

              {/* Fallback: base overlay as background when photo is hidden */}
              {!showBackground && baseOverlayUrl && (
                <img
                  ref={imgRef}
                  src={baseOverlayUrl}
                  alt="Line drawing"
                  className="block h-full w-auto max-w-full object-contain select-none"
                  style={{ objectPosition: "top left" }}
                  onLoad={() => setTimeout(syncLayout, 50)}
                  draggable={false}
                />
              )}

              {/* Glyph shape overlays */}
              {showGlyphs &&
                imagesLoaded &&
                record.elements.map((el) => {
                  const url = overlayUrl(el.overlay_path);
                  if (!url) return null;
                  return (
                    <img
                      key={`glyph-${el.id}`}
                      src={url}
                      alt={el.label}
                      className="absolute top-0 left-0 h-full w-auto max-w-full object-contain pointer-events-none select-none"
                      style={{
                        objectPosition: "top left",
                        transition: "filter 0.2s ease, opacity 0.2s ease",
                        ...getOverlayStyle(el.id),
                      }}
                      draggable={false}
                    />
                  );
                })}

              {/* Inferred reconstruction overlays */}
              {showInferred &&
                imagesLoaded &&
                record.elements
                  .filter((el) => el.inferred_overlay_path)
                  .map((el) => {
                    const url = overlayUrl(el.inferred_overlay_path);
                    if (!url) return null;
                    const isHovered = hoveredEl === el.id;
                    const isLocked = lockedEls.includes(el.id);
                    return (
                      <img
                        key={`inf-${el.id}`}
                        src={url}
                        alt={`${el.label} (inferred)`}
                        className="absolute top-0 left-0 h-full w-auto max-w-full object-contain pointer-events-none select-none"
                        style={{
                          objectPosition: "top left",
                          opacity: isLocked ? 0.7 : isHovered ? 0.55 : 0.4,
                          filter:
                            isLocked || isHovered
                              ? "drop-shadow(0 0 6px rgba(126,168,190,0.5)) hue-rotate(10deg)"
                              : "hue-rotate(10deg)",
                          transition: "filter 0.2s ease, opacity 0.2s ease",
                        }}
                        draggable={false}
                      />
                    );
                  })}

              {/* Element label overlay */}
              {showGlyphs && (hoveredEl || lockedEls.length > 0) && (
                <div className="absolute top-2 left-2 z-30 flex flex-wrap gap-1">
                  {visibleEls.map((elId) => {
                    const el = record.elements.find((e) => e.id === elId);
                    if (!el) return null;
                    const isLocked = lockedEls.includes(elId);
                    return (
                      <span
                        key={elId}
                        className="font-mono text-[0.6rem] tracking-wider font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: isLocked ? "#e8d49a" : "#c8a96e",
                          background: "rgba(0,0,0,0.6)",
                          textShadow: isLocked
                            ? "0 0 8px rgba(200,169,110,0.5)"
                            : "none",
                        }}
                      >
                        {el.label}
                        {el.inferred_overlay_path && showInferred && (
                          <span style={{ color: "#7ea8be", marginLeft: 4 }}>
                            +inf
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Multi-select indicator */}
              {multiSelect && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="font-mono text-[0.56rem] text-mapsa-gold bg-black/70 px-2.5 py-1 rounded border border-mapsa-gold/40">
                    {isMobile
                      ? "GROUP SELECT · Tap elements"
                      : "GROUP SELECT · Click elements · Press M to exit"}
                  </span>
                </div>
              )}

              {/* Hint */}
              {!lockedEls.length &&
                !hoveredEl &&
                record.elements.length > 0 &&
                showGlyphs && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <span className="font-cinzel text-[0.5rem] text-mapsa-muted/50 tracking-[0.2em] uppercase bg-black/30 px-3 py-1.5 rounded">
                      {isMobile
                        ? "Tap a glyph to select"
                        : "Hover to preview · Click to lock · M for multi-select · Esc to clear"}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {/* Mobile control bar */}
          {isMobile && record.elements.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt">
              <button
                onClick={() => setMultiSelect((p) => !p)}
                className={`mapsa-btn text-2xs ${multiSelect ? "mapsa-btn-active" : ""}`}
              >
                {multiSelect ? "✓ Grouping" : "Group Select"}
              </button>
              {lockedEls.length > 0 && (
                <button
                  onClick={() => {
                    setLockedEls([]);
                    setMultiSelect(false);
                  }}
                  className="mapsa-btn text-2xs"
                >
                  Clear ({lockedEls.length})
                </button>
              )}
              <span className="font-mono text-[0.56rem] text-mapsa-muted/60 ml-auto">
                {lockedEls.length
                  ? `${lockedEls.length} selected`
                  : `${record.elements.length} glyphs`}
              </span>
            </div>
          )}

          {/* Caption */}
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[0.69rem] text-mapsa-muted leading-snug">
              {record.title}
            </p>
            <p className="text-[0.56rem] text-mapsa-muted">
              {record.photographer} · {record.date_photographed}
            </p>
          </div>

          {/* Citations panel */}
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
                {localAnnotations
                  .filter(
                    (ann) =>
                      (ann.status === "published" || ann.status === "pending") &&
                      selectedElementData.some(
                        (el) =>
                          ann.target_id === el.id ||
                          ann.target_id === record.id
                      )
                  )
                  .slice(0, 3)
                  .map((ann) => (
                    <div
                      key={ann.id}
                      className="border-l-2 border-mapsa-gold/40 pl-3 py-1.5 mb-2 rounded-r bg-white/[0.03]"
                    >
                      <p className="font-mono text-[0.56rem] text-mapsa-gold mb-0.5">
                        {ann.contributor_name}
                        {ann.contributor_affiliation &&
                          ` · ${ann.contributor_affiliation}`}{" "}
                        · {ann.created_at?.split("T")[0]}
                      </p>
                      <p className="font-garamond text-xs text-mapsa-text italic leading-snug">
                        {ann.type}
                      </p>
                      <p className="font-garamond text-xs text-mapsa-muted leading-relaxed line-clamp-2">
                        {ann.body}
                      </p>
                      {ann.status === "pending" && (
                        <span className="mapsa-tag text-[0.5rem] mt-1 inline-block">
                          ⏳ pending review
                        </span>
                      )}
                    </div>
                  ))}
                {record.sources.slice(0, 2).map((src) => (
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
                      {src.pages && `, ${src.pages}`}
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
          annotations={localAnnotations}
          selectedElements={selectedElementData}
          lockedEls={lockedEls}
          matchingGroupings={matchingGroupings}
          multiSelect={multiSelect}
          onToggleMultiSelect={() => setMultiSelect((prev) => !prev)}
          onSelectElement={handleSelectElement}
          onSelectGrouping={handleSelectGrouping}
          onSubmitAnnotation={handleSubmitAnnotation}
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
