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

interface RecordViewerProps {
  record: InscriptionRecord;
}

function applyGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter =
      'drop-shadow(0 0 1px rgba(255,250,220,1)) ' +
      'drop-shadow(0 0 2px rgba(255,235,160,0.9)) ' +
      'drop-shadow(0 0 4px rgba(255,215,100,0.5))';
  } else {
    const a1 = (0.6 + 0.4 * intensity).toFixed(2);
    const a2 = (0.35 + 0.45 * intensity).toFixed(2);
    el.style.filter =
      `drop-shadow(0 0 1px rgba(255,250,220,${a1})) ` +
      `drop-shadow(0 0 2px rgba(255,235,160,${a2}))`;
  }
}

function applyInferredGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter =
      'drop-shadow(0 0 1px rgba(140,255,180,1)) ' +
      'drop-shadow(0 0 2px rgba(110,240,155,0.9)) ' +
      'drop-shadow(0 0 4px rgba(80,220,130,0.5))';
  } else {
    const a1 = (0.6 + 0.4 * intensity).toFixed(2);
    const a2 = (0.35 + 0.45 * intensity).toFixed(2);
    el.style.filter =
      `drop-shadow(0 0 1px rgba(140,255,180,${a1})) ` +
      `drop-shadow(0 0 2px rgba(110,240,155,${a2}))`;
  }
}

function clearGlow(el: HTMLElement) { el.style.filter = ''; }

const HIGH_Z_LABELS = ['E22'];

