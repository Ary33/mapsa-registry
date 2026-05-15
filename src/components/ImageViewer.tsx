"use client";

import type {
  ImageAsset,
  Overlay,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import PlaceholderImage from "./PlaceholderImage";
import HotspotLayer from "./HotspotLayer";

interface ImageViewerProps {
  images: ImageAsset[];
  overlays: Overlay[];
  elements: CandidateElement[];
  groupings: GroupingHypothesis[];
  activeImg: string;
  setActiveImg: (id: string) => void;
  activeOverlays: string[];
  toggleOverlay: (key: string) => void;
  selectedId: string | null;
  onSelectElement: (el: CandidateElement) => void;
}

export default function ImageViewer({
  images,
  overlays,
  elements,
  groupings,
  activeImg,
  setActiveImg,
  activeOverlays,
  toggleOverlay,
  selectedId,
  onSelectElement,
}: ImageViewerProps) {
  const activeImgData =
    images.find((i) => i.id === activeImg) || images[0];

  const overlayToggles = [
    { key: "photo_only", label: "Photo Only" },
    { key: "line_drawing", label: "Line Drawing" },
    { key: "elements", label: "Elements" },
    ...groupings.map((g) => ({ key: g.id, label: g.id })),
  ];

  return (
    <div className="flex-1 min-w-[320px] p-4">
      {/* Image tabs */}
      <div className="flex gap-0.5 flex-wrap pb-1">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setActiveImg(img.id)}
            className={`mapsa-tab py-1.5 px-2.5 text-2xs ${activeImg === img.id ? "mapsa-tab-active" : ""}`}
          >
            {img.label}
          </button>
        ))}
      </div>

      {/* Image + hotspots */}
      <div className="relative rounded-md overflow-hidden border border-mapsa-border mt-2">
        <PlaceholderImage label={activeImgData.label} />
        <HotspotLayer
          elements={elements}
          groupings={groupings}
          activeOverlays={activeOverlays}
          selectedId={selectedId}
          onSelectElement={onSelectElement}
        />
        {activeOverlays.includes("line_drawing") && (
          <span className="absolute top-2 right-2 mapsa-badge bg-black/70 text-2xs">
            LINE DRAWING OVERLAY
          </span>
        )}
      </div>

      {/* Overlay toggles */}
      <div className="flex gap-1 flex-wrap py-1.5">
        {overlayToggles.map((item) => {
          const active =
            item.key === "photo_only"
              ? activeOverlays.length === 0
              : activeOverlays.includes(item.key);
          return (
            <button
              key={item.key}
              onClick={() => toggleOverlay(item.key)}
              className={`mapsa-btn text-2xs py-0.5 px-2.5 ${active ? "mapsa-btn-active" : ""}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Caption */}
      <p className="text-[0.69rem] text-mapsa-muted mt-1">
        {activeImgData.caption}
      </p>
      <p className="text-[0.625rem] text-mapsa-muted">
        {activeImgData.photographer} · {activeImgData.date}
        {!activeImgData.isPrimaryEvidence && " · Interpretive aid"}
      </p>

      {/* Scholarly disclaimer */}
      <div className="mapsa-disclaimer">
        MAPSA separates visual evidence, candidate segmentation, grouping
        hypotheses, and interpretation. Line drawings and overlays are
        interpretive aids, not substitutes for primary photographic evidence.
        Readings are attributed to named contributors and sources.
      </div>
    </div>
  );
}
