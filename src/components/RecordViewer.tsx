"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  InscriptionRecord,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
  BBoxZone,
} from "@/lib/types";
import { overlayUrl, photoUrl, submitAnnotation } from "@/lib/data";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import GlyphSidebar from "./GlyphSidebar";
import StatusBadge from "./StatusBadge";
import { useAuth } from "@/lib/AuthContext";
import pkg from "../../package.json";

interface RecordViewerProps {
  record: InscriptionRecord;
}

function applyGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter = 'drop-shadow(0 0 1px rgba(255,250,220,1)) drop-shadow(0 0 2px rgba(255,235,160,0.9)) drop-shadow(0 0 4px rgba(255,215,100,0.5))';
  } else {
    const a1 = (0.6 + 0.4 * intensity).toFixed(2);
    const a2 = (0.35 + 0.45 * intensity).toFixed(2);
    el.style.filter = `drop-shadow(0 0 1px rgba(255,250,220,${a1})) drop-shadow(0 0 2px rgba(255,235,160,${a2}))`;
  }
}

function applyInferredGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter = 'drop-shadow(0 0 1px rgba(140,255,180,1)) drop-shadow(0 0 2px rgba(110,240,155,0.9)) drop-shadow(0 0 4px rgba(80,220,130,0.5))';
  } else {
    const a1 = (0.6 + 0.4 * intensity).toFixed(2);
    const a2 = (0.35 + 0.45 * intensity).toFixed(2);
    el.style.filter = `drop-shadow(0 0 1px rgba(140,255,180,${a1})) drop-shadow(0 0 2px rgba(110,240,155,${a2}))`;
  }
}

function clearGlow(el: HTMLElement) { el.style.filter = ''; }

const HIGH_Z_LABELS = ['E22'];

function hitTestZones(elements: CandidateElement[], nx: number, ny: number): string | null {
  for (const el of elements) {
    if (!HIGH_Z_LABELS.includes(el.label)) continue;
    for (const z of (el.bbox_zones || [])) {
      if (nx >= z.left && nx <= z.left + z.width && ny >= z.top && ny <= z.top + z.height) return el.id;
    }
  }
  for (const el of elements) {
    if (HIGH_Z_LABELS.includes(el.label)) continue;
    for (const z of (el.bbox_zones || [])) {
      if (nx >= z.left && nx <= z.left + z.width && ny >= z.top && ny <= z.top + z.height) return el.id;
    }
  }
  return null;
}

