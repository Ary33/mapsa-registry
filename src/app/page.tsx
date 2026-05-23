import Toolbar from "@/components/Toolbar";
import RegistryDashboard from "@/components/RegistryDashboard";
import Footer from "@/components/Footer";
import { fetchAllRecords } from "@/lib/data";

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function HomePage() {
  const records = await fetchAllRecords();

  return (
    <>
      <Toolbar />
      <main>
        <RegistryDashboard records={records as any} />
      </main>
      <Footer />
    </>
  );
}
