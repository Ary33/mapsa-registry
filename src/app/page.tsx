import Toolbar from "@/components/Toolbar";
import RegistryDashboard from "@/components/RegistryDashboard";
import Footer from "@/components/Footer";
import { records } from "@/data/records";

export default function HomePage() {
  return (
    <>
      <Toolbar />
      <main>
        <RegistryDashboard records={records} />
      </main>
      <Footer />
    </>
  );
}