export default function RecordViewer({ record }: RecordViewerProps) {
  const { profile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const ovRefsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const infRefsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);
  const lockedRef = useRef<string[]>([]);
  const hiddenSubsRef = useRef<Set<string>>(new Set());

  const [bgOn, setBgOn] = useState(false);
  const [glyphsOn, setGlyphsOn] = useState(true);
  const [inferredOn, setInferredOn] = useState(false);

  const [lockedEls, _setLockedEls] = useState<string[]>([]);
  const [hoveredEl, _setHoveredEl] = useState<string | null>(null);
  const [hiddenSubs, setHiddenSubs] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(record.annotations);
  const [localGroupings, setLocalGroupings] = useState<GroupingHypothesis[]>(record.groupings);

  // Track the rendered image size so the transform container has a fixed size
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // Simple zoom/pan: CSS transform on the image wrapper
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Touch refs
  const pinchBaseDist = useRef(0);
  const pinchBaseZoom = useRef(1);
  const pinchBasePanX = useRef(0);
  const pinchBasePanY = useRef(0);
  const pinchMidX = useRef(0);
  const pinchMidY = useRef(0);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragBasePanX = useRef(0);
  const dragBasePanY = useRef(0);
  const touchCount = useRef(0);
  const touchMoved = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const inferredEls = record.elements.filter((el) => el.inferred_overlay_path);

  function setLockedEls(val: string[] | ((prev: string[]) => string[])) {
    _setLockedEls((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      lockedRef.current = next;
      syncOverlays();
      return next;
    });
  }

  function setHoveredEl(val: string | null) {
    hoveredRef.current = val;
    _setHoveredEl(val);
    syncOverlays();
  }

  function toggleSub(key: string) {
    setHiddenSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      hiddenSubsRef.current = next;
      syncOverlays();
      return next;
    });
  }

  // ── Overlay visibility (direct DOM) ──
  function syncOverlays() {
    const hovered = hoveredRef.current;
    const locked = lockedRef.current;
    const hidden = hiddenSubsRef.current;
    const activeIds = new Set(locked);
    if (hovered) activeIds.add(hovered);

    // First: clear ALL glow on every overlay
    ovRefsMap.current.forEach((img) => clearGlow(img));
    infRefsMap.current.forEach((img) => clearGlow(img));

    ovRefsMap.current.forEach((img, id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const isSubHidden = hidden.has(`${label}-relief`);
      const shouldShow = !isSubHidden && (glyphsOn || activeIds.has(id));
      img.style.visibility = shouldShow ? 'visible' : 'hidden';
      img.style.opacity = shouldShow ? '1' : '0';
    });

    infRefsMap.current.forEach((img, id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const isSubHidden = hidden.has(`${label}-inferred`);
      const shouldShow = !isSubHidden && (inferredOn || glyphsOn || activeIds.has(id));
      img.style.visibility = shouldShow ? 'visible' : 'hidden';
      img.style.opacity = shouldShow ? '1' : '0';
    });

    if (activeIds.size > 0 || inferredOn) startAnim(); else stopAnim();
  }

  useEffect(() => { syncOverlays(); }, [glyphsOn, inferredOn, bgOn]);

  // ── Glow animation ──
  function tick() {
    const hovered = hoveredRef.current;
    const locked = lockedRef.current;
    const hidden = hiddenSubsRef.current;
    const activeIds = new Set(locked);
    if (hovered) activeIds.add(hovered);
    const isLocked = locked.length > 0;
    phaseRef.current += 0.025;
    const intensity = 0.5 + 0.5 * Math.sin(phaseRef.current);

    activeIds.forEach((id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const ov = ovRefsMap.current.get(id);
      if (ov && ov.style.visibility !== 'hidden' && !hidden.has(`${label}-relief`)) applyGlow(ov, intensity, isLocked);
      const inf = infRefsMap.current.get(id);
      if (inf && inf.style.visibility !== 'hidden' && !hidden.has(`${label}-inferred`)) applyInferredGlow(inf, intensity, isLocked);
    });

    if (inferredOn) {
      infRefsMap.current.forEach((img, id) => {
        const el = record.elements.find((e) => e.id === id);
        const label = el?.label || '';
        if (img.style.visibility !== 'hidden' && !hidden.has(`${label}-inferred`) && !activeIds.has(id)) applyInferredGlow(img, intensity, true);
      });
    }

    if (activeIds.size > 0 || inferredOn) animRef.current = requestAnimationFrame(tick);
    else animRef.current = null;
  }

  function startAnim() { if (!animRef.current) animRef.current = requestAnimationFrame(tick); }
  function stopAnim() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    ovRefsMap.current.forEach((img) => clearGlow(img));
    infRefsMap.current.forEach((img) => clearGlow(img));
  }

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0); }
    check(); window.addEventListener('resize', check);
    function syncSize() {
      if (imgRef.current) setImgSize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
    }
    window.addEventListener('resize', syncSize);
    return () => { window.removeEventListener('resize', check); window.removeEventListener('resize', syncSize); };
  }, []);

  useEffect(() => { return () => { stopAnim(); }; }, []);

  // ── Desktop zoom ──
  function handleZoom(delta: number) { setZoom((prev) => Math.max(1, Math.min(6, prev + delta))); }
  function resetView() { setZoom(1); setPanX(0); setPanY(0); }

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.3 : 0.3); }
  }

  // ── Desktop mouse pan ──
  function handleMouseDown(e: React.MouseEvent) {
    if (zoom > 1 && e.button === 0) {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      dragBasePanX.current = panX;
      dragBasePanY.current = panY;
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isDragging.current) {
      setPanX(dragBasePanX.current + e.clientX - dragStartX.current);
      setPanY(dragBasePanY.current + e.clientY - dragStartY.current);
    }
  }

  function handleMouseUp() { isDragging.current = false; }

  // ── Mobile touch ──
  function handleTouchStart(e: React.TouchEvent) {
    touchCount.current = e.touches.length;
    touchMoved.current = false;

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchBaseDist.current = Math.hypot(dx, dy);
      pinchBaseZoom.current = zoom;
      pinchBasePanX.current = panX;
      pinchBasePanY.current = panY;
      pinchMidX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      pinchMidY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      dragStartX.current = e.touches[0].clientX;
      dragStartY.current = e.touches[0].clientY;
      dragBasePanX.current = panX;
      dragBasePanY.current = panY;
      isDragging.current = zoom > 1;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchBaseDist.current > 0) {
      touchMoved.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newZoom = Math.max(1, Math.min(6, pinchBaseZoom.current * (dist / pinchBaseDist.current)));

      // Keep the pinch midpoint fixed on screen
      const scale = newZoom / pinchBaseZoom.current;
      const newPanX = pinchMidX.current - (pinchMidX.current - pinchBasePanX.current) * scale;
      const newPanY = pinchMidY.current - (pinchMidY.current - pinchBasePanY.current) * scale;

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    } else if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStartX.current;
      const dy = e.touches[0].clientY - dragStartY.current;
      setPanX(dragBasePanX.current + dx);
      setPanY(dragBasePanY.current + dy);
      if (Math.hypot(e.touches[0].clientX - touchStartX.current, e.touches[0].clientY - touchStartY.current) > 10) {
        touchMoved.current = true;
      }
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const wasPinch = touchCount.current >= 2;
    const wasMoved = touchMoved.current;

    if (e.touches.length === 0) {
      pinchBaseDist.current = 0;
      isDragging.current = false;
      if (zoom <= 1.05) { setZoom(1); setPanX(0); setPanY(0); }
    }

    if (!wasPinch && !wasMoved && e.changedTouches.length === 1) {
      setHasInteracted(true);
      const touch = e.changedTouches[0];
      const hitId = getTouchHitElement(touch.clientX, touch.clientY);
      if (hitId) handleClickElement(hitId);
      else if (!multiSelect) setLockedEls([]);
    }

    touchCount.current = e.touches.length;
  }

  // ── Hit detection via actual rendered image rect ──
  function getTouchHitElement(clientX: number, clientY: number): string | null {
    if (!imgRef.current) return null;
    const ir = imgRef.current.getBoundingClientRect();
    const nx = (clientX - ir.left) / ir.width;
    const ny = (clientY - ir.top) / ir.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    return hitTestZones(record.elements, nx, ny);
  }

  // ── Derived ──
  const visibleEls = hoveredEl && !lockedEls.includes(hoveredEl) ? [...lockedEls, hoveredEl] : lockedEls;
  const selectedElementData = record.elements.filter((el) => visibleEls.includes(el.id));
  const matchingGroupings = localGroupings.filter(
    (g) => lockedEls.length > 0 && lockedEls.every((id) => g.element_ids.includes(id))
  );

  function handleClickElement(id: string) {
    setHasInteracted(true);
    setHiddenSubs(new Set()); hiddenSubsRef.current = new Set();
    if (multiSelect) {
      setLockedEls((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    } else {
      // Clear hover so only the clicked element shows
      hoveredRef.current = null;
      _setHoveredEl(null);
      _setLockedEls((prev) => {
        const next = prev.includes(id) ? [] : [id];
        lockedRef.current = next;
        // Synchronously update overlays with the new state
        setTimeout(() => syncOverlays(), 0);
        return next;
      });
    }
  }

  function handleSelectGrouping(g: GroupingHypothesis) {
    hoveredRef.current = null;
    _setHoveredEl(null);
    lockedRef.current = g.element_ids;
    _setLockedEls(g.element_ids);
    setMultiSelect(false);
    setHiddenSubs(new Set());
    hiddenSubsRef.current = new Set();
    setTimeout(() => syncOverlays(), 0);
  }
  function handleSelectElement(el: CandidateElement) { setLockedEls([el.id]); setMultiSelect(false); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLockedEls([]); setMultiSelect(false); resetView(); setHiddenSubs(new Set()); hiddenSubsRef.current = new Set();
      }
      if (e.key === 'm' || e.key === 'M') setMultiSelect((p) => !p);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navElement(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navElement(-1); }
      if (e.key === '+' || e.key === '=') handleZoom(0.5);
      if (e.key === '-') handleZoom(-0.5);
      if (e.key === '0') resetView();
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

  const handleSubmitAnnotation = useCallback(async (form: AnnotationFormData) => {
    if (!profile) return;
    const { data, error } = await submitAnnotation({
      record_id: record.id, target_type: form.targetType, target_id: form.targetId || record.id,
      contributor_id: profile.id, type: form.type,
      body: form.body + (form.boundaryCorrection ? `\n\n[Boundary correction: ${form.boundaryCorrection}]` : ''),
      sources_cited: form.sourcesCited ? form.sourcesCited.split(',').map((s) => s.trim()) : [],
      confidence: form.confidence, visibility: form.visibility,
    });
    if (error) { console.error('Annotation error:', error); return; }
    if (data) setLocalAnnotations((prev) => [{ ...data, contributor_name: profile.full_name, contributor_affiliation: profile.affiliation || undefined, contributor_orcid: profile.orcid || undefined }, ...prev]);
  }, [record.id, profile]);

  const handleAddGrouping = useCallback((g: GroupingHypothesis) => { setLocalGroupings((prev) => [...prev, g]); }, []);

  const backgroundUrl = photoUrl(record.background_path);
  const baseOverlayUrl = overlayUrl(record.base_overlay_path);

  const sortedElements = [...record.elements].sort((a, b) => {
    const aHigh = HIGH_Z_LABELS.includes(a.label);
    const bHigh = HIGH_Z_LABELS.includes(b.label);
    if (aHigh && !bHigh) return 1; if (!aHigh && bHigh) return -1; return 0;
  });

  // ── Shared overlay style: fill the image exactly ──
  const ovStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'contain', objectPosition: 'top left',
    pointerEvents: 'none', userSelect: 'none',
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap px-4 py-3 items-center border-b border-mapsa-border/40">
        {record.status.map((st) => (
          <StatusBadge key={st} text={st} variant={st === 'NEEDS EXPERT REVIEW' ? 'red' : 'default'} />
        ))}
        <span className="mapsa-mono text-[0.69rem] ml-auto">v{pkg.version}</span>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="flex-1 min-w-[320px] flex flex-col border-r border-mapsa-border overflow-hidden">
          {/* Controls */}
          <div className="flex gap-2 flex-wrap px-4 pt-3 pb-2 shrink-0 border-b border-mapsa-border/40 items-center">
            <span className="mapsa-label self-center mr-1">Layers</span>
            <button onMouseDown={(e) => { e.preventDefault(); setBgOn((p) => !p); }}
              className={`mapsa-btn text-2xs ${bgOn ? 'mapsa-btn-active' : ''}`}>{isMobile ? 'BG' : 'Background'}</button>
            <button onMouseDown={(e) => { e.preventDefault(); setGlyphsOn((p) => !p); }}
              className={`mapsa-btn text-2xs ${glyphsOn ? 'mapsa-btn-active' : ''}`}>{isMobile ? 'Shapes' : 'Glyph Shapes'}</button>
            <button onMouseDown={(e) => { e.preventDefault(); setInferredOn((p) => !p); }}
              className={`mapsa-btn text-2xs ${inferredOn ? 'mapsa-btn-active' : ''}`}
              style={{ borderColor: inferredOn ? '#7ea8be' : undefined, background: inferredOn ? '#7ea8be' : undefined, color: inferredOn ? '#18140f' : undefined }}>
              {isMobile ? 'Inf' : 'Inferred'}</button>
            <div className="ml-auto flex items-center gap-1.5">
              {!isMobile && (
                <>
                  <button onMouseDown={(e) => { e.preventDefault(); handleZoom(-0.5); }} className="mapsa-btn text-2xs px-2">−</button>
                  <span className="mapsa-mono text-[0.56rem] w-[3em] text-center">{Math.round(zoom * 100)}%</span>
                  <button onMouseDown={(e) => { e.preventDefault(); handleZoom(0.5); }} className="mapsa-btn text-2xs px-2">+</button>
                  {zoom > 1 && <button onMouseDown={(e) => { e.preventDefault(); resetView(); }} className="mapsa-btn text-2xs px-2">⟲</button>}
                </>
              )}
            </div>
          </div>

          {/* Image viewer */}
          <div className="flex-1 min-h-0 relative">
            <div
              ref={containerRef}
              className="relative overflow-hidden"
              style={{ width: '100%', height: '100%', touchAction: 'none', cursor: zoom > 1 ? 'grab' : 'default' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); if (!isMobile && lockedEls.length === 0) setHoveredEl(null); }}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            >
              {/* This div gets transformed — explicit size prevents layout shift */}
              <div style={{
                position: 'relative',
                width: imgSize.w || 'auto',
                height: imgSize.h || '100%',
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}>
                {/* Base image — on load, locks the container size */}
                {backgroundUrl && (
                  <img ref={imgRef} src={backgroundUrl} alt="Base photograph"
                    className="select-none"
                    style={{
                      display: 'block', height: '100%', width: 'auto',
                      boxShadow: '0 6px 28px rgba(0,0,0,.55)',
                    }}
                    onLoad={() => {
                      if (imgRef.current) {
                        setImgSize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
                      }
                    }}
                    draggable={false} />
                )}

                {/* BG overlay — same size as image, on top */}
                {bgOn && baseOverlayUrl && (
                  <img src={baseOverlayUrl} alt="BG overlay" style={{ ...ovStyle, zIndex: 3 }} draggable={false} />
                )}

                {/* Relief overlays */}
                {record.elements.map((el) => {
                  const url = overlayUrl(el.overlay_path);
                  if (!url) return null;
                  return (
                    <img key={`ov-${el.id}`}
                      ref={(node) => { if (node) ovRefsMap.current.set(el.id, node); }}
                      src={url} alt={el.label}
                      style={{ ...ovStyle, zIndex: HIGH_Z_LABELS.includes(el.label) ? 7 : 5, opacity: 0, visibility: 'hidden' as const }}
                      draggable={false} />
                  );
                })}

                {/* Inferred overlays */}
                {inferredEls.map((el) => {
                  const url = overlayUrl(el.inferred_overlay_path);
                  if (!url) return null;
                  return (
                    <img key={`inf-${el.id}`}
                      ref={(node) => { if (node) infRefsMap.current.set(el.id, node); }}
                      src={url} alt={`${el.label} inferred`}
                      style={{ ...ovStyle, zIndex: 6, opacity: 0, visibility: 'hidden' as const }}
                      draggable={false} />
                  );
                })}

                {/* Desktop hotspots — positioned as % of image */}
                {!isMobile && sortedElements.map((el) => {
                  const zones = el.bbox_zones || [];
                  if (zones.length === 0) return null;
                  const isHighZ = HIGH_Z_LABELS.includes(el.label);
                  return zones.map((zone, zi) => (
                    <div key={`hs-${el.id}-${zi}`} style={{
                      position: 'absolute',
                      left: `${zone.left * 100}%`, top: `${zone.top * 100}%`,
                      width: `${zone.width * 100}%`, height: `${zone.height * 100}%`,
                      cursor: 'pointer', zIndex: isHighZ ? 22 : 20,
                    }}
                      onMouseEnter={() => { setHoveredEl(el.id); }}
                      onMouseLeave={() => { setHoveredEl(null); }}
                      onClick={(e) => { e.stopPropagation(); handleClickElement(el.id); }}
                    />
                  ));
                })}

                {/* Labels */}
                {(hoveredEl || lockedEls.length > 0) && (
                  <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 30, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {visibleEls.map((elId) => {
                      const el = record.elements.find((e) => e.id === elId);
                      if (!el) return null;
                      const isLocked = lockedEls.includes(elId);
                      return (
                        <span key={elId} style={{
                          fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.05em', fontWeight: 600,
                          padding: '2px 6px', borderRadius: 3,
                          color: isLocked ? '#e8d49a' : '#c8a96e', background: 'rgba(0,0,0,0.6)',
                        }}>
                          {el.label}
                          {el.inferred_overlay_path && <span style={{ color: '#66ff96', marginLeft: 4 }}>+inf</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mobile floating controls */}
              {isMobile && (
                <div className="absolute top-2 left-2 right-12 z-40 flex items-center gap-2">
                  <button onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setMultiSelect((p) => !p); }}
                    className="mapsa-btn text-2xs shadow-lg"
                    style={{ background: multiSelect ? '#c8a96e' : 'rgba(31,26,20,0.9)', color: multiSelect ? '#18140f' : '#e8dcc8' }}>
                    {multiSelect ? '✓ Group' : 'Group'}</button>
                  {lockedEls.length > 0 && (
                    <button onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setLockedEls([]); setMultiSelect(false); }}
                      className="mapsa-btn text-2xs shadow-lg" style={{ background: 'rgba(31,26,20,0.9)' }}>
                      Clear ({lockedEls.length})</button>
                  )}
                  {zoom > 1 && (
                    <button onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); resetView(); }}
                      className="mapsa-btn text-2xs shadow-lg ml-auto" style={{ background: 'rgba(31,26,20,0.9)' }}>Reset</button>
                  )}
                </div>
              )}

              {/* Group select badge — desktop */}
              {multiSelect && !isMobile && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="font-mono text-[0.56rem] text-mapsa-gold bg-black/70 px-2.5 py-1 rounded border border-mapsa-gold/40">
                    GROUP SELECT · Click elements · Press M to exit</span>
                </div>
              )}

              {/* Hint */}
              {!hasInteracted && !lockedEls.length && !hoveredEl && record.elements.length > 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="font-cinzel text-[0.5rem] text-mapsa-muted/50 tracking-[0.2em] uppercase bg-black/30 px-3 py-1.5 rounded">
                    {isMobile ? 'Tap a glyph · Pinch to zoom' : 'Hover · Click to lock · Ctrl+Scroll zoom'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[0.69rem] text-mapsa-muted leading-snug">{record.title}</p>
            <p className="text-[0.56rem] text-mapsa-muted">{record.photographer} · {record.date_photographed}</p>
          </div>

          {/* Citations */}
          <div className="shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt px-4 py-3 min-h-[120px]">
            {selectedElementData.length === 0 ? (
              <p className="font-garamond text-sm text-mapsa-muted/50 italic">Select a glyph to view primary sources &amp; citations.</p>
            ) : (
              <div>
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <span className="mapsa-label text-[0.5rem]">Primary Sources &amp; Citations</span>
                  <span className="font-cinzel text-sm text-mapsa-gold-light font-semibold">
                    {selectedElementData.map((el) => el.label).join(' + ')}</span>
                </div>
                {localAnnotations
                  .filter((ann) => (ann.status === 'published' || ann.status === 'pending') &&
                    selectedElementData.some((el) => ann.target_id === el.id || ann.target_id === record.id))
                  .slice(0, 3).map((ann) => (
                    <div key={ann.id} className="border-l-2 border-mapsa-gold/40 pl-3 py-1.5 mb-2 rounded-r bg-white/[0.03]">
                      <p className="font-mono text-[0.56rem] text-mapsa-gold mb-0.5">
                        {ann.contributor_name}{ann.contributor_affiliation && ` · ${ann.contributor_affiliation}`} · {ann.created_at?.split('T')[0]}</p>
                      <p className="font-garamond text-xs text-mapsa-muted italic leading-snug">{ann.type}</p>
                      <p className="font-garamond text-xs text-mapsa-muted leading-relaxed line-clamp-2">{ann.body}</p>
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

        <GlyphSidebar
          record={record} annotations={localAnnotations} selectedElements={selectedElementData}
          lockedEls={lockedEls} matchingGroupings={matchingGroupings} multiSelect={multiSelect}
          hiddenSubs={hiddenSubs} isMobile={isMobile}
          onToggleSub={toggleSub} onToggleMultiSelect={() => setMultiSelect((prev) => !prev)}
          onSelectElement={handleSelectElement} onSelectGrouping={handleSelectGrouping}
          onSubmitAnnotation={handleSubmitAnnotation} onAddGrouping={handleAddGrouping}
        />
      </div>

      <div className="mapsa-disclaimer mx-4 my-3">
        MAPSA separates visual evidence, candidate segmentation, grouping hypotheses, and interpretation.
        Overlays are interpretive aids, not substitutes for primary photographic evidence.
      </div>
    </div>
  );
}
