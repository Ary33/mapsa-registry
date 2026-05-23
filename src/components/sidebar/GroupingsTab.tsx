"use client";

import type { GroupingHypothesis, Source } from "@/lib/types";
import { CONFIDENCE_ICON, getGroupColor, copyToClipboard } from "@/lib/utils";

interface GroupingsTabProps {
  groupings: GroupingHypothesis[];
  selectedId: string | null;
  onSelect: (g: GroupingHypothesis) => void;
  sources: Source[];
}

export default function GroupingsTab({
  groupings,
  selectedId,
  onSelect,
  sources,
}: GroupingsTabProps) {
  return (
    <div>
      <h3 className="mapsa-section-title">Grouping Hypotheses</h3>
      <div className="flex flex-col gap-2.5">
        {groupings.map((g) => {
          const isActive = selectedId === g.id;
          const color = getGroupColor(g.id);
          return (
            <div
              key={g.id}
              onClick={() => onSelect(g)}
              className={`mapsa-card border-l-[3px] ${isActive ? "!border-l-[3px]" : ""}`}
              style={{
                borderLeftColor: color,
                borderColor: isActive ? color : undefined,
              }}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="mapsa-mono" style={{ color }}>
                  {g.id}: {g.title.replace(`${g.id}: `, "")}
                </span>
                <span className="mapsa-badge text-2xs">
                  {CONFIDENCE_ICON[g.confidence]} {g.confidence}
                </span>
              </div>
              <div className="mapsa-label mb-1.5">
                Elements: {g.element_ids?.join(" + ")} ·{" "}
                {g.proposed_relationship}
              </div>
              <p className="text-[0.81rem] leading-relaxed mb-1.5">
                {g.interpretation}
              </p>
              {g.interpretation_caution && (
                <p className="text-xs text-mapsa-muted italic">
                  ⚠ {g.interpretation_caution}
                </p>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-[0.69rem] text-mapsa-muted">
                  {g.contributor_name} · {g.status} · v{g.version}
                </span>
                <button
                  className="mapsa-btn text-2xs py-0.5 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(g.citation_text || "");
                  }}
                >
                  Copy Citation
                </button>
              </div>
              {g.source_ids && g.source_ids.length > 0 && (
                <p className="text-[0.69rem] text-mapsa-muted mt-1.5">
                  Sources:{" "}
                  {g.source_ids
                    .map(
                      (sid) =>
                        sources.find((s) => s.id === sid)?.author || sid
                    )
                    .join("; ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
