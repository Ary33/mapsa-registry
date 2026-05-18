import { notFound } from "next/navigation";
import Link from "next/link";
import Toolbar from "@/components/Toolbar";
import Footer from "@/components/Footer";
import { contributors } from "@/data/contributors";
import { records } from "@/data/records";
import { getGroupColor } from "@/lib/utils";

interface ContributorPageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return contributors.map((c) => ({ id: c.id }));
}

export default function ContributorPage({ params }: ContributorPageProps) {
  const contributor = contributors.find((c) => c.id === params.id);
  if (!contributor) return notFound();

  const allAnnotations = records.flatMap((r) => r.annotations);
  const allGroupings = records.flatMap((r) => r.groupings);
  const contribAnnotations = allAnnotations.filter(
    (a) => a.contributorId === contributor.id
  );
  const contribGroupings = allGroupings.filter(
    (g) => g.contributorId === contributor.id
  );

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
          {contributor.name}
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

        {contributor.researchAreas.length > 0 && (
          <div className="mb-4">
            <div className="mapsa-label">Research Areas</div>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {contributor.researchAreas.map((ra) => (
                <span key={ra} className="mapsa-badge">
                  {ra}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mapsa-label mt-6">
          Annotations ({contribAnnotations.length})
        </div>
        {contribAnnotations.map((a) => (
          <div key={a.id} className="mapsa-card mt-2">
            <span className="mapsa-mono">{a.id}</span> — {a.type} on{" "}
            {a.targetId}
          </div>
        ))}

        <div className="mapsa-label mt-6">
          Grouping Hypotheses ({contribGroupings.length})
        </div>
        {contribGroupings.map((g) => (
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
