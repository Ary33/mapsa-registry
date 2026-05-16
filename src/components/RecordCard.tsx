import Link from "next/link";
import type { InscriptionRecord } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface RecordCardProps {
  record: InscriptionRecord;
}

export default function RecordCard({ record }: RecordCardProps) {
  const hasImage = record.images[0]?.src && record.images[0].src.length > 0;

  return (
    <Link href={`/record/${record.id}`} className="block">
      <div className="mapsa-card">
        <div className="flex gap-4 items-start flex-wrap">
          {/* Thumbnail */}
          <div className="w-[120px] h-[90px] shrink-0 rounded overflow-hidden border border-mapsa-border">
            {hasImage ? (
              <img
                src={record.images[0].src}
                alt={record.id}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg viewBox="0 0 120 90" className="w-full h-full">
                <defs>
                  <linearGradient id={`sg-${record.id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3a332c" />
                    <stop offset="100%" stopColor="#1f1a14" />
                  </linearGradient>
                </defs>
                <rect width="120" height="90" fill={`url(#sg-${record.id})`} />
                <text x="60" y="50" textAnchor="middle" fill="#b8ac98" fontFamily="monospace" fontSize="8" opacity="0.5">
                  {record.id}
                </text>
              </svg>
            )}
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
            <p className="text-[0.94rem] font-semibold mb-1">
              {record.title}
            </p>
            <p className="text-[0.81rem] text-mapsa-muted">
              {record.structure} · {record.area}
            </p>
            <div className="flex gap-3 mt-2 text-[0.69rem] text-mapsa-muted">
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
