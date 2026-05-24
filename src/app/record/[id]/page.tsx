import { notFound } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import RecordViewer from "@/components/RecordViewer";
import Footer from "@/components/Footer";
import { fetchRecord } from "@/lib/data";

interface RecordPageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecordPage({ params }: RecordPageProps) {
  const record = await fetchRecord(params.id);
  if (!record) return notFound();

  return (
    <>
      <Toolbar
        recordId={record.id}
        recordVersion={record.record_version}
      />
      <main>
        <RecordViewer record={record} />
      </main>
      <Footer />
    </>
  );
}
