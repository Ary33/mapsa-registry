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

interface ElementBBox {
  id: string;
  left: number; top: number; width: number; height: number;
}

function computeBBox(
  img: HTMLImageElement, id: string,
  canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D
): ElementBBox | null {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let found = false;
  // Fine-grained sampling for accuracy
  const step = Math.max(1, Math.floor(canvas.width / 800));
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (data[(y * canvas.width + x) * 4 + 3] > 5) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if (!found) return null;
  const padX = canvas.width * 0.018;
  const padY = canvas.height * 0.018;
  return {
    id,
    left: Math.max(0, minX - padX) / canvas.width,
    top: Math.max(0, minY - padY) / canvas.height,
    width: Math.min(canvas.width, maxX - minX + padX * 2) / canvas.width,
    height: Math.min(canvas.height, maxY - minY + padY * 2) / canvas.height,
  };
}

function applyGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter =
      'drop-shadow(0 0 1px rgba(255,250,220,1)) ' +
      'drop-shadow(0 0 4px rgba(255,235,160,0.95)) ' +
      'drop-shadow(0 0 8px rgba(255,215,100,0.7)) ' +
      'drop-shadow(0 0 14px rgba(255,195,60,0.4))';
  } else {
    const a1 = (0.6 + 0.4 * intensity).toFixed(2);
    const a2 = (0.4 + 0.5 * intensity).toFixed(2);
    const a3 = (0.2 + 0.4 * intensity).toFixed(2);
    el.style.filter =
      `drop-shadow(0 0 1px rgba(255,250,220,${a1})) ` +
      `drop-shadow(0 0 4px rgba(255,235,160,${a2})) ` +
      `drop-shadow(0 0 8px rgba(255,215,100,${a3}))`;
  }
}

function applyInferredGlow(el: HTMLElement, intensity: number, isLocked: boolean) {
  if (isLocked) {
    el.style.filter =
      'drop-shadow(0 0 1px rgba(140,255,180,1)) ' +
      'drop-shadow(0 0 4px rgba(110,240,155,0.95)) ' +
      'drop-shadow(0 0 8px rgba(80,220,130,0.7)) ' +
      'drop-shadow(0 0 14px rgba(60,200,110,0.4))';
  } else {
    const a1 = (0.6 + 0.4 * intensity).toFixed(2);
    const a2 = (0.4 + 0.5 * intensity).toFixed(2);
    const a3 = (0.2 + 0.4 * intensity).toFixed(2);
    el.style.filter =
      `drop-shadow(0 0 1px rgba(140,255,180,${a1})) ` +
      `drop-shadow(0 0 4px rgba(110,240,155,${a2})) ` +
      `drop-shadow(0 0 8px rgba(80,220,130,${a3}))`;
  }
}

function clearGlow(el: HTMLElement) { el.style.filter = ''; }

const HIGH_Z_LABELS = ['E22'];

