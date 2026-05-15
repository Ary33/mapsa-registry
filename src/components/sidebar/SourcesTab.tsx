"use client";

import type { Source } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

interface SourcesTabProps {
  sources: Source[];
}

export default function SourcesTab({ sources }: SourcesTabProps) {
  return (
    <div>
      <h3 className="mapsa-section-title">Sources &amp; Bibliography</h3>
      <div className="flex flex-col gap-2.5">
        {sources.map((src) => (
          <div key={src.id} className="mapsa-card">
            <p className="font-semibold text-sm mb-1">
              {src.author} ({src.year})
            </p>
            <p className="text-sm italic mb-1">{src.title}</p>
            <p className="text-xs text-mapsa-muted">
              {src.publication}
              {src.pages ? `, ${src.pages}` : ""}
            </p>
            {src.doi && (
              <p className="text-[11px] text-mapsa-gold mt-1">
                DOI: {src.doi}
              </p>
            )}
            {src.url && (
              <p className="text-[11px] text-mapsa-gold mt-0.5">
                {src.url}
              </p>
            )}
            {src.notes && (
              <p className="text-xs text-mapsa-muted mt-1.5">
                {src.notes}
              </p>
            )}
            <div className="mt-1.5">
              <button
                className="mapsa-btn text-2xs py-0.5 px-2"
                onClick={() =>
                  copyToClipboard(
                    `${src.author}. "${src.title}." ${src.publication}, ${src.year}.${src.pages ? ` ${src.pages}.` : ""}`
                  )
                }
              >
                Copy Citation
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
