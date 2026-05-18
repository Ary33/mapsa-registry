"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Toolbar from "@/components/Toolbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";

type ImageType =
  | "full_object" | "inscription_zone" | "detail" | "left_angle"
  | "right_angle" | "raking_light" | "enhanced" | "drawing_overlay";

interface ImageRow {
  id?: string;
  record_id: string;
  type: ImageType;
  label: string;
  storage_path: string;
  caption: string;
  photographer: string;
  date_taken: string;
  is_primary_evidence: boolean;
  sort_order: number;
  // For display
  publicUrl?: string;
}

interface ElementRow {
  id?: string;
  record_id: string;
  label: string;
  neutral_description: string;
  segmentation_status: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  confidence: string;
  notes: string;
}

export default function RecordEditorPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <RecordEditor />
    </ProtectedRoute>
  );
}

function RecordEditor() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string | undefined;
  const isNew = recordId === "new";

  // Record fields
  const [id, setId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("Monte Albán");
  const [area, setArea] = useState("");
  const [structure, setStructure] = useState("");
  const [objectType, setObjectType] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [datePhotographed, setDatePhotographed] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [lightingNotes, setLightingNotes] = useState("");
  const [interpretationStatus, setInterpretationStatus] = useState("");
  const [segmentationStatus, setSegmentationStatus] = useState("");
  const [statusTags, setStatusTags] = useState<string[]>(["UNRESOLVED", "NEEDS EXPERT REVIEW"]);

  // Images
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);

  // Elements
  const [elements, setElements] = useState<ElementRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<"details" | "images" | "elements">("details");

  // Load existing record
  useEffect(() => {
    if (!isNew && recordId) {
      loadRecord(recordId);
    }
  }, [isNew, recordId]);

  async function loadRecord(rid: string) {
    setLoading(true);
    const { data: rec, error: recErr } = await supabase
      .from("records")
      .select("*")
      .eq("id", rid)
      .single();

    if (recErr || !rec) {
      setError(`Record not found: ${recErr?.message || "unknown error"}`);
      setLoading(false);
      return;
    }

    setId(rec.id);
    setFieldId(rec.field_id || "");
    setTitle(rec.title);
    setSite(rec.site);
    setArea(rec.area);
    setStructure(rec.structure);
    setObjectType(rec.object_type);
    setLocationDescription(rec.location_description || "");
    setDatePhotographed(rec.date_photographed || "");
    setPhotographer(rec.photographer || "");
    setDescription(rec.description || "");
    setCondition(rec.condition || "");
    setLightingNotes(rec.lighting_notes || "");
    setInterpretationStatus(rec.interpretation_status || "");
    setSegmentationStatus(rec.segmentation_status || "");
    setStatusTags(rec.status || []);

    // Load images
    const { data: imgs } = await supabase
      .from("images")
      .select("*")
      .eq("record_id", rid)
      .order("sort_order");

    if (imgs) {
      setImages(
        imgs.map((img: any) => ({
          ...img,
          publicUrl: supabase.storage
            .from("inscription-photos")
            .getPublicUrl(img.storage_path).data.publicUrl,
        }))
      );
    }

    // Load elements
    const { data: elems } = await supabase
      .from("elements")
      .select("*")
      .eq("record_id", rid)
      .order("label");

    if (elems) setElements(elems);

    setLoading(false);
  }

  async function saveRecord() {
    setSaving(true);
    setError("");
    setMessage("");

    if (!id.trim() || !title.trim() || !structure.trim()) {
      setError("Record ID, title, and structure are required.");
      setSaving(false);
      return;
    }

    const recordData = {
      id: id.trim(),
      field_id: fieldId.trim(),
      title: title.trim(),
      site,
      area: area.trim(),
      structure: structure.trim(),
      object_type: objectType.trim(),
      location_description: locationDescription.trim(),
      date_photographed: datePhotographed || null,
      photographer: photographer.trim(),
      description: description.trim(),
      condition: condition.trim(),
      lighting_notes: lightingNotes.trim(),
      interpretation_status: interpretationStatus.trim(),
      segmentation_status: segmentationStatus.trim(),
      status: statusTags,
      created_by: profile?.id,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { error: err } = await supabase.from("records").insert(recordData);
      if (err) {
        setError(`Error creating record: ${err.message}`);
        setSaving(false);
        return;
      }
      setMessage("Record created.");
      router.push(`/admin/records/${id.trim()}`);
    } else {
      const { id: _, ...updateData } = recordData;
      const { error: err } = await supabase
        .from("records")
        .update(updateData)
        .eq("id", recordId);
      if (err) {
        setError(`Error updating record: ${err.message}`);
        setSaving(false);
        return;
      }
      setMessage("Record saved.");
    }

    setSaving(false);
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !recordId || isNew) return;

    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop();
    const path = `${recordId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("inscription-photos")
      .upload(path, file);

    if (uploadErr) {
      setError(`Upload failed: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    const publicUrl = supabase.storage
      .from("inscription-photos")
      .getPublicUrl(path).data.publicUrl;

    const newImage: ImageRow = {
      record_id: recordId,
      type: "full_object",
      label: file.name.replace(/\.[^.]+$/, ""),
      storage_path: path,
      caption: "",
      photographer: photographer || "V. Diaz / MAHC",
      date_taken: datePhotographed || new Date().toISOString().split("T")[0],
      is_primary_evidence: true,
      sort_order: images.length,
      publicUrl,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("images")
      .insert({
        record_id: newImage.record_id,
        type: newImage.type,
        label: newImage.label,
        storage_path: newImage.storage_path,
        caption: newImage.caption,
        photographer: newImage.photographer,
        date_taken: newImage.date_taken,
        is_primary_evidence: newImage.is_primary_evidence,
        sort_order: newImage.sort_order,
        uploaded_by: profile?.id,
      })
      .select()
      .single();

    if (insertErr) {
      setError(`Image record failed: ${insertErr.message}`);
    } else if (inserted) {
      setImages((prev) => [...prev, { ...inserted, publicUrl }]);
      setMessage("Image uploaded.");
    }

    setUploading(false);
    e.target.value = "";
  }

  async function updateImage(imgId: string, updates: Partial<ImageRow>) {
    const { error: err } = await supabase
      .from("images")
      .update(updates)
      .eq("id", imgId);

    if (err) {
      setError(`Error updating image: ${err.message}`);
    } else {
      setImages((prev) =>
        prev.map((img) => (img.id === imgId ? { ...img, ...updates } : img))
      );
    }
  }

  async function deleteImage(imgId: string, storagePath: string) {
    if (!confirm("Delete this image?")) return;

    await supabase.storage.from("inscription-photos").remove([storagePath]);
    const { error: err } = await supabase.from("images").delete().eq("id", imgId);

    if (err) {
      setError(`Error: ${err.message}`);
    } else {
      setImages((prev) => prev.filter((img) => img.id !== imgId));
    }
  }

  async function saveElement(element: ElementRow, index: number) {
    setError("");
    if (!recordId || isNew) return;

    if (element.id) {
      const { id: _, record_id: __, ...updates } = element;
      const { error: err } = await supabase
        .from("elements")
        .update(updates)
        .eq("id", element.id);
      if (err) setError(`Error: ${err.message}`);
      else setMessage(`Element ${element.label} saved.`);
    } else {
      const { id: _, ...insertData } = element;
      const { data, error: err } = await supabase
        .from("elements")
        .insert({ ...insertData, created_by: profile?.id })
        .select()
        .single();
      if (err) setError(`Error: ${err.message}`);
      else if (data) {
        setElements((prev) => prev.map((el, i) => (i === index ? data : el)));
        setMessage(`Element ${element.label} created.`);
      }
    }
  }

  async function deleteElement(elemId: string) {
    if (!confirm("Delete this element?")) return;
    const { error: err } = await supabase.from("elements").delete().eq("id", elemId);
    if (err) setError(`Error: ${err.message}`);
    else setElements((prev) => prev.filter((el) => el.id !== elemId));
  }

  function addElement() {
    if (!recordId || isNew) return;
    const nextLabel = `E${String(elements.length + 1).padStart(2, "0")}`;
    setElements((prev) => [
      ...prev,
      {
        record_id: recordId,
        label: nextLabel,
        neutral_description: "",
        segmentation_status: "uncertain",
        bbox_x: 10,
        bbox_y: 10,
        bbox_width: 20,
        bbox_height: 20,
        confidence: "cautious",
        notes: "",
      },
    ]);
  }

  const IMAGE_TYPES: { value: ImageType; label: string }[] = [
    { value: "full_object", label: "Full Object" },
    { value: "inscription_zone", label: "Inscription Zone" },
    { value: "detail", label: "Detail" },
    { value: "left_angle", label: "Left Angle" },
    { value: "right_angle", label: "Right Angle" },
    { value: "raking_light", label: "Raking Light" },
    { value: "enhanced", label: "Enhanced" },
    { value: "drawing_overlay", label: "Drawing Overlay" },
  ];

  const STATUS_OPTIONS = [
    "UNRESOLVED",
    "SEGMENTATION UNCERTAIN",
    "NEEDS EXPERT REVIEW",
    "PARTIALLY RESOLVED",
    "RESOLVED",
  ];

  if (loading) {
    return (
      <>
        <Toolbar />
        <div className="min-h-screen flex items-center justify-center">
          <p className="font-cinzel text-sm text-mapsa-gold tracking-wider">
            Loading…
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Toolbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-cinzel text-xl text-mapsa-gold tracking-widest uppercase">
              {isNew ? "New Record" : `Edit: ${recordId}`}
            </h1>
            <Link
              href="/admin"
              className="font-garamond text-xs text-mapsa-muted hover:text-mapsa-gold transition-colors"
            >
              ← Back to Admin Dashboard
            </Link>
          </div>
          <button
            onClick={saveRecord}
            disabled={saving}
            className="mapsa-btn-gold text-xs disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Record"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded border border-mapsa-red/30 bg-mapsa-red/10 text-sm text-red-400 font-garamond">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded border border-mapsa-gold/30 bg-mapsa-gold/10 text-sm text-mapsa-gold font-garamond">
            {message}
            <button
              onClick={() => setMessage("")}
              className="ml-3 text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-0.5 mb-6 border-b border-mapsa-border">
          {(["details", "images", "elements"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`mapsa-tab ${activeSection === tab ? "mapsa-tab-active" : ""}`}
            >
              {tab === "details" ? "Record Details" : tab === "images" ? `Images (${images.length})` : `Elements (${elements.length})`}
            </button>
          ))}
        </div>

        {/* ─── Details Section ─── */}
        {activeSection === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mapsa-label block mb-1.5">
                  Record ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="mapsa-input"
                  placeholder="MA-BJ-S01"
                  disabled={!isNew}
                />
                <p className="text-xs text-mapsa-muted mt-1 font-garamond italic">
                  Format: MA-[Structure]-[Zone][Number]
                </p>
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">Field ID</label>
                <input
                  type="text"
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  className="mapsa-input"
                  placeholder="MA-2026-05-15-001"
                />
              </div>
            </div>

            <div>
              <label className="mapsa-label block mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mapsa-input"
                placeholder="Carved cluster with profile element, dot group, and lower block"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mapsa-label block mb-1.5">Site</label>
                <input
                  type="text"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="mapsa-input"
                />
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">
                  Structure <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  className="mapsa-input"
                  placeholder="Building J"
                />
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">Area</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="mapsa-input"
                  placeholder="Main Plaza / South Platform"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mapsa-label block mb-1.5">Object Type</label>
                <input
                  type="text"
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  className="mapsa-input"
                  placeholder="carved slab"
                />
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">
                  Date Photographed
                </label>
                <input
                  type="date"
                  value={datePhotographed}
                  onChange={(e) => setDatePhotographed(e.target.value)}
                  className="mapsa-input"
                />
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">Photographer</label>
                <input
                  type="text"
                  value={photographer}
                  onChange={(e) => setPhotographer(e.target.value)}
                  className="mapsa-input"
                  placeholder="V. Diaz / MAHC"
                />
              </div>
            </div>

            <div>
              <label className="mapsa-label block mb-1.5">
                Location Description
              </label>
              <textarea
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                className="mapsa-input min-h-[4rem]"
                placeholder="South end of the Main Plaza, near the South Platform…"
              />
            </div>

            <div>
              <label className="mapsa-label block mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mapsa-input min-h-[5rem]"
                placeholder="Describe the carved inscription cluster…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mapsa-label block mb-1.5">Condition</label>
                <textarea
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="mapsa-input min-h-[3rem]"
                />
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">
                  Lighting Notes
                </label>
                <textarea
                  value={lightingNotes}
                  onChange={(e) => setLightingNotes(e.target.value)}
                  className="mapsa-input min-h-[3rem]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mapsa-label block mb-1.5">
                  Interpretation Status
                </label>
                <textarea
                  value={interpretationStatus}
                  onChange={(e) => setInterpretationStatus(e.target.value)}
                  className="mapsa-input min-h-[3rem]"
                />
              </div>
              <div>
                <label className="mapsa-label block mb-1.5">
                  Segmentation Status
                </label>
                <textarea
                  value={segmentationStatus}
                  onChange={(e) => setSegmentationStatus(e.target.value)}
                  className="mapsa-input min-h-[3rem]"
                />
              </div>
            </div>

            {/* Status tags */}
            <div>
              <label className="mapsa-label block mb-1.5">Status Tags</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setStatusTags((prev) =>
                        prev.includes(opt)
                          ? prev.filter((s) => s !== opt)
                          : [...prev, opt]
                      )
                    }
                    className={`mapsa-btn text-xs ${statusTags.includes(opt) ? "mapsa-btn-active" : ""}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Images Section ─── */}
        {activeSection === "images" && (
          <div>
            {isNew ? (
              <p className="font-garamond text-sm text-mapsa-muted italic">
                Save the record first before uploading images.
              </p>
            ) : (
              <>
                {/* Upload */}
                <div className="mb-6 p-4 rounded border border-dashed border-mapsa-border bg-mapsa-panel-alt text-center">
                  <label className="cursor-pointer">
                    <span className="mapsa-btn-gold text-xs">
                      {uploading ? "Uploading…" : "Upload Inscription Photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadImage}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <p className="font-garamond text-xs text-mapsa-muted mt-2 italic">
                    JPG, PNG, or WebP. High-resolution recommended.
                  </p>
                </div>

                {/* Image list */}
                {images.length === 0 ? (
                  <p className="font-garamond text-sm text-mapsa-muted italic text-center py-8">
                    No images uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {images.map((img) => (
                      <div
                        key={img.id || img.storage_path}
                        className="flex gap-4 p-3 rounded border border-mapsa-border bg-mapsa-panel-alt"
                      >
                        {/* Thumbnail */}
                        <div className="w-32 h-24 rounded overflow-hidden border border-mapsa-border shrink-0">
                          {img.publicUrl ? (
                            <img
                              src={img.publicUrl}
                              alt={img.label}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-mapsa-bg flex items-center justify-center text-xs text-mapsa-muted">
                              No preview
                            </div>
                          )}
                        </div>

                        {/* Fields */}
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Label
                            </label>
                            <input
                              type="text"
                              value={img.label}
                              onChange={(e) =>
                                setImages((prev) =>
                                  prev.map((i) =>
                                    i.id === img.id
                                      ? { ...i, label: e.target.value }
                                      : i
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                            />
                          </div>
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Type
                            </label>
                            <select
                              value={img.type}
                              onChange={(e) =>
                                updateImage(img.id!, {
                                  type: e.target.value as ImageType,
                                })
                              }
                              className="mapsa-input text-xs"
                            >
                              {IMAGE_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="mapsa-label block mb-0.5">
                              Caption
                            </label>
                            <input
                              type="text"
                              value={img.caption}
                              onChange={(e) =>
                                setImages((prev) =>
                                  prev.map((i) =>
                                    i.id === img.id
                                      ? { ...i, caption: e.target.value }
                                      : i
                                  )
                                )
                              }
                              onBlur={() =>
                                img.id &&
                                updateImage(img.id, { caption: img.caption })
                              }
                              className="mapsa-input text-xs"
                              placeholder="Describe this image…"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex flex-col gap-1">
                          <button
                            onClick={() =>
                              img.id &&
                              updateImage(img.id, { label: img.label })
                            }
                            className="mapsa-btn text-2xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() =>
                              img.id && deleteImage(img.id, img.storage_path)
                            }
                            className="mapsa-btn text-2xs text-red-400 border-red-400/30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Elements Section ─── */}
        {activeSection === "elements" && (
          <div>
            {isNew ? (
              <p className="font-garamond text-sm text-mapsa-muted italic">
                Save the record first before adding elements.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-garamond text-sm text-mapsa-muted italic">
                    Define candidate glyph regions as percentage-based bounding
                    boxes.
                  </p>
                  <button onClick={addElement} className="mapsa-btn-gold text-xs">
                    + Add Element
                  </button>
                </div>

                {elements.length === 0 ? (
                  <p className="font-garamond text-sm text-mapsa-muted italic text-center py-8">
                    No elements defined yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {elements.map((elem, idx) => (
                      <div
                        key={elem.id || idx}
                        className="p-4 rounded border border-mapsa-border bg-mapsa-panel-alt"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-sm text-mapsa-gold-light">
                            {elem.label}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveElement(elem, idx)}
                              className="mapsa-btn-gold text-2xs"
                            >
                              Save
                            </button>
                            {elem.id && (
                              <button
                                onClick={() => deleteElement(elem.id!)}
                                className="mapsa-btn text-2xs text-red-400 border-red-400/30"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Label
                            </label>
                            <input
                              type="text"
                              value={elem.label}
                              onChange={(e) =>
                                setElements((prev) =>
                                  prev.map((el, i) =>
                                    i === idx
                                      ? { ...el, label: e.target.value }
                                      : el
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                            />
                          </div>
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Confidence
                            </label>
                            <select
                              value={elem.confidence}
                              onChange={(e) =>
                                setElements((prev) =>
                                  prev.map((el, i) =>
                                    i === idx
                                      ? { ...el, confidence: e.target.value }
                                      : el
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                            >
                              <option value="low">Low</option>
                              <option value="cautious">Cautious</option>
                              <option value="moderate">Moderate</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="mapsa-label block mb-0.5">
                            Neutral Description
                          </label>
                          <textarea
                            value={elem.neutral_description}
                            onChange={(e) =>
                              setElements((prev) =>
                                prev.map((el, i) =>
                                  i === idx
                                    ? {
                                        ...el,
                                        neutral_description: e.target.value,
                                      }
                                    : el
                                )
                              )
                            }
                            className="mapsa-input text-xs min-h-[3rem]"
                            placeholder="Describe this element without interpretation…"
                          />
                        </div>

                        {/* Bounding box */}
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              X (%)
                            </label>
                            <input
                              type="number"
                              value={elem.bbox_x}
                              onChange={(e) =>
                                setElements((prev) =>
                                  prev.map((el, i) =>
                                    i === idx
                                      ? { ...el, bbox_x: +e.target.value }
                                      : el
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Y (%)
                            </label>
                            <input
                              type="number"
                              value={elem.bbox_y}
                              onChange={(e) =>
                                setElements((prev) =>
                                  prev.map((el, i) =>
                                    i === idx
                                      ? { ...el, bbox_y: +e.target.value }
                                      : el
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Width (%)
                            </label>
                            <input
                              type="number"
                              value={elem.bbox_width}
                              onChange={(e) =>
                                setElements((prev) =>
                                  prev.map((el, i) =>
                                    i === idx
                                      ? { ...el, bbox_width: +e.target.value }
                                      : el
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                          <div>
                            <label className="mapsa-label block mb-0.5">
                              Height (%)
                            </label>
                            <input
                              type="number"
                              value={elem.bbox_height}
                              onChange={(e) =>
                                setElements((prev) =>
                                  prev.map((el, i) =>
                                    i === idx
                                      ? { ...el, bbox_height: +e.target.value }
                                      : el
                                  )
                                )
                              }
                              className="mapsa-input text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="mapsa-label block mb-0.5">
                            Segmentation Status
                          </label>
                          <select
                            value={elem.segmentation_status}
                            onChange={(e) =>
                              setElements((prev) =>
                                prev.map((el, i) =>
                                  i === idx
                                    ? {
                                        ...el,
                                        segmentation_status: e.target.value,
                                      }
                                    : el
                                )
                              )
                            }
                            className="mapsa-input text-xs"
                          >
                            <option value="clear independent element">
                              Clear independent element
                            </option>
                            <option value="probable independent element">
                              Probable independent element
                            </option>
                            <option value="possible sub-element">
                              Possible sub-element
                            </option>
                            <option value="possible numeral/coefficient">
                              Possible numeral/coefficient
                            </option>
                            <option value="possible affix/modifier">
                              Possible affix/modifier
                            </option>
                            <option value="possible compound component">
                              Possible compound component
                            </option>
                            <option value="uncertain">Uncertain</option>
                            <option value="not segmented">Not segmented</option>
                          </select>
                        </div>

                        <div className="mt-2">
                          <label className="mapsa-label block mb-0.5">
                            Notes
                          </label>
                          <textarea
                            value={elem.notes}
                            onChange={(e) =>
                              setElements((prev) =>
                                prev.map((el, i) =>
                                  i === idx
                                    ? { ...el, notes: e.target.value }
                                    : el
                                )
                              )
                            }
                            className="mapsa-input text-xs min-h-[2rem]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
