"use client";

import { useState } from "react";
import type { Annotation } from "@/lib/types";
import {
  CONFIDENCE_ICON,
  ANNOTATION_TYPES,
  CONFIDENCE_LEVELS,
  copyToClipboard,
} from "@/lib/utils";

interface AnnotationsTabProps {
  annotations: Annotation[];
  onSubmit: (form: AnnotationFormData) => void;
}

export interface AnnotationFormData {
  targetType: string;
  targetId: string;
  type: string;
  body: string;
  boundaryCorrection: string;
  sourcesCited: string;
  confidence: string;
  name: string;
  affiliation: string;
  orcid: string;
  visibility: string;
}

const EMPTY_FORM: AnnotationFormData = {
  targetType: "record",
  targetId: "",
  type: "interpretive note",
  body: "",
  boundaryCorrection: "",
  sourcesCited: "",
  confidence: "cautious",
  name: "",
  affiliation: "",
  orcid: "",
  visibility: "public attributed",
};

export default function AnnotationsTab({
  annotations,
  onSubmit,
}: AnnotationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnotationFormData>(EMPTY_FORM);

  const set =
    (key: keyof AnnotationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const handleSubmit = () => {
    if (!form.body.trim() || !form.name.trim()) return;
    onSubmit(form);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="mapsa-section-title !mb-0">Annotations</h3>
        <button
          className="mapsa-btn-gold"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Submit Annotation"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-mapsa-panel-alt border border-mapsa-border rounded-md p-4 mb-4">
          <h4 className="mapsa-section-title text-[0.69rem] !mb-2">
            New Annotation
          </h4>
          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            <div>
              <label className="mapsa-label">Target</label>
              <select
                className="mapsa-input"
                value={form.targetType}
                onChange={set("targetType")}
              >
                <option value="record">Whole Record</option>
                <option value="element">Element</option>
                <option value="grouping">Grouping</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div>
              <label className="mapsa-label">Target ID</label>
              <input
                className="mapsa-input"
                placeholder="e.g. E01, G02"
                value={form.targetId}
                onChange={set("targetId")}
              />
            </div>
            <div>
              <label className="mapsa-label">Type</label>
              <select
                className="mapsa-input"
                value={form.type}
                onChange={set("type")}
              >
                {ANNOTATION_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mapsa-label">Confidence</label>
              <select
                className="mapsa-input"
                value={form.confidence}
                onChange={set("confidence")}
              >
                {CONFIDENCE_LEVELS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-2.5">
            <label className="mapsa-label">Annotation</label>
            <textarea
              className="mapsa-input min-h-[80px] resize-y"
              value={form.body}
              onChange={set("body")}
              placeholder="Your scholarly annotation..."
            />
          </div>
          <div className="mb-2.5">
            <label className="mapsa-label">
              Suggested Boundary Correction
            </label>
            <textarea
              className="mapsa-input min-h-[50px] resize-y"
              value={form.boundaryCorrection}
              onChange={set("boundaryCorrection")}
              placeholder="Example: E02 should not be boxed separately. The three-dot group may belong visually with E03."
            />
          </div>
          <div className="mb-2.5">
            <label className="mapsa-label">Sources / Citation</label>
            <input
              className="mapsa-input"
              value={form.sourcesCited}
              onChange={set("sourcesCited")}
              placeholder="Source IDs, comma separated"
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            <div>
              <label className="mapsa-label">Name</label>
              <input
                className="mapsa-input"
                value={form.name}
                onChange={set("name")}
              />
            </div>
            <div>
              <label className="mapsa-label">Affiliation</label>
              <input
                className="mapsa-input"
                value={form.affiliation}
                onChange={set("affiliation")}
              />
            </div>
            <div>
              <label className="mapsa-label">ORCID</label>
              <input
                className="mapsa-input"
                value={form.orcid}
                onChange={set("orcid")}
                placeholder="0000-0000-0000-0000"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="mapsa-label">Visibility</label>
            <select
              className="mapsa-input"
              value={form.visibility}
              onChange={set("visibility")}
            >
              <option value="public attributed">Public Attributed</option>
              <option value="private advisory">Private Advisory</option>
              <option value="anonymous public">Anonymous Public</option>
            </select>
          </div>
          <button className="mapsa-btn-gold" onClick={handleSubmit}>
            Submit Annotation
          </button>
        </div>
      )}

      {/* Annotation cards */}
      <div className="flex flex-col gap-2.5">
        {annotations.map((a) => (
          <div key={a.id} className="mapsa-card">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-sm">
                {a.contributorName}
              </span>
              <span className="mapsa-badge text-2xs">{a.type}</span>
            </div>
            <p className="text-[0.69rem] text-mapsa-muted mb-1.5">
              {a.affiliation && `${a.affiliation} · `}
              {a.orcid && `ORCID: ${a.orcid} · `}
              {CONFIDENCE_ICON[a.confidence]} {a.confidence} ·{" "}
              {a.dateSubmitted} · v{a.version}
            </p>
            <p className="text-sm leading-relaxed mb-2">{a.body}</p>
            {a.sourcesCited.length > 0 && (
              <p className="text-[0.69rem] text-mapsa-muted">
                Sources cited: {a.sourcesCited.join(", ")}
              </p>
            )}
            <div className="flex justify-between items-center mt-1.5">
              <span className="mapsa-label text-2xs">
                {a.visibility} · {a.status}
              </span>
              <button
                className="mapsa-btn text-2xs py-0.5 px-2"
                onClick={() => copyToClipboard(a.citationText)}
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
