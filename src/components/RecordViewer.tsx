"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  InscriptionRecord,
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

// ─── Bounding box from PNG alpha ─────────────────────────────────
interface ElementBBox {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

function computeBBox(
  img: HTMLImageElement,
  id: string,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): ElementBBox | null {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let found = false;
  // Sample every 4th pixel for speed on large images
  const step = Math.max(1, Math.floor(canvas.width / 500));
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (data[(y * canvas.width + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if (!found) return null;
  const padX = canvas.width * 0.012;
  const padY = canvas.height * 0.012;
  return {
    id,
    left: Math.max(0, minX - padX) / canvas.width,
    top: Math.max(0, minY - padY) / canvas.height,
    width: Math.min(canvas.width, maxX - minX + padX * 2) / canvas.width,
    height: Math.min(canvas.height, maxY - minY + padY * 2) / canvas.height,
  };
}

// ─── Glow functions (vanilla, no React) ──────────────────────────
function applyGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter =
      'drop-shadow(0 0 2px rgba(255,245,200,1)) ' +
      'drop-shadow(0 0 6px rgba(255,230,150,0.9)) ' +
      'drop-shadow(0 0 14px rgba(255,210,100,0.65)) ' +
      'drop-shadow(0 0 24px rgba(255,190,60,0.35))';
  } else {
    const a1 = (0.5 + 0.5 * intensity).toFixed(2);
    const a2 = (0.35 + 0.55 * intensity).toFixed(2);
    const a3 = (0.15 + 0.45 * intensity).toFixed(2);
    el.style.filter =
      `drop-shadow(0 0 2px rgba(255,245,200,${a1})) ` +
      `drop-shadow(0 0 6px rgba(255,230,150,${a2})) ` +
      `drop-shadow(0 0 14px rgba(255,210,100,${a3}))`;
  }
}

function applyInferredGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter =
      'drop-shadow(0 0 2px rgba(120,255,170,1)) ' +
      'drop-shadow(0 0 6px rgba(100,240,150,0.9)) ' +
      'drop-shadow(0 0 14px rgba(80,220,130,0.65)) ' +
      'drop-shadow(0 0 24px rgba(60,200,110,0.35))';
  } else {
    const a1 = (0.5 + 0.5 * intensity).toFixed(2);
    const a2 = (0.35 + 0.55 * intensity).toFixed(2);
    const a3 = (0.15 + 0.45 * intensity).toFixed(2);
    el.style.filter =
      `drop-shadow(0 0 2px rgba(120,255,170,${a1})) ` +
      `drop-shadow(0 0 6px rgba(100,240,150,${a2})) ` +
      `drop-shadow(0 0 14px rgba(80,220,130,${a3}))`;
  }
}

function clearGlow(el: HTMLElement) {
  el.style.filter = '';
}

