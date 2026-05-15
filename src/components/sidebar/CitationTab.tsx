"use client";

import type { InscriptionRecord } from "@/lib/types";
import {
  generateChicago,
  generateAPA,
  generateBibTeX,
  copyToClipboard,
} from "@/lib/utils";

interface CitationTabProps {
  record: InscriptionRecord;
  selected: any | null;
}

export default function CitationTab({ record, selected }: CitationTabProps) {
  const label =
    !selected || selected.id === record.id
      ? `Record ${record.id}`
      : selected.label || selected.id || selected.title || "Selection";

  const chicago = generateChicago(record, selected);
  const apa = generateAPA(record, selected);
  const bibtex = generateBibTeX(record, selected);

  const formats: [string, string, boolean][] = [
    ["Chicago", chicago, false],
    ["APA", apa, false],
    ["BibTeX", bibtex, true],
  ];

  return (
    <div>
      <h3 className="mapsa-section-title">Cite: {label}</h3>
      {formats.map(([fmt, text, isMono]) => (
        <div key={fmt} className="mb-3.5">
          <div className="mapsa-label mb-1">{fmt}</div>
          <div
            className={`bg-mapsa-panel-alt border border-mapsa-border rounded p-2.5 text-xs leading-relaxed whitespace-pre-wrap ${isMono ? "font-mono" : "font-garamond"}`}
          >
            {text}
          </div>
          <button
            className="mapsa-btn text-2xs mt-1"
            onClick={() => copyToClipboard(text)}
          >
            Copy {fmt}
          </button>
        </div>
      ))}
    </div>
  );
}
