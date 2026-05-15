import { notFound } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import RecordViewer from "@/components/RecordViewer";
import Footer from "@/components/Footer";
import { records } from "@/data/records";
import { sources } from "@/data/sources";

interface RecordPageProps {
  params: { id: string };
}

// Pre-generate routes for static export
export function generateStaticParams() {
  return records.map((r) => ({ id: r.id }));
}

export default function RecordPage({ params }: RecordPageProps) {
  const record = records.find((r) => r.id === params.id);
  if (!record) return notFound();

  // Merge global sources with record-specific sources
  const recordSources = sources.filter((s) =>
    s.relatedRecordIds.includes(record.id)
  );

  return (
    <>
      <Toolbar
        recordId={record.id}
        status={record.status}
        recordVersion={record.recordVersion}
      />
      <main>
        <RecordViewer record={record} sources={recordSources} />
      </main>
      <Footer />
    </>
  );
}
