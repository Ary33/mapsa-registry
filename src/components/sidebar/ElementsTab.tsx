"use client";

import type { CandidateElement } from "@/lib/types";
import { CONFIDENCE_ICON } from "@/lib/utils";

interface ElementsTabProps {
  elements: CandidateElement[];
  selectedId: string | null;
  onSelect: (el: CandidateElement) => void;
}

export default function ElementsTab({
  elements,
  selectedId,
  onSelect,
}: ElementsTabProps) {
  return (
    <div>
      <h3 className="mapsa-section-title">Candidate Elements</h3>
      <div className="flex flex-col gap-2">
        {elements.map((el) => {
          const isActive = selectedId === el.id;
          return (
            <div
              key={el.id}
              onClick={() => onSelect(el)}
              className={`mapsa-card ${isActive ? "!border-mapsa-gold bg-[var(--mapsa-gold)]/5" : ""}`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="mapsa-mono">{el.label}</span>
                <span className="mapsa-badge text-2xs">
                  {CONFIDENCE_ICON[el.confidence]} {el.confidence}
                </span>
              </div>
              <p className="text-[0.81rem] leading-relaxed mb-1.5">
                {el.neutralDescription}
              </p>
              <div className="mapsa-label text-2xs">
                {el.segmentationStatus}
              </div>
              {el.notes && (
                <p className="text-xs text-mapsa-muted mt-1">{el.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
