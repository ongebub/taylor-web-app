-- ============================================================
-- Taylor Exteriors & Construction — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Projects: one row per customer job
CREATE TABLE projects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text UNIQUE NOT NULL,
  customer_name        text NOT NULL,
  customer_email       text,
  customer_phone       text,
  address              text,
  project_type         text NOT NULL DEFAULT 'Roofing',
  status               text NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled', 'in_progress', 'complete')),
  current_phase        text,
  start_date           date,
  estimated_completion date,
  actual_completion    date,
  google_review_url    text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Milestones: ordered checklist per project
CREATE TABLE milestones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  scheduled_date  date,
  completed_date  date,
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Photos: before / during / after images
CREATE TABLE photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  public_url      text NOT NULL,
  phase           text NOT NULL DEFAULT 'during'
                    CHECK (phase IN ('before', 'during', 'after')),
  caption         text,
  order_index     integer NOT NULL DEFAULT 0,
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

-- Warranties: product warranty records per project
CREATE TABLE warranties (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  coverage_description text,
  start_date           date,
  expiry_date          date,
  document_url         text,
  document_path        text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_projects_slug       ON projects(slug);
CREATE INDEX idx_projects_status     ON projects(status);
CREATE INDEX idx_milestones_project  ON milestones(project_id);
CREATE INDEX idx_milestones_order    ON milestones(project_id, order_index);
CREATE INDEX idx_photos_project      ON photos(project_id);
CREATE INDEX idx_photos_phase        ON photos(project_id, phase);
CREATE INDEX idx_warranties_project  ON warranties(project_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

-- ----- PROJECTS -----
CREATE POLICY "Public read access"  ON projects FOR SELECT                USING (true);
CREATE POLICY "Admin insert"        ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update"        ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete"        ON projects FOR DELETE TO authenticated USING (true);

-- ----- MILESTONES -----
CREATE POLICY "Public read access"  ON milestones FOR SELECT                USING (true);
CREATE POLICY "Admin insert"        ON milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update"        ON milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete"        ON milestones FOR DELETE TO authenticated USING (true);

-- ----- PHOTOS -----
CREATE POLICY "Public read access"  ON photos FOR SELECT                USING (true);
CREATE POLICY "Admin insert"        ON photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update"        ON photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete"        ON photos FOR DELETE TO authenticated USING (true);

-- ----- WARRANTIES -----
CREATE POLICY "Public read access"  ON warranties FOR SELECT                USING (true);
CREATE POLICY "Admin insert"        ON warranties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update"        ON warranties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete"        ON warranties FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 4. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('warranty-docs', 'warranty-docs', true);

-- Storage policies — project-photos
CREATE POLICY "Public read project photos"   ON storage.objects FOR SELECT                USING (bucket_id = 'project-photos');
CREATE POLICY "Admin upload project photos"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-photos');
CREATE POLICY "Admin update project photos"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-photos');
CREATE POLICY "Admin delete project photos"  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-photos');

-- Storage policies — warranty-docs
CREATE POLICY "Public read warranty docs"    ON storage.objects FOR SELECT                USING (bucket_id = 'warranty-docs');
CREATE POLICY "Admin upload warranty docs"   ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'warranty-docs');
CREATE POLICY "Admin update warranty docs"   ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'warranty-docs');
CREATE POLICY "Admin delete warranty docs"   ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'warranty-docs');

-- ============================================================
-- 5. SEED DATA (for testing — remove before production)
-- ============================================================

INSERT INTO projects (
  slug, customer_name, customer_email, customer_phone,
  address, project_type, status, current_phase,
  start_date, estimated_completion, google_review_url
) VALUES (
  'smith-123-main-st',
  'John Smith',
  'john.smith@email.com',
  '515-555-0100',
  '123 Main St, Des Moines, IA 50309',
  'Roofing',
  'in_progress',
  'Tear-off complete — installing underlayment',
  '2026-03-15',
  '2026-04-05',
  'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review'
);

-- Seed milestones for the sample project
INSERT INTO milestones (project_id, title, description, scheduled_date, completed_date, order_index)
SELECT p.id, v.title, v.description, v.sdate::date, v.cdate::date, v.idx
FROM projects p
CROSS JOIN (VALUES
  ('Materials Delivered',   'Shingles, underlayment, and flashing delivered to site',  '2026-03-14', '2026-03-14', 1),
  ('Tear-Off',              'Remove existing shingles and inspect decking',            '2026-03-15', '2026-03-16', 2),
  ('Underlayment',          'Install ice & water shield and synthetic underlayment',   '2026-03-17', NULL,         3),
  ('Shingles Installed',    'Install new Malarkey Vista AR shingles',                  '2026-03-19', NULL,         4),
  ('Flashing & Ridge Cap',  'Install step flashing, pipe boots, and ridge cap',        '2026-03-21', NULL,         5),
  ('Final Inspection',      'Quality inspection and city permit sign-off',             '2026-03-23', NULL,         6),
  ('Cleanup & Walkthrough', 'Magnetic sweep, debris removal, and customer walkthrough','2026-03-24', NULL,         7)
) AS v(title, description, sdate, cdate, idx)
WHERE p.slug = 'smith-123-main-st';

-- Seed warranty
INSERT INTO warranties (project_id, name, coverage_description, start_date, expiry_date)
SELECT p.id,
  'Malarkey Vista AR Shingles — Lifetime Limited',
  'Limited lifetime warranty covering manufacturing defects. Class 4 impact resistance rated. Includes 10-year full replacement coverage.',
  '2026-03-24',
  '2076-03-24'
FROM projects p
WHERE p.slug = 'smith-123-main-st';

-- ============================================================
-- ADMIN USER SETUP (do this manually in Supabase Dashboard):
--   Authentication → Users → Add User
--   Email: info@TaylorExt.com (or your preferred admin email)
--   Password: choose a strong password
-- ============================================================
