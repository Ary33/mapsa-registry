# MAPSA Monte Albán Inscription Registry

A researcher-facing registry for Monte Albán inscriptions, carved clusters, candidate glyph elements, grouping hypotheses, citations, annotations, and field photo requests.

**Core principle:** The photo is evidence. The overlay is interpretation.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# → Open http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

## Deploy to Vercel (Recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select the repo
3. Vercel auto-detects Next.js — click Deploy
4. Point `registry.montealbanoaxaca.com` as a CNAME to `cname.vercel-dns.com`

**That's it.** Free tier covers this easily.

## Deploy to Netlify (Alternative)

1. Uncomment `output: 'export'` in `next.config.js`
2. Run `npm run build` — output goes to `out/`
3. Drag-drop the `out/` folder to [netlify.com](https://netlify.com)
4. Or connect your GitHub repo for auto-deploys

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (fonts, theme, meta)
│   ├── page.tsx            # Dashboard / homepage
│   ├── record/[id]/        # Individual record viewer
│   └── contributor/[id]/   # Contributor profile
├── components/             # React components
│   ├── Toolbar.tsx
│   ├── ImageViewer.tsx
│   ├── HotspotLayer.tsx
│   ├── RecordViewer.tsx
│   ├── RegistryDashboard.tsx
│   ├── RecordCard.tsx
│   ├── SidebarPanel.tsx
│   ├── StatusBadge.tsx
│   ├── PlaceholderImage.tsx
│   ├── Footer.tsx
│   └── sidebar/            # Sidebar tab components
│       ├── EvidenceTab.tsx
│       ├── ElementsTab.tsx
│       ├── GroupingsTab.tsx
│       ├── AnnotationsTab.tsx
│       ├── SourcesTab.tsx
│       ├── CitationTab.tsx
│       └── PhotoRequestTab.tsx
├── data/                   # Seed data (→ Supabase later)
│   ├── records.ts
│   ├── sources.ts
│   └── contributors.ts
├── lib/                    # Utilities & types
│   ├── types.ts            # Full TypeScript data model
│   ├── utils.ts            # Helpers, citation generators
│   └── ThemeContext.tsx     # Dark/light theme provider
└── styles/
    └── globals.css         # Tailwind + MAPSA theme variables
```

## Migrating to Supabase

The data model in `src/lib/types.ts` maps directly to Postgres tables:

1. Create tables matching each interface (`records`, `sources`, `contributors`, `annotations`, `elements`, `groupings`, `photo_requests`)
2. Replace imports from `@/data/*` with Supabase client queries
3. Add Row Level Security for contributor permissions
4. Move annotation/photo request submissions to Supabase inserts

The TypeScript interfaces are already clean enough to use as Supabase generated types.

## Adding Real Images

Replace the `PlaceholderImage` SVG component with actual `<img>` tags:

1. Add photos to `public/images/` or use Supabase Storage
2. Update the `src` field in each `ImageAsset` in your records data
3. The hotspot overlay system uses percentage-based positioning and works with any image dimensions

## Key Design Decisions

- **Evidence vs. interpretation** is enforced at every level
- **Scholarly language**: "has been interpreted as," "proposed as," never "means"
- **Candidate element**, not "glyph" — preserving uncertainty
- **No automated decipherments** — all interpretations are attributed, versioned, and citable
- **Overlay governance**: only MAPSA creates visual overlays in v1; researchers submit text-based corrections

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Local JSON seed data (Supabase-ready)

## License

This project is dual-licensed:

- **Software** (code, components, build tooling): [MIT](LICENSE)
- **Content** (data, records, documentation, photographs): [CC BY-NC-SA 4.0](LICENSE)

In short: the code is freely usable in any project. Content, including
inscription records and archaeological interpretations, requires attribution
to MAHC and may not be used commercially without arrangement.

For institutional partnerships or commercial inquiries, contact:
contact@montealbanoaxaca.com
---

© Monte Albán Heritage Center · MAPSA
