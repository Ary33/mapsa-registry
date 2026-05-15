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
import EvidenceTab from "./sidebar/EvidenceTab";
import ElementsTab from "./sidebar/ElementsTab";
import GroupingsTab from "./sidebar/GroupingsTab";
import AnnotationsTab from "./sidebar/AnnotationsTab";
import SourcesTab from "./sidebar/SourcesTab";
import CitationTab from "./sidebar/CitationTab";
import PhotoRequestTab from "./sidebar/PhotoRequestTab";

const TABS = [
  "Evidence",
  "Elements",
  "Groupings",
  "Annotations",
  "Sources",
  "Citation",
  "Photo Request",
] as const;

type TabName = (typeof TABS)[number];

interface SidebarPanelProps {
  record: InscriptionRecord;
  sources: Source[];
  annotations: Annotation[];
  selectedId: string | null;
  selected: CandidateElement | GroupingHypothesis | null;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  onSelectElement: (el: CandidateElement) => void;
  onSelectGrouping: (g: GroupingHypothesis) => void;
  onSubmitAnnotation: (form: AnnotationFormData) => void;
}

export default function SidebarPanel({
  record,
  sources,
  annotations,
  selectedId,
  selected,
  activeTab,
  setActiveTab,
  onSelectElement,
  onSelectGrouping,
  onSubmitAnnotation,
}: SidebarPanelProps) {
  const [photoSubmitted, setPhotoSubmitted] = useState(false);

  const tabContent: Record<TabName, React.ReactNode> = {
    Evidence: <EvidenceTab record={record} />,
    Elements: (
      <ElementsTab
        elements={record.elements}
        selectedId={selectedId}
        onSelect={onSelectElement}
      />
    ),
    Groupings: (
      <GroupingsTab
        groupings={record.groupings}
        selectedId={selectedId}
        onSelect={onSelectGrouping}
        sources={sources}
      />
    ),
    Annotations: (
      <AnnotationsTab
        annotations={annotations}
        onSubmit={onSubmitAnnotation}
      />
    ),
    Sources: <SourcesTab sources={sources} />,
    Citation: <CitationTab record={record} selected={selected} />,
    "Photo Request": (
      <PhotoRequestTab
        recordId={record.id}
        submitted={photoSubmitted}
        onSubmit={() => setPhotoSubmitted(true)}
      />
    ),
  };

  return (
    <div className="flex-1 min-w-[320px] border-l border-mapsa-border bg-mapsa-panel">
      {/* Tab bar */}
      <div className="flex flex-wrap border-b border-mapsa-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mapsa-tab ${activeTab === tab ? "mapsa-tab-active" : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-160px)]">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}

export type { TabName };
