"use client";

import { useState } from "react";
import { PHOTO_REQUEST_TYPES } from "@/lib/utils";

interface PhotoRequestTabProps {
  recordId: string;
  onSubmit: () => void;
  submitted: boolean;
}

export default function PhotoRequestTab({
  recordId,
  onSubmit,
  submitted,
}: PhotoRequestTabProps) {
  const [form, setForm] = useState({
    requestTypes: [] as string[],
    message: "",
    name: "",
    email: "",
    affiliation: "",
    permissionToCredit: true,
  });

  const toggleType = (tp: string) =>
    setForm({
      ...form,
      requestTypes: form.requestTypes.includes(tp)
        ? form.requestTypes.filter((x) => x !== tp)
        : [...form.requestTypes, tp],
    });

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mapsa-section-title !text-mapsa-gold">
          ✓ Photo Request Saved
        </div>
        <p className="text-sm text-mapsa-muted">
          Photo request saved as pending. MAPSA will review this request.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mapsa-section-title">Request New Field Photo</h3>

      <div className="mapsa-label mb-2">Requested photo types</div>
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {PHOTO_REQUEST_TYPES.map((tp) => (
          <button
            key={tp}
            onClick={() => toggleType(tp)}
            className={`mapsa-btn text-2xs ${form.requestTypes.includes(tp) ? "mapsa-btn-active" : ""}`}
          >
            {tp}
          </button>
        ))}
      </div>

      <div className="mb-2.5">
        <label className="mapsa-label">Message</label>
        <textarea
          className="mapsa-input min-h-[80px] resize-y"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Describe the photo you need and why..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div>
          <label className="mapsa-label">Name</label>
          <input
            className="mapsa-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mapsa-label">Email</label>
          <input
            className="mapsa-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>

      <div className="mb-2.5">
        <label className="mapsa-label">Affiliation</label>
        <input
          className="mapsa-input"
          value={form.affiliation}
          onChange={(e) =>
            setForm({ ...form, affiliation: e.target.value })
          }
        />
      </div>

      <label className="flex items-center gap-2 mb-3.5 text-[13px] text-mapsa-muted cursor-pointer">
        <input
          type="checkbox"
          checked={form.permissionToCredit}
          onChange={(e) =>
            setForm({ ...form, permissionToCredit: e.target.checked })
          }
        />
        Permission to credit publicly
      </label>

      <button
        className="mapsa-btn-gold"
        onClick={() => {
          if (form.name && form.email && form.requestTypes.length) onSubmit();
        }}
      >
        Submit Photo Request
      </button>
    </div>
  );
}