export default function RecordViewer({ record }: RecordViewerProps) {
  const { profile } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Direct DOM refs for overlays
  const ovRefsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const infRefsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);
  const lockedRef = useRef<string[]>([]);
  // Track which sub-layers are hidden per element (for relief/inferred deselection)
  const hiddenSubsRef = useRef<Set<string>>(new Set()); // "E27-relief" or "E27-inferred"

  // Independent layer toggles
  const [bgOn, setBgOn] = useState(false);
  const [glyphsOn, setGlyphsOn] = useState(false);
  const [inferredOn, setInferredOn] = useState(false);

  const [lockedEls, _setLockedEls] = useState<string[]>([]);
  const [hoveredEl, _setHoveredEl] = useState<string | null>(null);
  const [hiddenSubs, setHiddenSubs] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(record.annotations);
  const [localGroupings, setLocalGroupings] = useState<GroupingHypothesis[]>(record.groupings);
  const [bboxes, setBboxes] = useState<ElementBBox[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imgLayout, setImgLayout] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStart = useRef<number | null>(null);

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

  // Toggle sub-layer visibility for split elements
  function toggleSub(key: string) {
    setHiddenSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      hiddenSubsRef.current = next;
      syncOverlays();
      return next;
    });
  }

  // ── Core overlay visibility logic ──
  function syncOverlays() {
    const hovered = hoveredRef.current;
    const locked = lockedRef.current;
    const hidden = hiddenSubsRef.current;

    // Which elements are "active" (hovered or locked)
    const activeIds = new Set(locked);
    if (hovered) activeIds.add(hovered);

    // Relief overlays
    ovRefsMap.current.forEach((img, id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const subKey = `${label}-relief`;
      const isSubHidden = hidden.has(subKey);

      // Visible if: glyphsOn (show all) OR element is active
      const shouldShow = !isSubHidden && (glyphsOn || activeIds.has(id));
      // Glow if: element is active (not just because glyphsOn)
      const shouldGlow = activeIds.has(id) && !isSubHidden;

      if (shouldShow) {
        img.style.display = 'block';
        img.style.opacity = '1';
        if (!shouldGlow) clearGlow(img); // visible but no glow
      } else {
        img.style.display = 'none';
        img.style.opacity = '0';
        clearGlow(img);
      }
    });

    // Inferred overlays
    infRefsMap.current.forEach((img, id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const subKey = `${label}-inferred`;
      const isSubHidden = hidden.has(subKey);

      const shouldShow = !isSubHidden && (inferredOn || activeIds.has(id));
      const shouldGlow = (activeIds.has(id) || inferredOn) && !isSubHidden;

      if (shouldShow) {
        img.style.display = 'block';
        img.style.opacity = '1';
        if (!shouldGlow) clearGlow(img);
      } else {
        img.style.display = 'none';
        img.style.opacity = '0';
        clearGlow(img);
      }
    });

    // Animation
    const needsAnim = activeIds.size > 0 || inferredOn;
    if (needsAnim) startAnim(); else stopAnim();
  }

  // Re-sync when toggles change
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

    // Glow active relief overlays
    activeIds.forEach((id) => {
      const el = record.elements.find((e) => e.id === id);
      const label = el?.label || '';
      const ov = ovRefsMap.current.get(id);
      if (ov && ov.style.display !== 'none' && !hidden.has(`${label}-relief`)) {
        applyGlow(ov, intensity, isLocked);
      }
      const inf = infRefsMap.current.get(id);
      if (inf && inf.style.display !== 'none' && !hidden.has(`${label}-inferred`)) {
        applyInferredGlow(inf, intensity, isLocked);
      }
    });

    // Glow all inferred when inferredOn
    if (inferredOn) {
      infRefsMap.current.forEach((img, id) => {
        const el = record.elements.find((e) => e.id === id);
        const label = el?.label || '';
        if (img.style.display !== 'none' && !hidden.has(`${label}-inferred`) && !activeIds.has(id)) {
          applyInferredGlow(img, intensity, true);
        }
      });
    }

    if (activeIds.size > 0 || inferredOn) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      animRef.current = null;
    }
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

  // Preload + bbox
  useEffect(() => {
    const allOverlayEls = record.elements.filter((el) => el.overlay_path || el.inferred_overlay_path);
    // Compute bboxes from relief overlays (or inferred if no relief)
    const bboxEls = record.elements.filter((el) => el.overlay_path);
    if (bboxEls.length === 0) { setImagesLoaded(true); return; }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const boxes: ElementBBox[] = [];
    let loaded = 0;

    // Also try inferred for elements whose relief bbox fails
    const fallbackNeeded = new Set<string>();

    bboxEls.forEach((el) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const box = computeBBox(img, el.id, canvas, ctx);
        if (box) boxes.push(box);
        else {
          console.warn(`bbox failed for ${el.label} (relief) — will try inferred`);
          fallbackNeeded.add(el.id);
        }
        loaded++;
        if (loaded === bboxEls.length) finalize();
      };
      img.onerror = () => {
        console.warn(`Load failed for ${el.label}: ${el.overlay_path}`);
        fallbackNeeded.add(el.id);
        loaded++;
        if (loaded === bboxEls.length) finalize();
      };
      img.src = overlayUrl(el.overlay_path) || '';
    });

    function finalize() {
      // Try inferred overlays for any that failed
      const fallbackEls = record.elements.filter((el) => fallbackNeeded.has(el.id) && el.inferred_overlay_path);
      if (fallbackEls.length === 0) { setBboxes(boxes); setImagesLoaded(true); return; }
      let fbLoaded = 0;
      fallbackEls.forEach((el) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const box = computeBBox(img, el.id, canvas, ctx);
          if (box) { boxes.push(box); console.log(`bbox recovered for ${el.label} via inferred`); }
          else console.warn(`bbox STILL failed for ${el.label}`);
          fbLoaded++;
          if (fbLoaded === fallbackEls.length) { setBboxes(boxes); setImagesLoaded(true); }
        };
        img.onerror = () => { fbLoaded++; if (fbLoaded === fallbackEls.length) { setBboxes(boxes); setImagesLoaded(true); } };
        img.src = overlayUrl(el.inferred_overlay_path) || '';
      });
    }

    return () => { stopAnim(); };
  }, [record.elements]);

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
  }, [syncLayout, imagesLoaded]);

  function handleZoom(delta: number) { setZoom((prev) => Math.max(1, Math.min(6, prev + delta))); }
  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function handleWheel(e: React.WheelEvent) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.3 : 0.3); } }
  function handleMouseDown(e: React.MouseEvent) { if (zoom > 1 && e.button === 0) { setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }; } }
  function handleMouseMoveContainer(e: React.MouseEvent) { if (isPanning) setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) }); }
  function handleMouseUp() { setIsPanning(false); }
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; pinchStart.current = Math.hypot(dx, dy); }
    else if (e.touches.length === 1 && zoom > 1) { setIsPanning(true); panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y }; }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current !== null) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; const dist = Math.hypot(dx, dy); setZoom((prev) => Math.max(1, Math.min(6, prev * (dist / pinchStart.current!)))); pinchStart.current = dist; }
    else if (e.touches.length === 1 && isPanning) setPan({ x: panStart.current.panX + (e.touches[0].clientX - panStart.current.x), y: panStart.current.panY + (e.touches[0].clientY - panStart.current.y) });
  }
  function handleTouchEnd() { pinchStart.current = null; setIsPanning(false); }

  const visibleEls = hoveredEl && !lockedEls.includes(hoveredEl) ? [...lockedEls, hoveredEl] : lockedEls;
  const selectedElementData = record.elements.filter((el) => visibleEls.includes(el.id));
  const matchingGroupings = localGroupings.filter(
    (g) => lockedEls.length > 0 && lockedEls.every((id) => g.element_ids.includes(id))
  );

  function handleClickElement(id: string) {
    if (multiSelect) {
      setLockedEls((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    } else {
      // Single click: toggle — click to select, click again to deselect
      setLockedEls((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [id]);
    }
    // Clear sub-layer hiding when selecting new element
    setHiddenSubs(new Set());
    hiddenSubsRef.current = new Set();
  }

  function handleSelectGrouping(g: GroupingHypothesis) { setLockedEls(g.element_ids); setMultiSelect(false); }
  function handleSelectElement(el: CandidateElement) { setLockedEls([el.id]); setMultiSelect(false); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setLockedEls([]); setMultiSelect(false); resetZoom(); setHiddenSubs(new Set()); hiddenSubsRef.current = new Set(); }
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

  const handleAddGrouping = useCallback((g: GroupingHypothesis) => {
    setLocalGroupings((prev) => [...prev, g]);
  }, []);

  const backgroundUrl = photoUrl(record.background_path);
  const baseOverlayUrl = overlayUrl(record.base_overlay_path);

  const sortedBboxes = [...bboxes].sort((a, b) => {
    const aLabel = record.elements.find((e) => e.id === a.id)?.label || '';
    const bLabel = record.elements.find((e) => e.id === b.id)?.label || '';
    if (HIGH_Z_LABELS.includes(aLabel) && !HIGH_Z_LABELS.includes(bLabel)) return 1;
    if (!HIGH_Z_LABELS.includes(aLabel) && HIGH_Z_LABELS.includes(bLabel)) return -1;
    return 0;
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
          {/* Independent toggle buttons */}
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
              <button onMouseDown={(e) => { e.preventDefault(); handleZoom(-0.5); }} className="mapsa-btn text-2xs px-2">−</button>
              <span className="mapsa-mono text-[0.56rem] w-[3em] text-center">{Math.round(zoom * 100)}%</span>
              <button onMouseDown={(e) => { e.preventDefault(); handleZoom(0.5); }} className="mapsa-btn text-2xs px-2">+</button>
              {zoom > 1 && <button onMouseDown={(e) => { e.preventDefault(); resetZoom(); }} className="mapsa-btn text-2xs px-2">⟲</button>}
            </div>
          </div>

          <div className="flex-1 min-h-0 px-4 pb-2">
            <div
              className="relative h-full overflow-hidden rounded-md border border-mapsa-border"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMoveContainer}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); if (!isMobile && lockedEls.length === 0) setHoveredEl(null); }}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            >
              <div ref={wrapRef} className="relative h-full" style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'top left',
                transition: isPanning ? 'none' : 'transform 0.2s ease',
              }}>
                {/* Base photo — always rendered */}
                {backgroundUrl && (
                  <img ref={imgRef} src={backgroundUrl} alt="Base photograph"
                    className="block h-full w-auto max-w-full object-contain select-none"
                    style={{ objectPosition: 'top left', boxShadow: '0 6px 28px rgba(0,0,0,.55)' }}
                    onLoad={() => setTimeout(syncLayout, 50)} draggable={false} />
                )}

                {/* Background overlay (line drawing with cutout) — on top of photo */}
                {bgOn && baseOverlayUrl && (
                  <img src={baseOverlayUrl} alt="Background overlay"
                    style={{
                      position: 'absolute',
                      left: imgLayout.left, top: imgLayout.top,
                      width: imgLayout.width, height: imgLayout.height,
                      objectFit: 'contain', objectPosition: 'top left',
                      pointerEvents: 'none', zIndex: 3,
                    }} draggable={false} />
                )}

                {/* Relief overlays */}
                {record.elements.map((el) => {
                  const url = overlayUrl(el.overlay_path);
                  if (!url) return null;
                  const isHighZ = HIGH_Z_LABELS.includes(el.label);
                  return (
                    <img key={`ov-${el.id}`}
                      ref={(node) => { if (node) ovRefsMap.current.set(el.id, node); }}
                      src={url} alt={el.label}
                      style={{
                        position: 'absolute',
                        left: imgLayout.left, top: imgLayout.top,
                        width: imgLayout.width, height: imgLayout.height,
                        objectFit: 'contain', objectPosition: 'top left',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: isHighZ ? 7 : 5,
                        opacity: 0, display: 'none',
                      }} draggable={false} />
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
                      style={{
                        position: 'absolute',
                        left: imgLayout.left, top: imgLayout.top,
                        width: imgLayout.width, height: imgLayout.height,
                        objectFit: 'contain', objectPosition: 'top left',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: 6, opacity: 0, display: 'none',
                      }} draggable={false} />
                  );
                })}

                {/* Hotspot zones — always active for hover/click */}
                {imagesLoaded && sortedBboxes.map((box) => {
                  const el = record.elements.find((e) => e.id === box.id);
                  const isHighZ = el && HIGH_Z_LABELS.includes(el.label);
                  return (
                    <div key={`hs-${box.id}`} style={{
                      position: 'absolute',
                      left: imgLayout.left + box.left * imgLayout.width,
                      top: imgLayout.top + box.top * imgLayout.height,
                      width: box.width * imgLayout.width,
                      height: box.height * imgLayout.height,
                      cursor: 'pointer', zIndex: isHighZ ? 22 : 20,
                      background: 'transparent', minWidth: 44, minHeight: 44,
                    }}
                      onMouseEnter={() => { if (isMobile || lockedEls.length > 0) return; setHoveredEl(box.id); }}
                      onMouseLeave={() => { if (isMobile || lockedEls.length > 0) return; setHoveredEl(null); }}
                      onClick={(e) => { e.stopPropagation(); handleClickElement(box.id); }}
                      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleClickElement(box.id); }}
                    />
                  );
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
                          textShadow: isLocked ? '0 0 8px rgba(200,169,110,0.5)' : 'none',
                        }}>
                          {el.label}
                          {el.inferred_overlay_path && <span style={{ color: '#66ff96', marginLeft: 4 }}>+inf</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {multiSelect && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="font-mono text-[0.56rem] text-mapsa-gold bg-black/70 px-2.5 py-1 rounded border border-mapsa-gold/40">
                    {isMobile ? 'GROUP SELECT · Tap elements' : 'GROUP SELECT · Click elements · Press M to exit'}</span>
                </div>
              )}

              {!lockedEls.length && !hoveredEl && record.elements.length > 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="font-cinzel text-[0.5rem] text-mapsa-muted/50 tracking-[0.2em] uppercase bg-black/30 px-3 py-1.5 rounded">
                    {isMobile ? 'Tap a glyph to select' : 'Hover to preview · Click to lock · Ctrl+Scroll to zoom'}</span>
                </div>
              )}
            </div>
          </div>

          {isMobile && record.elements.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-t border-mapsa-border bg-mapsa-panel-alt">
              <button onMouseDown={(e) => { e.preventDefault(); setMultiSelect((p) => !p); }}
                className={`mapsa-btn text-2xs ${multiSelect ? 'mapsa-btn-active' : ''}`}>
                {multiSelect ? '✓ Grouping' : 'Group Select'}</button>
              {lockedEls.length > 0 && (
                <button onMouseDown={(e) => { e.preventDefault(); setLockedEls([]); setMultiSelect(false); }} className="mapsa-btn text-2xs">
                  Clear ({lockedEls.length})</button>
              )}
            </div>
          )}

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
          record={record}
          annotations={localAnnotations}
          selectedElements={selectedElementData}
          lockedEls={lockedEls}
          matchingGroupings={matchingGroupings}
          multiSelect={multiSelect}
          hiddenSubs={hiddenSubs}
          onToggleSub={toggleSub}
          onToggleMultiSelect={() => setMultiSelect((prev) => !prev)}
          onSelectElement={handleSelectElement}
          onSelectGrouping={handleSelectGrouping}
          onSubmitAnnotation={handleSubmitAnnotation}
          onAddGrouping={handleAddGrouping}
        />
      </div>

      <div className="mapsa-disclaimer mx-4 my-3">
        MAPSA separates visual evidence, candidate segmentation, grouping hypotheses, and interpretation.
        Overlays are interpretive aids, not substitutes for primary photographic evidence.
      </div>
    </div>
  );
}
