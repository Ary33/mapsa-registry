-- ============================================================================
-- MAPSA Inscription Registry — Initial Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext; -- case-insensitive email matching


-- ============================================================================
-- 1. ALLOWED EMAIL DOMAINS (institutional validation)
-- ============================================================================
-- Two-tier system:
--   • Domains in this table get auto-approved on registration
--   • Unlisted institutional emails can register but require admin approval
-- ============================================================================

CREATE TABLE allowed_email_domains (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain     CITEXT NOT NULL UNIQUE,
  country    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with known academic/research/government domains worldwide
INSERT INTO allowed_email_domains (domain, country, notes) VALUES
  -- United States
  ('edu', 'US', 'US higher education'),
  -- Mexico
  ('edu.mx', 'MX', 'Mexican higher education'),
  ('unam.mx', 'MX', 'Universidad Nacional Autónoma de México'),
  ('inah.gob.mx', 'MX', 'Instituto Nacional de Antropología e Historia'),
  ('colmex.mx', 'MX', 'El Colegio de México'),
  ('ciesas.edu.mx', 'MX', 'CIESAS'),
  ('enah.edu.mx', 'MX', 'Escuela Nacional de Antropología e Historia'),
  ('ipn.mx', 'MX', 'Instituto Politécnico Nacional'),
  ('cinvestav.mx', 'MX', 'CINVESTAV'),
  ('conacyt.mx', 'MX', 'CONAHCYT (formerly CONACYT)'),
  ('gob.mx', 'MX', 'Mexican government'),
  -- United Kingdom
  ('ac.uk', 'GB', 'UK academic institutions'),
  -- Canada
  ('ca', 'CA', 'Canadian institutions (broad — admin review recommended)'),
  ('gc.ca', 'CA', 'Government of Canada'),
  -- Europe
  ('edu.es', 'ES', 'Spanish higher education'),
  ('csic.es', 'ES', 'Consejo Superior de Investigaciones Científicas'),
  ('cnrs.fr', 'FR', 'Centre national de la recherche scientifique'),
  ('univ-paris1.fr', 'FR', 'Université Paris 1'),
  ('uni-bonn.de', 'DE', 'University of Bonn (Mesoamerican studies)'),
  ('hu-berlin.de', 'DE', 'Humboldt University Berlin'),
  ('uni-hamburg.de', 'DE', 'University of Hamburg'),
  ('edu.it', 'IT', 'Italian higher education'),
  ('ac.at', 'AT', 'Austrian academic institutions'),
  ('edu.pl', 'PL', 'Polish higher education'),
  ('ac.be', 'BE', 'Belgian academic institutions'),
  ('edu.nl', 'NL', 'Dutch higher education'),
  -- Latin America
  ('edu.ar', 'AR', 'Argentine higher education'),
  ('edu.br', 'BR', 'Brazilian higher education'),
  ('edu.co', 'CO', 'Colombian higher education'),
  ('edu.pe', 'PE', 'Peruvian higher education'),
  ('edu.gt', 'GT', 'Guatemalan higher education (Maya studies crossover)'),
  ('usac.edu.gt', 'GT', 'Universidad de San Carlos de Guatemala'),
  ('edu.hn', 'HN', 'Honduran higher education'),
  -- Japan
  ('ac.jp', 'JP', 'Japanese academic institutions'),
  -- Australia / New Zealand
  ('edu.au', 'AU', 'Australian higher education'),
  ('ac.nz', 'NZ', 'New Zealand academic institutions'),
  -- Other
  ('edu.cn', 'CN', 'Chinese higher education'),
  ('ac.kr', 'KR', 'South Korean academic institutions'),
  ('ac.il', 'IL', 'Israeli academic institutions'),
  ('edu.in', 'IN', 'Indian higher education'),
  ('edu.za', 'ZA', 'South African higher education'),
  -- Research organizations (international)
  ('si.edu', 'US', 'Smithsonian Institution'),
  ('dumbarton-oaks.org', 'US', 'Dumbarton Oaks (Pre-Columbian Studies)'),
  ('sas.ac.uk', 'GB', 'School of Advanced Study, University of London'),
  ('arch.cam.ac.uk', 'GB', 'Cambridge Archaeology');


-- ============================================================================
-- 2. USER PROFILES
-- ============================================================================
-- Extends Supabase auth.users. Created via trigger on signup.
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'researcher', 'pending');

CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            CITEXT NOT NULL,
  full_name        TEXT NOT NULL,
  affiliation      TEXT,
  orcid            TEXT,
  bio              TEXT,
  research_areas   TEXT[] DEFAULT '{}',
  role             user_role DEFAULT 'pending',
  is_auto_approved BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 3. FUNCTION: Check if email domain is in the allow-list
