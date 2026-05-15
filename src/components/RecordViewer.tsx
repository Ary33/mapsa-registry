"use client";

import { useState, useCallback } from "react";
import type {
  InscriptionRecord,
  Source,
  Annotation,
  CandidateElement,
  GroupingHypothesis,
} from "@/lib/types";
import type { AnnotationFormData } from "./sidebar/AnnotationsTab";
import type { TabName } from "./SidebarPanel";
import ImageViewer from "./ImageViewer";
import SidebarPanel from "./SidebarPanel";
import StatusBadge from "./StatusBadge";

interface RecordViewerProps {
  record: InscriptionRecord;
  sources: Source[];
}

export default function RecordViewer({
  record,
  sources,
}: RecordViewerProps) {
  const [activeImg, setActiveImg] = useState(record.images[0]?.id || "");
  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState<TabName>("Evidence");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<
    CandidateElement | GroupingHypothesis | null
  >(null);
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(
    record.annotations
  );

  const toggleOverlay = useCallback((key: string) => {
    if (key === "photo_only") {
      setActiveOverlays([]);
      return;
    }
    setActiveOverlays((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      let next = [...prev, key];
      // Only one grouping at a time
      if (key.startsWith("G")) {
        next = next.filter((x) => !x.startsWith("G") || x === key);
      }
      return next;
    });
  }, []);

  const selectElement = useCallback(
    (el: CandidateElement) => {
      setSelectedId(el.id);
      setSelected(el);
      setSidebarTab("Elements");
      if (!activeOverlays.includes("elements")) {
        setActiveOverlays((prev) => [
          ...prev.filter((x) => !x.startsWith("G")),
          "elements",
        ]);
      }
    },
    [activeOverlays]
  );

  const selectGrouping = useCallback((g: GroupingHypothesis) => {
    setSelectedId(g.id);
    setSelected(g);
    setSidebarTab("Groupings");
    setActiveOverlays((prev) => [
      ...prev.filter((x) => !x.startsWith("G") && x !== "elements"),
      g.id,
    ]);
  }, []);

  const submitAnnotation = useCallback(
    (form: AnnotationFormData) => {
      const newAnn: Annotation = {
        id: `ann-${Date.now()}`,
        recordId: record.id,
        targetType: form.targetType as Annotation["targetType"],
        targetId: form.targetId || record.id,
        contributorId: "contrib-new",
        contributorName: form.name,
        affiliation: form.affiliation || undefined,
        orcid: form.orcid || undefined,
        type: form.type as Annotation["type"],
        body:
          form.body +
          (form.boundaryCorrection
            ? `\n\n[Boundary correction suggestion: ${form.boundaryCorrection}]`
            : ""),
        sourcesCited: form.sourcesCited
          ? form.sourcesCited.split(",").map((s) => s.trim())
          : [],
        confidence: form.confidence as Annotation["confidence"],
        visibility: form.visibility as Annotation["visibility"],
        status: "pending",
        version: "1.0",
        dateSubmitted: new Date().toISOString().split("T")[0],
        citationText: `${form.name}, ${form.type}, MAPSA ${record.id}, ${new Date().getFullYear()}.`,
      };
      setLocalAnnotations((prev) => [newAnn, ...prev]);
    },
    [record.id]
  );

  return (
    <div>
      {/* Status badges row */}
      <div className="flex gap-1.5 flex-wrap px-4 py-2">
        {record.status.map((st) => (
          <StatusBadge
            key={st}
            text={st}
            variant={st === "NEEDS EXPERT REVIEW" ? "red" : "default"}
          />
        ))}
        <span className="mapsa-mono text-[0.69rem] ml-auto">
          v{record.recordVersion}
        </span>
      </div>

      {/* Split layout */}
      <div className="flex flex-wrap min-h-[calc(100vh-120px)]">
        <ImageViewer
          images={record.images}
          overlays={record.overlays}
          elements={record.elements}
          groupings={record.groupings}
          activeImg={activeImg}
          setActiveImg={setActiveImg}
          activeOverlays={activeOverlays}
          toggleOverlay={toggleOverlay}
          selectedId={selectedId}
          onSelectElement={selectElement}
        />
        <SidebarPanel
          record={record}
          sources={sources}
          annotations={localAnnotations}
          selectedId={selectedId}
          selected={selected}
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          onSelectElement={selectElement}
          onSelectGrouping={selectGrouping}
          onSubmitAnnotation={submitAnnotation}
        />
      </div>
    </div>
  );
}
