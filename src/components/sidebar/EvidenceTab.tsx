import type { InscriptionRecord } from "@/lib/types";

interface EvidenceTabProps {
  record: InscriptionRecord;
}

export default function EvidenceTab({ record }: EvidenceTabProps) {
  const fields: [string, string, "mono" | "text"][] = [
    ["Record ID", record.id, "mono"],
    ["Field ID", record.fieldId, "mono"],
    ["Site", record.site, "text"],
    ["Structure", record.structure, "text"],
    ["Location", record.locationDescription, "text"],
    ["Object Type", record.objectType, "text"],
    ["Photographer", record.photographer, "text"],
    ["Date Photographed", record.datePhotographed, "text"],
    ["Condition", record.condition, "text"],
    ["Lighting Notes", record.lightingNotes, "text"],
    ["Segmentation Status", record.segmentationStatus, "text"],
    ["Interpretation Status", record.interpretationStatus, "text"],
    ["Record Version", record.recordVersion, "mono"],
  ];

  return (
    <div>
      <h3 className="mapsa-section-title">Evidence Record</h3>
      {fields.map(([label, val, type]) => (
        <div key={label} className="mb-2.5">
          <div className="mapsa-label">{label}</div>
          <div
            className={
              type === "mono"
                ? "mapsa-mono"
                : "text-sm leading-relaxed"
            }
          >
            {val}
          </div>
        </div>
      ))}
    </div>
  );
}
