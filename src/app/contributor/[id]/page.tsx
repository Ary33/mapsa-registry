import { notFound } from "next/navigation";
import Link from "next/link";
import Toolbar from "@/components/Toolbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { getGroupColor } from "@/lib/utils";

interface ContributorPageProps {
  params: { id: string };
}

export default async function ContributorPage({ params }: ContributorPageProps) {
  // Fetch contributor profile
  const { data: contributor, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !contributor) return notFound();

  // Fetch contributor's annotations
  const { data: annotations } = await supabase
    .from("annotations")
    .select("id, type, target_id, target_type, record_id, created_at")
    .eq("contributor_id", params.id)
    .order("created_at", { ascending: false });

  // Fetch contributor's groupings
  const { data: groupings } = await supabase
    .from("groupings")
    .select("id, title, record_id, created_at")
    .eq("contributor_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Toolbar />
      <main className="max-w-[700px] mx-auto px-6 py-8">
        <nav className="mb-6">
          <Link
            href="/"
            className="text-xs text-mapsa-muted hover:text-mapsa-gold transition-colors font-cinzel tracking-wider uppercase"
          >
            ← Back to Registry
          </Link>
        </nav>

        <h1 className="mapsa-section-title !text-base">
          {contributor.full_name}
        </h1>
        {contributor.affiliation && (
          <p className="text-sm text-mapsa-muted mb-1">
            {contributor.affiliation}
          </p>
        )}
        {contributor.orcid && (
          <p className="mapsa-mono mb-2">ORCID: {contributor.orcid}</p>
        )}
        {contributor.bio && (
          <p className="text-sm leading-relaxed mb-3">{contributor.bio}</p>
        )}

        {contributor.research_areas?.length > 0 && (
          <div className="mb-4">
            <div className="mapsa-label">Research Areas</div>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {contributor.research_areas.map((ra: string) => (
                <span key={ra} className="mapsa-badge">
                  {ra}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mapsa-label mt-6">
          Annotations ({annotations?.length || 0})
        </div>
        {(annotations || []).map((a: any) => (
          <div key={a.id} className="mapsa-card mt-2">
            <span className="mapsa-mono">{a.record_id}</span> — {a.type} on{" "}
            {a.target_id}
          </div>
        ))}

        <div className="mapsa-label mt-6">
          Grouping Hypotheses ({groupings?.length || 0})
        </div>
        {(groupings || []).map((g: any) => (
          <div key={g.id} className="mapsa-card mt-2">
            <span
              className="mapsa-mono"
              style={{ color: getGroupColor(g.id) }}
            >
              {g.id}
            </span>{" "}
            — {g.title}
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
