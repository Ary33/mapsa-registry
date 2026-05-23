import type { InscriptionRecord } from "@/lib/types";

interface EvidenceTabProps {
  record: InscriptionRecord;
}

export default function EvidenceTab({ record }: EvidenceTabProps) {
  const fields: [string, string, "mono" | "text"][] = [
    ["Record ID", record.id, "mono"],
    ["Field ID", record.field_id, "mono"],
    ["Site", record.site, "text"],
    ["Structure", record.structure, "text"],
    ["Location", record.location_description, "text"],
    ["Object Type", record.object_type, "text"],
    ["Photographer", record.photographer, "text"],
    ["Date Photographed", record.date_photographed, "text"],
    ["Condition", record.condition, "text"],
    ["Lighting Notes", record.lighting_notes, "text"],
    ["Segmentation Status", record.segmentation_status, "text"],
    ["Interpretation Status", record.interpretation_status, "text"],
    ["Record Version", record.record_version, "mono"],
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
