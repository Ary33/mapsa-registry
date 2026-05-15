"use client";

import { useState } from "react";
import type { InscriptionRecord } from "@/lib/types";
import RecordCard from "./RecordCard";

interface RegistryDashboardProps {
  records: InscriptionRecord[];
}

export default function RegistryDashboard({
  records,
}: RegistryDashboardProps) {
  const [search, setSearch] = useState("");

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.structure.toLowerCase().includes(q) ||
      r.objectType.toLowerCase().includes(q) ||
      r.status.some((st) => st.toLowerCase().includes(q)) ||
      r.elements.some((el) => el.label.toLowerCase().includes(q)) ||
      r.groupings.some((g) => g.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="font-cinzel text-3xl text-mapsa-gold tracking-[4px] mb-2">
          MAPSA
        </h1>
        <p className="font-cinzel text-sm text-mapsa-muted tracking-[2px] mb-4">
          Monte Albán Inscription Registry
        </p>
        <p className="text-base leading-relaxed text-mapsa-muted max-w-[650px] mx-auto mb-6">
          MAPSA Monte Albán Inscription Registry is a living visual corpus
          for documenting, comparing, citing, and discussing carved
          inscription clusters from Monte Albán. The registry preserves
          uncertainty by separating photographic evidence, candidate
          elements, grouping hypotheses, researcher annotations, and cited
          interpretations.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <span className="mapsa-btn-gold">Explore Records</span>
          <span className="mapsa-btn-gold">Submit Annotation</span>
          <span className="mapsa-btn-gold">Request Field Photo</span>
        </div>
      </div>

      {/* Search */}
      <input
        className="mapsa-input mb-5 text-base"
        placeholder="Search by ID, structure, element, source, contributor, status…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Records list */}
      <div className="flex flex-col gap-3">
        {filtered.map((r) => (
          <RecordCard key={r.id} record={r} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-mapsa-muted py-12">
            No records match your search.
          </p>
        )}
      </div>
    </div>
  );
}
