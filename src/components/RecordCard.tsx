import Link from "next/link";
import type { InscriptionRecord } from "@/lib/types";
import PlaceholderImage from "./PlaceholderImage";
import StatusBadge from "./StatusBadge";

interface RecordCardProps {
  record: InscriptionRecord;
}

export default function RecordCard({ record }: RecordCardProps) {
  return (
    <Link href={`/record/${record.id}`} className="block">
      <div className="mapsa-card">
        <div className="flex gap-4 items-start flex-wrap">
          {/* Thumbnail */}
          <div className="w-[120px] h-[90px] shrink-0 rounded overflow-hidden border border-mapsa-border">
            <PlaceholderImage label={record.id} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="mapsa-mono">{record.id}</span>
              {record.status.map((st) => (
                <StatusBadge
                  key={st}
                  text={st}
                  variant={
                    st === "NEEDS EXPERT REVIEW" ? "red" : "default"
                  }
                />
              ))}
            </div>
            <p className="text-[15px] font-semibold mb-1">
              {record.title}
            </p>
            <p className="text-[13px] text-mapsa-muted">
              {record.structure} · {record.area}
            </p>
            <div className="flex gap-3 mt-2 text-[11px] text-mapsa-muted">
              <span>{record.images.length} images</span>
              <span>{record.elements.length} elements</span>
              <span>{record.groupings.length} groupings</span>
              <span>{record.annotations.length} annotations</span>
            </div>
          </div>

          {/* CTA */}
          <span className="mapsa-btn-gold shrink-0 self-center">
            View Record
          </span>
        </div>
      </div>
    </Link>
  );
}