-- ============================================================================

CREATE OR REPLACE FUNCTION check_email_domain(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  email_domain TEXT;
  domain_part  TEXT;
  found        BOOLEAN := FALSE;
BEGIN
  -- Extract everything after @
  email_domain := lower(split_part(user_email, '@', 2));

  -- Check exact match first, then progressively broader suffix matches
  -- e.g. for "researcher@iia.unam.mx" check:
  --   iia.unam.mx -> unam.mx -> mx
  domain_part := email_domain;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM allowed_email_domains WHERE domain = domain_part
    ) INTO found;

    IF found THEN RETURN TRUE; END IF;

    -- Strip the leftmost subdomain
    IF position('.' IN domain_part) = 0 THEN
      RETURN FALSE;
    END IF;
    domain_part := substring(domain_part FROM position('.' IN domain_part) + 1);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 4. FUNCTION: Auto-create profile on signup + auto-approve if domain matches
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  domain_approved BOOLEAN;
BEGIN
  domain_approved := check_email_domain(NEW.email);

  INSERT INTO profiles (id, email, full_name, role, is_auto_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN domain_approved THEN 'researcher' ELSE 'pending' END,
    domain_approved
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after every new auth.users row
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================================
-- 5. INSCRIPTION RECORDS (admin-managed base layer)
-- ============================================================================

CREATE TABLE records (
  id                    TEXT PRIMARY KEY,  -- e.g. "MA-ST12-Z01"
  field_id              TEXT NOT NULL,
  title                 TEXT NOT NULL,
  site                  TEXT NOT NULL DEFAULT 'Monte Albán',
  area                  TEXT NOT NULL,
  structure             TEXT NOT NULL,
  object_type           TEXT NOT NULL,
  location_description  TEXT,
  date_photographed     DATE,
  photographer          TEXT,
  record_version        TEXT DEFAULT '1.0.0',
  status                TEXT[] DEFAULT '{}',
  description           TEXT,
  condition             TEXT,
  lighting_notes        TEXT,
  interpretation_status TEXT,
  segmentation_status   TEXT,
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 6. IMAGE ASSETS
-- ============================================================================

CREATE TYPE image_type AS ENUM (
  'full_object','inscription_zone','detail','left_angle','right_angle',
  'raking_light','enhanced','drawing_overlay'
);

CREATE TABLE images (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id          TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  type               image_type NOT NULL,
  label              TEXT NOT NULL,
  storage_path       TEXT NOT NULL,  -- Supabase Storage path
  caption            TEXT,
  photographer       TEXT,
  date_taken         DATE,
  is_primary_evidence BOOLEAN DEFAULT TRUE,
  sort_order         INT DEFAULT 0,
  uploaded_by        UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_images_record ON images(record_id);


-- ============================================================================
-- 7. OVERLAYS (positioned on images — admin creates base, scholars can propose)
-- ============================================================================

CREATE TYPE overlay_type AS ENUM ('line_drawing','candidate_elements','grouping_hypothesis');
CREATE TYPE overlay_confidence AS ENUM ('observational','interpretive','uncertain');

CREATE TABLE overlays (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id         TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  type              overlay_type NOT NULL,
  label             TEXT NOT NULL,
  storage_path      TEXT,  -- SVG or image in Supabase Storage
  based_on_images   UUID[] DEFAULT '{}',
  confidence        overlay_confidence DEFAULT 'observational',
  note              TEXT,
  visible_by_default BOOLEAN DEFAULT FALSE,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_overlays_record ON overlays(record_id);


-- ============================================================================
-- 8. CANDIDATE ELEMENTS (glyph regions on a record)
-- ============================================================================

CREATE TYPE segmentation_status AS ENUM (
  'clear independent element','probable independent element',
  'possible sub-element','possible numeral/coefficient',
  'possible affix/modifier','possible compound component',
  'uncertain','not segmented'
);

CREATE TYPE confidence_level AS ENUM ('low','cautious','moderate','high');

CREATE TABLE elements (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id            TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  label                TEXT NOT NULL,  -- "E01", "E02", etc.
  neutral_description  TEXT,
  segmentation_status  segmentation_status DEFAULT 'uncertain',
  -- Bounding box as percentage coordinates
  bbox_x               NUMERIC NOT NULL,
  bbox_y               NUMERIC NOT NULL,
  bbox_width           NUMERIC NOT NULL,
  bbox_height          NUMERIC NOT NULL,
  confidence           confidence_level DEFAULT 'cautious',
  notes                TEXT,
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_elements_record ON elements(record_id);


-- ============================================================================
-- 9. GROUPING HYPOTHESES
-- ============================================================================

CREATE TYPE proposed_relationship AS ENUM (
  'belong together','may belong together','likely separate',
  'visually adjacent only','uncertain',
  'current segmentation should be revised'
);

CREATE TYPE grouping_status AS ENUM (
  'neutral default','published hypothesis','alternative hypothesis',
  'disputed','superseded'
);

CREATE TABLE groupings (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id              TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  element_ids            UUID[] NOT NULL DEFAULT '{}',
  proposed_relationship  proposed_relationship DEFAULT 'uncertain',
  interpretation         TEXT,
  interpretation_caution TEXT,
  contributor_id         UUID NOT NULL REFERENCES profiles(id),
  source_ids             UUID[] DEFAULT '{}',
  confidence             confidence_level DEFAULT 'cautious',
  status                 grouping_status DEFAULT 'alternative hypothesis',
  version                TEXT DEFAULT '1.0',
  is_published           BOOLEAN DEFAULT FALSE,
  published_at           TIMESTAMPTZ,
  citation_text          TEXT,  -- auto-generated on publish
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_groupings_record ON groupings(record_id);
CREATE INDEX idx_groupings_contributor ON groupings(contributor_id);


-- ============================================================================
-- 10. ANNOTATIONS (the core scholar contribution)
-- ============================================================================

CREATE TYPE annotation_type AS ENUM (
  'segmentation hypothesis','bibliographic note','interpretive note',
  'correction','field observation','photo request response'
);

CREATE TYPE annotation_visibility AS ENUM (
  'public attributed','private advisory','anonymous public'
);

CREATE TYPE annotation_status AS ENUM (
  'draft','pending','published','rejected','superseded'
);

CREATE TABLE annotations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id         TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  target_type       TEXT NOT NULL CHECK (target_type IN ('record','element','grouping','source','image')),
  target_id         TEXT NOT NULL,  -- polymorphic reference
  contributor_id    UUID NOT NULL REFERENCES profiles(id),
  type              annotation_type NOT NULL,
  body              TEXT NOT NULL,
  sources_cited     UUID[] DEFAULT '{}',
  confidence        confidence_level DEFAULT 'cautious',
  visibility        annotation_visibility DEFAULT 'public attributed',
  status            annotation_status DEFAULT 'draft',
  version           TEXT DEFAULT '1.0',
  is_published      BOOLEAN DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  citation_text     TEXT,  -- auto-generated on publish
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_annotations_record ON annotations(record_id);
CREATE INDEX idx_annotations_contributor ON annotations(contributor_id);
CREATE INDEX idx_annotations_target ON annotations(target_type, target_id);


-- ============================================================================
-- 11. SOURCES / BIBLIOGRAPHY
-- ============================================================================

CREATE TABLE sources (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author            TEXT NOT NULL,
  title             TEXT NOT NULL,
  year              TEXT,
  publication       TEXT,
  pages             TEXT,
  url               TEXT,
  doi               TEXT,
  notes             TEXT,
  related_record_ids TEXT[] DEFAULT '{}',
  added_by          UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 12. PHOTO REQUESTS
-- ============================================================================

CREATE TYPE photo_request_type AS ENUM (
  'closer crop','wider context','left angle','right angle',
  'morning light','afternoon light','raking light','surface texture',
  'scale reference if permitted','nearby carved elements','other'
);

CREATE TYPE photo_request_status AS ENUM ('pending','accepted','completed','declined');

CREATE TABLE photo_requests (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id            TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  requested_by         UUID NOT NULL REFERENCES profiles(id),
  request_types        photo_request_type[] NOT NULL,
  message              TEXT,
  permission_to_credit BOOLEAN DEFAULT TRUE,
  status               photo_request_status DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photo_requests_record ON photo_requests(record_id);


-- ============================================================================
-- 13. AUDIT LOG (immutable citation trail)
-- ============================================================================
-- Every significant action creates an audit entry. This is the backbone
-- of the citation system — it proves who did what, when.
-- ============================================================================

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,  -- 'annotation.published', 'grouping.created', etc.
  entity_type   TEXT NOT NULL,  -- 'annotation', 'grouping', 'element', 'record'
  entity_id     TEXT NOT NULL,
  record_id     TEXT REFERENCES records(id),
  payload       JSONB,          -- snapshot of the data at time of action
  citation_text TEXT,           -- human-readable citation generated at write time
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);


-- ============================================================================
-- 14. CITATION GENERATOR FUNCTION
-- ============================================================================
-- Generates a standardized citation string from contributor + entity data.
-- Called by application code when publishing annotations/groupings.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_citation(
  p_contributor_name TEXT,
  p_entity_title TEXT,
  p_record_id TEXT,
  p_entity_type TEXT,
  p_version TEXT DEFAULT '1.0'
)
RETURNS TEXT AS $$
BEGIN
  RETURN format(
    '%s, "%s," MAPSA Monte Albán Inscription Registry, %s, v%s, %s.',
    p_contributor_name,
    p_entity_title,
    p_record_id,
    p_version,
    to_char(now(), 'YYYY')
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_email_domains ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── Records (admin-managed) ──
CREATE POLICY "Records are viewable by everyone"
  ON records FOR SELECT USING (true);

CREATE POLICY "Admins can manage records"
  ON records FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Images (admin-managed) ──
CREATE POLICY "Images are viewable by everyone"
  ON images FOR SELECT USING (true);

CREATE POLICY "Admins can manage images"
  ON images FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Overlays ──
CREATE POLICY "Overlays are viewable by everyone"
  ON overlays FOR SELECT USING (true);

CREATE POLICY "Admins can manage all overlays"
  ON overlays FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Researchers can create overlays"
  ON overlays FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'researcher')
  );

-- ── Elements (admin creates base layer; researchers can propose) ──
CREATE POLICY "Elements are viewable by everyone"
  ON elements FOR SELECT USING (true);

CREATE POLICY "Admins can manage all elements"
  ON elements FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Researchers can create elements"
  ON elements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'researcher')
  );

-- ── Groupings ──
CREATE POLICY "Published groupings are viewable by everyone"
  ON groupings FOR SELECT USING (
    is_published = TRUE
    OR contributor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Researchers can create groupings"
  ON groupings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','researcher'))
  );

CREATE POLICY "Contributors can update own draft groupings"
  ON groupings FOR UPDATE USING (
    contributor_id = auth.uid() AND is_published = FALSE
  );

CREATE POLICY "Admins can manage all groupings"
  ON groupings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Annotations ──
CREATE POLICY "Published annotations are viewable by everyone"
  ON annotations FOR SELECT USING (
    is_published = TRUE
    OR contributor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Researchers can create annotations"
  ON annotations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','researcher'))
  );

CREATE POLICY "Contributors can update own drafts"
  ON annotations FOR UPDATE USING (
    contributor_id = auth.uid() AND is_published = FALSE
  );

CREATE POLICY "Admins can manage all annotations"
  ON annotations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Sources ──
CREATE POLICY "Sources are viewable by everyone"
  ON sources FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add sources"
  ON sources FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','researcher'))
  );

CREATE POLICY "Admins can manage all sources"
  ON sources FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Photo Requests ──
CREATE POLICY "Photo requests viewable by requester and admin"
  ON photo_requests FOR SELECT USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Researchers can create photo requests"
  ON photo_requests FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','researcher'))
  );

CREATE POLICY "Admins can manage photo requests"
  ON photo_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Audit Log (append-only, viewable by admins) ──
CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert audit entries"
  ON audit_log FOR INSERT WITH CHECK (true);

-- ── Allowed Email Domains (admin-managed) ──
CREATE POLICY "Email domains viewable by everyone"
  ON allowed_email_domains FOR SELECT USING (true);

CREATE POLICY "Admins can manage email domains"
  ON allowed_email_domains FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================================
-- 16. STORAGE BUCKETS
-- ============================================================================
-- Run these separately in the SQL Editor if the storage schema isn't available.
-- Alternatively, create buckets via Dashboard > Storage > New Bucket.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('inscription-photos', 'inscription-photos', true),
  ('overlays', 'overlays', true),
  ('avatars', 'avatars', true);

-- Storage policies: public read, authenticated upload for photos/overlays
CREATE POLICY "Public read inscription photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inscription-photos');

CREATE POLICY "Admins upload inscription photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inscription-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Public read overlays"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'overlays');

CREATE POLICY "Authenticated users upload overlays"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'overlays'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','researcher'))
  );

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );


-- ============================================================================
-- 17. PROMOTE YOUR ACCOUNT TO ADMIN
-- ============================================================================
-- After you sign up with your own email, run this ONCE in the SQL Editor
-- replacing the email with your actual signup email:
--
--   UPDATE profiles SET role = 'admin'
--   WHERE email = 'your-email@montealbanoaxaca.com';
--
-- ============================================================================