function hitTestZones(elements: CandidateElement[], nx: number, ny: number): string | null {
  // HIGH_Z first
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
  const wrapRef = useRef<HTMLDivElement>(null);
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
  const [glyphsOn, setGlyphsOn] = useState(false);
  const [inferredOn, setInferredOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [lockedEls, _setLockedEls] = useState<string[]>([]);
  const [hoveredEl, _setHoveredEl] = useState<string | null>(null);
  const [hiddenSubs, setHiddenSubs] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(record.annotations);
  const [localGroupings, setLocalGroupings] = useState<GroupingHypothesis[]>(record.groupings);
  const [imgLayout, setImgLayout] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const pinchBaseZoom = useRef(1);
  const pinchBaseDist = useRef(0);
  const touchCount = useRef(0);
  const touchMoved = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

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

  // ── Fullscreen ──
  const viewerRef = useRef<HTMLDivElement>(null);

  function toggleFullscreen() {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  useEffect(() => {
    function onFsChange() {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      // Re-sync layout after fullscreen transition
      setTimeout(syncLayout, 100);
      setTimeout(syncLayout, 300);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [syncLayout]);

  function syncOverlays() {
    const hovered = hoveredRef.current;
    const locked = lockedRef.current;
    const hidden = hiddenSubsRef.current;
    const activeIds = new Set(locked);
    if (hovered) activeIds.add(hovered);

    ovRefsMap.current.forEach((img, id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const isSubHidden = hidden.has(`${label}-relief`);
      const shouldShow = !isSubHidden && (glyphsOn || activeIds.has(id));
      const shouldGlow = activeIds.has(id) && !isSubHidden;
      if (shouldShow) { img.style.display = 'block'; img.style.opacity = '1'; if (!shouldGlow) clearGlow(img); }
      else { img.style.display = 'none'; img.style.opacity = '0'; clearGlow(img); }
    });

    infRefsMap.current.forEach((img, id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const isSubHidden = hidden.has(`${label}-inferred`);
      const shouldShow = !isSubHidden && (inferredOn || glyphsOn || activeIds.has(id));
      const shouldGlow = (activeIds.has(id) || inferredOn) && !isSubHidden;
      if (shouldShow) { img.style.display = 'block'; img.style.opacity = '1'; if (!shouldGlow) clearGlow(img); }
      else { img.style.display = 'none'; img.style.opacity = '0'; clearGlow(img); }
    });

    if (activeIds.size > 0 || inferredOn) startAnim(); else stopAnim();
  }

  useEffect(() => { syncOverlays(); }, [glyphsOn, inferredOn, bgOn]);

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
      if (ov && ov.style.display !== 'none' && !hidden.has(`${label}-relief`)) applyGlow(ov, intensity, isLocked);
      const inf = infRefsMap.current.get(id);
      if (inf && inf.style.display !== 'none' && !hidden.has(`${label}-inferred`)) applyInferredGlow(inf, intensity, isLocked);
    });

    if (inferredOn) {
      infRefsMap.current.forEach((img, id) => {
        const el = record.elements.find((e) => e.id === id);
        const label = el?.label || '';
        if (img.style.display !== 'none' && !hidden.has(`${label}-inferred`) && !activeIds.has(id)) applyInferredGlow(img, intensity, true);
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
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { return () => { stopAnim(); }; }, []);

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
  }, [syncLayout]);

  function clampPan(px: number, py: number, z: number): { x: number; y: number } {
    if (!containerRef.current) return { x: px, y: py };
    const cr = containerRef.current.getBoundingClientRect();
    const maxPanX = Math.max(0, (imgLayout.width * z - cr.width) / 2);
    const maxPanY = Math.max(0, (imgLayout.height * z - cr.height) / 2);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    };
  }

  function handleZoom(delta: number) { setZoom((prev) => Math.max(1, Math.min(6, prev + delta))); }
  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function handleWheel(e: React.WheelEvent) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.3 : 0.3); } }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom > 1 && e.button === 0) { setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }; }
  }
  function handleMouseMoveContainer(e: React.MouseEvent) {
    if (isPanning) {
      const p = clampPan(panStart.current.panX + (e.clientX - panStart.current.x), panStart.current.panY + (e.clientY - panStart.current.y), zoom);
      setPan(p);
    }
  }
  function handleMouseUp() { setIsPanning(false); }

  // ── Mobile touch ──
  function handleTouchStart(e: React.TouchEvent) {
    touchCount.current = e.touches.length;
    touchMoved.current = false;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchBaseDist.current = Math.hypot(dx, dy);
      pinchBaseZoom.current = zoom;
    } else if (e.touches.length === 1) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (zoom > 1) {
        setIsPanning(true);
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchBaseDist.current > 0) {
      touchMoved.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setZoom(Math.max(1, Math.min(6, pinchBaseZoom.current * (Math.hypot(dx, dy) / pinchBaseDist.current))));
    } else if (e.touches.length === 1 && isPanning && zoom > 1) {
      const p = clampPan(panStart.current.panX + (e.touches[0].clientX - panStart.current.x), panStart.current.panY + (e.touches[0].clientY - panStart.current.y), zoom);
      setPan(p);
      // Only mark as moved if finger traveled more than 10px (otherwise it's a tap)
      const dx = e.touches[0].clientX - touchStartPos.current.x;
      const dy = e.touches[0].clientY - touchStartPos.current.y;
      if (Math.hypot(dx, dy) > 10) touchMoved.current = true;
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const wasPinch = touchCount.current >= 2;
    const wasMoved = touchMoved.current;

    if (e.touches.length === 0) {
      pinchBaseDist.current = 0;
      setIsPanning(false);
    }

    if (!wasPinch && !wasMoved && e.changedTouches.length === 1) {
      setHasInteracted(true);
      const touch = e.changedTouches[0];
      const hitId = getTouchHitElement(touch.clientX, touch.clientY);
      if (hitId) {
        handleClickElement(hitId);
      } else if (!multiSelect) {
        setLockedEls([]);
      }
    }

    touchCount.current = e.touches.length;
  }

  // ── Hit detection using the actual rendered image position ──
  function getTouchHitElement(clientX: number, clientY: number): string | null {
    if (!imgRef.current) return null;
    // Use the ACTUAL rendered bounding rect of the image (accounts for all transforms)
    const ir = imgRef.current.getBoundingClientRect();
    const nx = (clientX - ir.left) / ir.width;
    const ny = (clientY - ir.top) / ir.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    return hitTestZones(record.elements, nx, ny);
  }

  // Derived
  const visibleEls = hoveredEl && !lockedEls.includes(hoveredEl) ? [...lockedEls, hoveredEl] : lockedEls;
  const selectedElementData = record.elements.filter((el) => visibleEls.includes(el.id));
  const matchingGroupings = localGroupings.filter(
    (g) => lockedEls.length > 0 && lockedEls.every((id) => g.element_ids.includes(id))
  );

  function handleClickElement(id: string) {
    setHasInteracted(true);
    if (multiSelect) setLockedEls((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    else setLockedEls((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [id]);
    setHiddenSubs(new Set());
    hiddenSubsRef.current = new Set();
  }

  function handleSelectGrouping(g: GroupingHypothesis) { setLockedEls(g.element_ids); setMultiSelect(false); }
  function handleSelectElement(el: CandidateElement) { setLockedEls([el.id]); setMultiSelect(false); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isFullscreen) { document.exitFullscreen().catch(() => {}); return; }
        setLockedEls([]); setMultiSelect(false); resetZoom(); setHiddenSubs(new Set()); hiddenSubsRef.current = new Set();
      }
      if (e.key === 'm' || e.key === 'M') setMultiSelect((p) => !p);
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navElement(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navElement(-1); }
      if (e.key === '+' || e.key === '=') handleZoom(0.5);
      if (e.key === '-') handleZoom(-0.5);
      if (e.key === '0') resetZoom();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record.elements, lockedEls, hoveredEl, isFullscreen]);

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

  return (
    <div>
      <div className="flex gap-2 flex-wrap px-4 py-3 items-center border-b border-mapsa-border/40">
        {record.status.map((st) => (
          <StatusBadge key={st} text={st} variant={st === 'NEEDS EXPERT REVIEW' ? 'red' : 'default'} />
        ))}
        <span className="mapsa-mono text-[0.69rem] ml-auto">v{record.record_version}</span>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="flex-1 min-w-[320px] flex flex-col border-r border-mapsa-border overflow-hidden">
          {/* Controls */}
          <div className="flex gap-2 flex-wrap px-4 pt-3 pb-2 shrink-0 border-b border-mapsa-border/40 items-center">
            <span className="mapsa-label self-center mr-1">Layers</span>
            <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setBgOn((p) => !p); }}
              className={`mapsa-btn text-2xs ${bgOn ? 'mapsa-btn-active' : ''}`}>Background</button>
            <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setGlyphsOn((p) => !p); }}
              className={`mapsa-btn text-2xs ${glyphsOn ? 'mapsa-btn-active' : ''}`}>Glyph Shapes</button>
            <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setInferredOn((p) => !p); }}
              className={`mapsa-btn text-2xs ${inferredOn ? 'mapsa-btn-active' : ''}`}
              style={{ borderColor: inferredOn ? '#7ea8be' : undefined, background: inferredOn ? '#7ea8be' : undefined, color: inferredOn ? '#18140f' : undefined }}>
              Inferred</button>
            <div className="ml-auto flex items-center gap-1.5">
              {!isMobile && (
                <>
                  <button onMouseDown={(e) => { e.preventDefault(); handleZoom(-0.5); }} className="mapsa-btn text-2xs px-2">−</button>
                  <span className="mapsa-mono text-[0.56rem] w-[3em] text-center">{Math.round(zoom * 100)}%</span>
                  <button onMouseDown={(e) => { e.preventDefault(); handleZoom(0.5); }} className="mapsa-btn text-2xs px-2">+</button>
                  {zoom > 1 && <button onMouseDown={(e) => { e.preventDefault(); resetZoom(); }} className="mapsa-btn text-2xs px-2">⟲</button>}
                </>
              )}
              <button onMouseDown={(e) => { e.preventDefault(); toggleFullscreen(); }} className="mapsa-btn text-2xs px-2" title="Fullscreen (F)">⛶</button>
            </div>
          </div>

          {/* Image area */}
          <div ref={viewerRef} className={`flex-1 min-h-0 relative ${isFullscreen ? '' : 'px-4 pb-2'}`}
            style={isFullscreen ? { background: '#18140f', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-md border border-mapsa-border"
              style={{
                cursor: zoom > 1 ? 'grab' : 'default',
                touchAction: 'none',
                width: isFullscreen ? '100vw' : '100%',
                height: isFullscreen ? '100vh' : '100%',
              }}
              onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMoveContainer}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); if (!isMobile && lockedEls.length === 0) setHoveredEl(null); }}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            >
              <div ref={wrapRef} className="relative h-full" style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out',
              }}>
                {backgroundUrl && (
                  <img ref={imgRef} src={backgroundUrl} alt="Base photograph"
                    className="select-none"
                    style={{
                      display: 'block',
                      height: '100%',
                      width: 'auto',
                      maxWidth: isFullscreen ? 'none' : '100%',
                      objectFit: 'contain',
                      objectPosition: 'top left',
                      boxShadow: '0 6px 28px rgba(0,0,0,.55)',
                    }}
                    onLoad={() => setTimeout(syncLayout, 50)} draggable={false} />
                )}

                {bgOn && baseOverlayUrl && (
                  <img src={baseOverlayUrl} alt="Background overlay"
                    style={{
                      position: 'absolute', left: imgLayout.left, top: imgLayout.top,
                      width: imgLayout.width, height: imgLayout.height,
                      objectFit: 'contain', objectPosition: 'top left',
                      pointerEvents: 'none', zIndex: 3,
                    }} draggable={false} />
                )}

                {record.elements.map((el) => {
                  const url = overlayUrl(el.overlay_path);
                  if (!url) return null;
                  const isHighZ = HIGH_Z_LABELS.includes(el.label);
                  return (
                    <img key={`ov-${el.id}`}
                      ref={(node) => { if (node) ovRefsMap.current.set(el.id, node); }}
                      src={url} alt={el.label}
                      style={{
                        position: 'absolute', left: imgLayout.left, top: imgLayout.top,
                        width: imgLayout.width, height: imgLayout.height,
                        objectFit: 'contain', objectPosition: 'top left',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: isHighZ ? 7 : 5, opacity: 0, display: 'none',
                      }} draggable={false} />
                  );
                })}

                {inferredEls.map((el) => {
                  const url = overlayUrl(el.inferred_overlay_path);
                  if (!url) return null;
                  return (
                    <img key={`inf-${el.id}`}
                      ref={(node) => { if (node) infRefsMap.current.set(el.id, node); }}
                      src={url} alt={`${el.label} inferred`}
                      style={{
                        position: 'absolute', left: imgLayout.left, top: imgLayout.top,
                        width: imgLayout.width, height: imgLayout.height,
                        objectFit: 'contain', objectPosition: 'top left',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: 6, opacity: 0, display: 'none',
                      }} draggable={false} />
                  );
                })}

                {/* Desktop hotspots only */}
                {!isMobile && sortedElements.map((el) => {
                  const zones = el.bbox_zones || [];
                  if (zones.length === 0) return null;
                  const isHighZ = HIGH_Z_LABELS.includes(el.label);
                  return zones.map((zone, zi) => (
                    <div key={`hs-${el.id}-${zi}`} style={{
                      position: 'absolute',
                      left: imgLayout.left + zone.left * imgLayout.width,
                      top: imgLayout.top + zone.top * imgLayout.height,
                      width: zone.width * imgLayout.width,
                      height: zone.height * imgLayout.height,
                      cursor: 'pointer', zIndex: isHighZ ? 22 : 20,
                      background: 'transparent',
                    }}
                      onMouseEnter={() => { if (lockedEls.length > 0) return; setHoveredEl(el.id); }}
                      onMouseLeave={() => { if (lockedEls.length > 0) return; setHoveredEl(null); }}
                      onClick={(e) => { e.stopPropagation(); handleClickElement(el.id); }}
                    />
                  ));
                })}

                {/* Labels */}
                {(hoveredEl || lockedEls.length > 0) && (
                  <div style={{ position: 'absolute', top: imgLayout.top + 8, left: imgLayout.left + 8, zIndex: 30, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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

              {/* Fullscreen exit button */}
              {isFullscreen && (
                <div className="absolute top-2 right-2 z-50">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); document.exitFullscreen().catch(() => {}); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); document.exitFullscreen().catch(() => {}); }}
                    className="mapsa-btn text-2xs shadow-lg px-3"
                    style={{ background: 'rgba(31,26,20,0.9)' }}>
                    ESC</button>
                </div>
              )}

              {/* Floating controls — top (mobile) */}
              {isMobile && (
                <div className="absolute top-2 left-2 right-2 z-40 flex items-center gap-2">
                  <button
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setMultiSelect((p) => !p); }}
                    className="mapsa-btn text-2xs shadow-lg"
                    style={{ background: multiSelect ? '#c8a96e' : 'rgba(31,26,20,0.9)', color: multiSelect ? '#18140f' : '#e8dcc8' }}>
                    {multiSelect ? '✓ Group' : 'Group'}</button>
                  {lockedEls.length > 0 && (
                    <button
                      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setLockedEls([]); setMultiSelect(false); }}
                      className="mapsa-btn text-2xs shadow-lg"
                      style={{ background: 'rgba(31,26,20,0.9)' }}>
                      Clear ({lockedEls.length})</button>
                  )}
                  <div className="ml-auto flex gap-1.5">
                    {zoom > 1 && (
                      <button onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); resetZoom(); }}
                        className="mapsa-btn text-2xs shadow-lg" style={{ background: 'rgba(31,26,20,0.9)' }}>Reset</button>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-select badge */}
              {multiSelect && !isMobile && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="font-mono text-[0.56rem] text-mapsa-gold bg-black/70 px-2.5 py-1 rounded border border-mapsa-gold/40">
                    GROUP SELECT · Click elements · Press M to exit</span>
                </div>
              )}

              {/* Hint — hidden after first interaction */}
              {!hasInteracted && !lockedEls.length && !hoveredEl && record.elements.length > 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="font-cinzel text-[0.5rem] text-mapsa-muted/50 tracking-[0.2em] uppercase bg-black/30 px-3 py-1.5 rounded">
                    {isMobile ? 'Tap a glyph · Pinch to zoom' : 'Hover to preview · Click to lock · Ctrl+Scroll to zoom'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-2 shrink-0">
            <p className="text-[0.69rem] text-mapsa-muted leading-snug">{record.title}</p>
            <p className="text-[0.56rem] text-mapsa-muted">{record.photographer} · {record.date_photographed}</p>
          </div>

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
