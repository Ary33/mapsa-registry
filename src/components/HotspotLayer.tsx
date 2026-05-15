"use client";

import type { CandidateElement, GroupingHypothesis } from "@/lib/types";
import { getGroupColor } from "@/lib/utils";

interface HotspotLayerProps {
  elements: CandidateElement[];
  groupings: GroupingHypothesis[];
  activeOverlays: string[];
  selectedId: string | null;
  onSelectElement: (el: CandidateElement) => void;
}

export default function HotspotLayer({
  elements,
  groupings,
  activeOverlays,
  selectedId,
  onSelectElement,
}: HotspotLayerProps) {
  const activeGrouping = activeOverlays.find((o) => o.startsWith("G"));
  const highlightedEls = activeGrouping
    ? groupings.find((g) => g.id === activeGrouping)?.elementIds || []
    : [];

  const showElements = activeOverlays.includes("elements");
  const showGroupingOverlay = !!activeGrouping;

  if (!showElements && !showGroupingOverlay) return null;

  const elsToShow = showGroupingOverlay
    ? elements.filter((e) => highlightedEls.includes(e.id))
    : showElements
      ? elements
      : [];

  const color = activeGrouping
    ? getGroupColor(activeGrouping)
    : "var(--mapsa-gold)";

  return (
    <div className="absolute inset-0 pointer-events-none">
      {elsToShow.map((el) => {
        const isActive =
          selectedId === el.id || highlightedEls.includes(el.id);
        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(el);
            }}
            className={`absolute rounded-sm cursor-pointer pointer-events-auto transition-all duration-300 ${isActive ? "hotspot-active" : ""}`}
            style={{
              left: `${el.boundingBox.x}%`,
              top: `${el.boundingBox.y}%`,
              width: `${el.boundingBox.width}%`,
              height: `${el.boundingBox.height}%`,
              border: `2px solid ${isActive ? color : `${color}55`}`,
              background: isActive ? `${color}18` : "transparent",
            }}
          >
            <span
              className="absolute -top-[18px] left-0.5 font-mono text-[0.625rem] tracking-wider font-semibold"
              style={{ color: isActive ? color : `${color}99` }}
            >
              {el.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