export default function RecordViewer({ record }: RecordViewerProps) {
  const { profile } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Refs for direct DOM manipulation (bypass React render for perf)
  const ovRefsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const infRefsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);
  const lockedRef = useRef<string[]>([]);

  // React state for sidebar (not for animation)
  const [showBackground, setShowBackground] = useState(true);
  const [showGlyphs, setShowGlyphs] = useState(true);
  const [showInferred, setShowInferred] = useState(true);
  const [lockedEls, _setLockedEls] = useState<string[]>([]);
  const [hoveredEl, _setHoveredEl] = useState<string | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(record.annotations);
  const [bboxes, setBboxes] = useState<ElementBBox[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imgLayout, setImgLayout] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStart = useRef<number | null>(null);

  // Sync refs with React state
  function setLockedEls(val: string[] | ((prev: string[]) => string[])) {
    _setLockedEls((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      lockedRef.current = next;
      updateOverlayVisibility(hoveredRef.current, next);
      return next;
    });
  }

  function setHoveredEl(val: string | null) {
    hoveredRef.current = val;
    _setHoveredEl(val);
    updateOverlayVisibility(val, lockedRef.current);
  }

  // ── Show/hide overlays via direct DOM (like MVP) ──
  function updateOverlayVisibility(hovered: string | null, locked: string[]) {
    const activeIds = new Set(locked);
    if (hovered && !activeIds.has(hovered)) activeIds.add(hovered);

    ovRefsMap.current.forEach((img, id) => {
      if (activeIds.has(id)) {
        img.style.opacity = '1';
        img.style.display = 'block';
      } else {
        img.style.opacity = '0';
        img.style.filter = '';
        img.style.display = 'none';
      }
    });

    infRefsMap.current.forEach((img, id) => {
      if (activeIds.has(id)) {
        img.style.opacity = '1';
        img.style.display = 'block';
      } else {
        img.style.opacity = '0';
        img.style.filter = '';
        img.style.display = 'none';
      }
    });

    // Start/stop animation
    if (activeIds.size > 0) {
      startAnim();
    } else {
      stopAnim();
    }
  }

  // ── Glow animation (vanilla RAF, no React re-render) ──
  function tick() {
    const hovered = hoveredRef.current;
    const locked = lockedRef.current;
    const activeId = locked.length > 0 ? locked : (hovered ? [hovered] : []);
    if (activeId.length === 0) {
      animRef.current = null;
      return;
    }
    phaseRef.current += 0.022;
    const intensity = 0.5 + 0.5 * Math.sin(phaseRef.current);
    const isLocked = locked.length > 0;

    activeId.forEach((id) => {
      const ov = ovRefsMap.current.get(id);
      if (ov) applyGlow(ov, intensity, isLocked);
      const inf = infRefsMap.current.get(id);
      if (inf) applyInferredGlow(inf, intensity, isLocked);
    });

    animRef.current = requestAnimationFrame(tick);
  }

  function startAnim() {
    if (!animRef.current) animRef.current = requestAnimationFrame(tick);
  }

  function stopAnim() {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    // Clear all glow
    ovRefsMap.current.forEach((img) => clearGlow(img));
    infRefsMap.current.forEach((img) => clearGlow(img));
  }

  // ── Mobile detect ──
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Preload overlays + compute bboxes ──
  useEffect(() => {
    const els = record.elements.filter((el) => el.overlay_path);
    if (els.length === 0) { setImagesLoaded(true); return; }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const boxes: ElementBBox[] = [];
    let loaded = 0;

    els.forEach((el) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const box = computeBBox(img, el.id, canvas, ctx);
        if (box) boxes.push(box);
        loaded++;
        if (loaded === els.length) {
          setBboxes(boxes);
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === els.length) {
          setBboxes(boxes);
          setImagesLoaded(true);
        }
      };
      img.src = overlayUrl(el.overlay_path) || '';
    });

    return () => { stopAnim(); };
  }, [record.elements]);

  // ── Layout sync ──
  const syncLayout = useCallback(() => {
    if (!wrapRef.current || !imgRef.current) return;
    const wr = wrapRef.current.getBoundingClientRect();
    const ir = imgRef.current.getBoundingClientRect();
    setImgLayout({
      left: (ir.left - wr.left) / zoom,
      top: (ir.top - wr.top) / zoom,
      width: ir.width / zoom,
      height: ir.height / zoom,
    });
  }, [zoom]);

  useEffect(() => {
    syncLayout();
    const t = setTimeout(syncLayout, 300);
    window.addEventListener('resize', syncLayout);
    return () => { clearTimeout(t); window.removeEventListener('resize', syncLayout); };
  }, [syncLayout, showBackground, imagesLoaded]);

  // ── Zoom ──
  function handleZoom(delta: number) {
    setZoom((prev) => Math.max(1, Math.min(6, prev + delta)));
  }
  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -0.3 : 0.3);
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom > 1 && e.button === 0) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }
  function handleMouseMoveContainer(e: React.MouseEvent) {
    if (isPanning) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    }
  }
  function handleMouseUp() { setIsPanning(false); }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      setIsPanning(true);
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setZoom((prev) => Math.max(1, Math.min(6, prev * (dist / pinchStart.current!))));
      pinchStart.current = dist;
    } else if (e.touches.length === 1 && isPanning) {
      setPan({
        x: panStart.current.panX + (e.touches[0].clientX - panStart.current.x),
        y: panStart.current.panY + (e.touches[0].clientY - panStart.current.y),
      });
    }
  }
  function handleTouchEnd() { pinchStart.current = null; setIsPanning(false); }

  // ── Derived ──
  const visibleEls = hoveredEl && !lockedEls.includes(hoveredEl) ? [...lockedEls, hoveredEl] : lockedEls;
  const selectedElementData = record.elements.filter((el) => visibleEls.includes(el.id));
  const matchingGroupings = record.groupings.filter(
    (g) => lockedEls.length > 0 && lockedEls.every((id) => g.element_ids.includes(id))
  );

  // ── Click handling ──
  function handleClickElement(id: string) {
    if (multiSelect) {
      setLockedEls((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    } else {
      setLockedEls((prev) => prev.length === 1 && prev[0] === id ? [] : [id]);
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

  // ── Keyboard ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setLockedEls([]); setMultiSelect(false); resetZoom(); }
      if (e.key === 'm' || e.key === 'M') setMultiSelect((p) => !p);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navElement(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navElement(-1); }
      if (e.key === '+' || e.key === '=') handleZoom(0.5);
      if (e.key === '-') handleZoom(-0.5);
      if (e.key === '0') resetZoom();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record.elements, lockedEls, hoveredEl]);

  function navElement(dir: number) {
    const currentId = lockedEls[lockedEls.length - 1] || hoveredEl;
    const idx = record.elements.findIndex((el) => el.id === currentId);
    const next = idx < 0 ? 0 : (idx + dir + record.elements.length) % record.elements.length;
    setLockedEls([record.elements[next].id]);
    setMultiSelect(false);
  }

  // ── Annotation submission ──
  const handleSubmitAnnotation = useCallback(async (form: AnnotationFormData) => {
    if (!profile) return;
    const { data, error } = await submitAnnotation({
      record_id: record.id,
      target_type: form.targetType,
      target_id: form.targetId || record.id,
      contributor_id: profile.id,
      type: form.type,
      body: form.body + (form.boundaryCorrection ? `\n\n[Boundary correction: ${form.boundaryCorrection}]` : ''),
      sources_cited: form.sourcesCited ? form.sourcesCited.split(',').map((s) => s.trim()) : [],
      confidence: form.confidence,
      visibility: form.visibility,
    });
    if (error) { console.error('Annotation error:', error); return; }
    if (data) {
      setLocalAnnotations((prev) => [{
        ...data,
        contributor_name: profile.full_name,
        contributor_affiliation: profile.affiliation || undefined,
        contributor_orcid: profile.orcid || undefined,
      }, ...prev]);
    }
  }, [record.id, profile]);

  // ── URLs ──
  const backgroundUrl = photoUrl(record.background_path);
  const baseOverlayUrl = overlayUrl(record.base_overlay_path);

  return (
    <div>
      {/* Status badges */}
      <div className="flex gap-2 flex-wrap px-4 py-3 items-center border-b border-mapsa-border/40">
        {record.status.map((st) => (
          <StatusBadge key={st} text={st} variant={st === 'NEEDS EXPERT REVIEW' ? 'red' : 'default'} />
        ))}
        <span className="mapsa-mono text-[0.69rem] ml-auto">v{record.record_version}</span>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* ── LEFT ── */}
        <div className="flex-1 min-w-[320px] flex flex-col border-r border-mapsa-border overflow-hidden">
          {/* Controls */}
          <div className="flex gap-2 flex-wrap px-4 pt-3 pb-2 shrink-0 border-b border-mapsa-border/40 items-center">
            <span className="mapsa-label self-center mr-1">Layers</span>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowBackground((p) => !p); }}
              className={`mapsa-btn text-2xs ${showBackground ? 'mapsa-btn-active' : ''}`}
            >Background</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowGlyphs((p) => !p); }}
              className={`mapsa-btn text-2xs ${showGlyphs ? 'mapsa-btn-active' : ''}`}
            >Glyph Shapes</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowInferred((p) => !p); }}
              className={`mapsa-btn text-2xs ${showInferred ? 'mapsa-btn-active' : ''}`}
              style={{
                borderColor: showInferred ? '#7ea8be' : undefined,
                background: showInferred ? '#7ea8be' : undefined,
                color: showInferred ? '#18140f' : undefined,
              }}
            >Inferred</button>
            <div className="ml-auto flex items-center gap-1.5">
              <button onMouseDown={(e) => { e.preventDefault(); handleZoom(-0.5); }} className="mapsa-btn text-2xs px-2">−</button>
              <span className="mapsa-mono text-[0.56rem] w-[3em] text-center">{Math.round(zoom * 100)}%</span>
              <button onMouseDown={(e) => { e.preventDefault(); handleZoom(0.5); }} className="mapsa-btn text-2xs px-2">+</button>
              {zoom > 1 && (
                <button onMouseDown={(e) => { e.preventDefault(); resetZoom(); }} className="mapsa-btn text-2xs px-2">⟲</button>
              )}
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 min-h-0 px-4 pb-2">
            <div
              className="relative h-full overflow-hidden rounded-md border border-mapsa-border"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMoveContainer}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); if (!isMobile && lockedEls.length === 0) setHoveredEl(null); }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                ref={wrapRef}
                className="relative h-full"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'top left',
                  transition: isPanning ? 'none' : 'transform 0.2s ease',
                }}
              >
                {/* Base photo */}
                {showBackground && backgroundUrl && (
                  <img
                    ref={imgRef}
                    src={backgroundUrl}
                    alt="Base photograph"
                    className="block h-full w-auto max-w-full object-contain select-none"
                    style={{ objectPosition: 'top left', boxShadow: '0 6px 28px rgba(0,0,0,.55)' }}
                    onLoad={() => setTimeout(syncLayout, 50)}
                    draggable={false}
                  />
                )}

                {/* Line drawing fallback */}
                {!showBackground && baseOverlayUrl && (
                  <img
                    ref={imgRef}
                    src={baseOverlayUrl}
                    alt="Line drawing"
                    className="block h-full w-auto max-w-full object-contain select-none"
                    style={{ objectPosition: 'top left' }}
                    onLoad={() => setTimeout(syncLayout, 50)}
                    draggable={false}
                  />
                )}

                {/* Glyph overlays — hidden by default, shown via direct DOM */}
                {showGlyphs && record.elements.map((el) => {
                  const url = overlayUrl(el.overlay_path);
                  if (!url) return null;
                  return (
                    <img
                      key={`ov-${el.id}`}
                      ref={(node) => { if (node) ovRefsMap.current.set(el.id, node); }}
                      src={url}
                      alt={el.label}
                      style={{
                        position: 'absolute',
                        left: imgLayout.left, top: imgLayout.top,
                        width: imgLayout.width, height: imgLayout.height,
                        objectFit: 'contain', objectPosition: 'top left',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: 5,
                        opacity: 0,
                        display: 'none',
                      }}
                      draggable={false}
                    />
                  );
                })}

                {/* Inferred overlays — hidden by default */}
                {showInferred && record.elements.filter((el) => el.inferred_overlay_path).map((el) => {
                  const url = overlayUrl(el.inferred_overlay_path);
                  if (!url) return null;
                  return (
                    <img
                      key={`inf-${el.id}`}
                      ref={(node) => { if (node) infRefsMap.current.set(el.id, node); }}
                      src={url}
                      alt={`${el.label} inferred`}
                      style={{
                        position: 'absolute',
                        left: imgLayout.left, top: imgLayout.top,
                        width: imgLayout.width, height: imgLayout.height,
                        objectFit: 'contain', objectPosition: 'top left',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: 6,
                        opacity: 0,
                        display: 'none',
                      }}
                      draggable={false}
                    />
                  );
                })}

                {/* Invisible hotspot zones */}
                {showGlyphs && imagesLoaded && bboxes.map((box) => (
                  <div
                    key={`hs-${box.id}`}
                    style={{
                      position: 'absolute',
                      left: imgLayout.left + box.left * imgLayout.width,
                      top: imgLayout.top + box.top * imgLayout.height,
                      width: box.width * imgLayout.width,
                      height: box.height * imgLayout.height,
                      cursor: 'pointer',
                      zIndex: 20,
                      background: 'transparent',
                      minWidth: 44, minHeight: 44,
                    }}
                    onMouseEnter={() => {
                      if (isMobile || lockedEls.length > 0) return;
                      setHoveredEl(box.id);
                    }}
                    onMouseLeave={() => {
                      if (isMobile || lockedEls.length > 0) return;
                      setHoveredEl(null);
                    }}
                    onClick={(e) => { e.stopPropagation(); handleClickElement(box.id); }}
                    onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleClickElement(box.id); }}
                  />
                ))}

                {/* Element label badges */}
                {showGlyphs && (hoveredEl || lockedEls.length > 0) && (
                  <div style={{
                    position: 'absolute', top: imgLayout.top + 8, left: imgLayout.left + 8,
                    zIndex: 30, display: 'flex', flexWrap: 'wrap', gap: 4,
                  }}>
                    {visibleEls.map((elId) => {
                      const el = record.elements.find((e) => e.id === elId);
                      if (!el) return null;
                      const isLocked = lockedEls.includes(elId);
                      return (
                        <span key={elId} style={{
                          fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.05em',
                          fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                          color: isLocked ? '#e8d49a' : '#c8a96e',
                          background: 'rgba(0,0,0,0.6)',
                          textShadow: isLocked ? '0 0 8px rgba(200,169,110,0.5)' : 'none',
                        }}>
                          {el.label}
                          {el.inferred_overlay_path && showInferred && (
                            <span style={{ color: '#66ff96', marginLeft: 4 }}>+inf</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Multi-select badge */}
              {multiSelect && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="font-mono text-[0.56rem] text-mapsa-gold bg-black/70 px-2.5 py-1 rounded border border-mapsa-gold/40">
                    {isMobile ? 'GROUP SELECT · Tap elements' : 'GROUP SELECT · Click elements · Press M to exit'}
                  </span>
                </div>
              )}

              {/* Hint */}
              {!lockedEls.length && !hoveredEl && record.elements.length > 0 && showGlyphs && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="font-cinzel text-[0.5rem] text-mapsa-muted/50 tracking-[0.2em] uppercase bg-black/30 px-3 py-1.5 rounded">
                    {isMobile ? 'Tap a glyph to select' : 'Hover to preview · Click to lock · Ctrl+Scroll to zoom'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile bar */}
          {isMobile && record.elements.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt">
              <button
                onMouseDown={(e) => { e.preventDefault(); setMultiSelect((p) => !p); }}
                className={`mapsa-btn text-2xs ${multiSelect ? 'mapsa-btn-active' : ''}`}
              >{multiSelect ? '✓ Grouping' : 'Group Select'}</button>
              {lockedEls.length > 0 && (
                <button onMouseDown={(e) => { e.preventDefault(); setLockedEls([]); setMultiSelect(false); }} className="mapsa-btn text-2xs">
                  Clear ({lockedEls.length})
                </button>
              )}
              <span className="font-mono text-[0.56rem] text-mapsa-muted/60 ml-auto">
                {lockedEls.length ? `${lockedEls.length} selected` : `${record.elements.length} glyphs`}
              </span>
            </div>
          )}

          {/* Caption */}
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[0.69rem] text-mapsa-muted leading-snug">{record.title}</p>
            <p className="text-[0.56rem] text-mapsa-muted">{record.photographer} · {record.date_photographed}</p>
          </div>

          {/* Citations */}
          <div className="shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt px-4 py-3 min-h-[120px]">
            {selectedElementData.length === 0 ? (
              <p className="font-garamond text-sm text-mapsa-muted/50 italic">
                Select a glyph to view primary sources &amp; citations.
              </p>
            ) : (
              <div>
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <span className="mapsa-label text-[0.5rem]">Primary Sources &amp; Citations</span>
                  <span className="font-cinzel text-sm text-mapsa-gold-light font-semibold">
                    {selectedElementData.map((el) => el.label).join(' + ')}
                  </span>
                </div>
                {localAnnotations
                  .filter((ann) => (ann.status === 'published' || ann.status === 'pending') &&
                    selectedElementData.some((el) => ann.target_id === el.id || ann.target_id === record.id))
                  .slice(0, 3)
                  .map((ann) => (
                    <div key={ann.id} className="border-l-2 border-mapsa-gold/40 pl-3 py-1.5 mb-2 rounded-r bg-white/[0.03]">
                      <p className="font-mono text-[0.56rem] text-mapsa-gold mb-0.5">
                        {ann.contributor_name}{ann.contributor_affiliation && ` · ${ann.contributor_affiliation}`} · {ann.created_at?.split('T')[0]}
                      </p>
                      <p className="font-garamond text-xs text-mapsa-muted italic leading-snug">{ann.type}</p>
                      <p className="font-garamond text-xs text-mapsa-muted leading-relaxed line-clamp-2">{ann.body}</p>
                      {ann.status === 'pending' && <span className="mapsa-tag text-[0.5rem] mt-1 inline-block">⏳ pending review</span>}
                    </div>
                  ))}
                {record.sources.slice(0, 2).map((src) => (
                  <div key={src.id} className="border-l-2 border-mapsa-gold/30 pl-3 py-1 mb-1.5 rounded-r bg-white/[0.02]">
                    <p className="font-mono text-[0.56rem] text-mapsa-gold">{src.author} {src.year}</p>
                    <p className="font-garamond text-xs text-mapsa-text italic">{src.title}</p>
                    <p className="font-garamond text-[0.6rem] text-mapsa-muted">{src.publication}{src.pages && `, ${src.pages}`}</p>
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

      <div className="mapsa-disclaimer mx-4 my-3">
        MAPSA separates visual evidence, candidate segmentation, grouping
        hypotheses, and interpretation. Overlays are interpretive aids, not
        substitutes for primary photographic evidence.
      </div>
    </div>
  );
}
