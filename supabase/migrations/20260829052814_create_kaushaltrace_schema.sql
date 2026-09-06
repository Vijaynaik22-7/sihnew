/*
# KaushalTrace Maharashtra — Core Schema

## Overview
Creates the data model for a Government Skilling & Employment Outcome Tracker.
The app has three views: Admin Dashboard, Trainee Portal, and Employer Verification.
No sign-in screen is required — this is a single-tenant demo app where all data
is intentionally shared/public. Policies use `TO anon, authenticated`.

## New Tables

1. **trainees** — Individuals who have undergone skilling programs.
   - id (uuid, PK)
   - full_name (text)
   - district (text) — district in Maharashtra
   - gender (text)
   - age (int)
   - skill_sector (text) — e.g., IT, Healthcare, Automotive
   - training_center (text)
   - training_start_date (date)
   - training_end_date (date)
   - certification_status (text) — Certified / In Progress / Not Certified
   - placement_status (text) — Placed / Not Placed / Seeking
   - employer_name (text, nullable)
   - job_role (text, nullable)
   - current_wage (numeric, nullable) — monthly wage in INR
   - placement_date (date, nullable)
   - retention_months (int, default 0) — months retained in current job
   - is_retained (boolean, default false) — still employed as of last verification
   - last_verified_date (date, nullable)
   - consent_data_sharing (boolean, default true) — opt-in/opt-out for data sharing
   - consent_employer_verification (boolean, default true) — consent for employer to verify
   - consent_research (boolean, default false) — consent for research use
   - created_at (timestamptz)

2. **timeline_events** — Longitudinal events for each trainee's journey.
   - id (uuid, PK)
   - trainee_id (uuid, FK → trainees.id ON DELETE CASCADE)
   - event_type (text) — Enrollment, Training Start, Certification, Placement, Wage Update, Retention Check, Exit
   - event_date (date)
   - title (text)
   - description (text)
   - wage (numeric, nullable)
   - employer (text, nullable)
   - created_at (timestamptz)

3. **skill_gaps** — Reasons for skill gaps by sector/district.
   - id (uuid, PK)
   - sector (text)
   - reason (text)
   - affected_count (int)
   - severity (text) — High / Medium / Low
   - district (text)
   - created_at (timestamptz)

4. **district_placement_stats** — Aggregated placement stats per district.
   - id (uuid, PK)
   - district (text)
   - total_trained (int)
   - total_placed (int)
   - placement_rate (numeric) — percentage
   - avg_wage (numeric) — average monthly wage in INR
   - created_at (timestamptz)

5. **employer_verifications** — Tokenized verification links for employers.
   - id (uuid, PK)
   - trainee_id (uuid, FK → trainees.id ON DELETE CASCADE)
   - token (text, unique) — tokenized link identifier
   - employer_name (text)
   - employer_email (text)
   - status (text) — Pending / Verified / Rejected
   - verified_wage (numeric, nullable)
   - is_retained (boolean, nullable)
   - verified_at (timestamptz, nullable)
   - created_at (timestamptz)
   - expires_at (timestamptz)

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant demo app with no sign-in — all data is intentionally public.
*/

-- Trainees
CREATE TABLE IF NOT EXISTS trainees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  district text NOT NULL,
  gender text NOT NULL DEFAULT 'Male',
  age int NOT NULL DEFAULT 22,
  skill_sector text NOT NULL,
  training_center text NOT NULL,
  training_start_date date NOT NULL,
  training_end_date date NOT NULL,
  certification_status text NOT NULL DEFAULT 'In Progress',
  placement_status text NOT NULL DEFAULT 'Seeking',
  employer_name text,
  job_role text,
  current_wage numeric,
  placement_date date,
  retention_months int NOT NULL DEFAULT 0,
  is_retained boolean NOT NULL DEFAULT false,
  last_verified_date date,
  consent_data_sharing boolean NOT NULL DEFAULT true,
  consent_employer_verification boolean NOT NULL DEFAULT true,
  consent_research boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trainees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trainees" ON trainees;
CREATE POLICY "anon_select_trainees" ON trainees FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trainees" ON trainees;
CREATE POLICY "anon_insert_trainees" ON trainees FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trainees" ON trainees;
CREATE POLICY "anon_update_trainees" ON trainees FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trainees" ON trainees;
CREATE POLICY "anon_delete_trainees" ON trainees FOR DELETE
  TO anon, authenticated USING (true);

-- Timeline Events
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date date NOT NULL,
  title text NOT NULL,
  description text,
  wage numeric,
  employer text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_timeline" ON timeline_events;
CREATE POLICY "anon_select_timeline" ON timeline_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_timeline" ON timeline_events;
CREATE POLICY "anon_insert_timeline" ON timeline_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_timeline" ON timeline_events;
CREATE POLICY "anon_update_timeline" ON timeline_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_timeline" ON timeline_events;
CREATE POLICY "anon_delete_timeline" ON timeline_events FOR DELETE
  TO anon, authenticated USING (true);

-- Skill Gaps
CREATE TABLE IF NOT EXISTS skill_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  reason text NOT NULL,
  affected_count int NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'Medium',
  district text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_skill_gaps" ON skill_gaps;
CREATE POLICY "anon_select_skill_gaps" ON skill_gaps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_skill_gaps" ON skill_gaps;
CREATE POLICY "anon_insert_skill_gaps" ON skill_gaps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_skill_gaps" ON skill_gaps;
CREATE POLICY "anon_update_skill_gaps" ON skill_gaps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_skill_gaps" ON skill_gaps;
CREATE POLICY "anon_delete_skill_gaps" ON skill_gaps FOR DELETE
  TO anon, authenticated USING (true);

-- District Placement Stats
CREATE TABLE IF NOT EXISTS district_placement_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district text NOT NULL,
  total_trained int NOT NULL DEFAULT 0,
  total_placed int NOT NULL DEFAULT 0,
  placement_rate numeric NOT NULL DEFAULT 0,
  avg_wage numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE district_placement_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_district_stats" ON district_placement_stats;
CREATE POLICY "anon_select_district_stats" ON district_placement_stats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_district_stats" ON district_placement_stats;
CREATE POLICY "anon_insert_district_stats" ON district_placement_stats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_district_stats" ON district_placement_stats;
CREATE POLICY "anon_update_district_stats" ON district_placement_stats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_district_stats" ON district_placement_stats;
CREATE POLICY "anon_delete_district_stats" ON district_placement_stats FOR DELETE
  TO anon, authenticated USING (true);

-- Employer Verifications
CREATE TABLE IF NOT EXISTS employer_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  employer_name text NOT NULL,
  employer_email text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  verified_wage numeric,
  is_retained boolean,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE employer_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_verifications" ON employer_verifications;
CREATE POLICY "anon_select_verifications" ON employer_verifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_verifications" ON employer_verifications;
CREATE POLICY "anon_insert_verifications" ON employer_verifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_verifications" ON employer_verifications;
CREATE POLICY "anon_update_verifications" ON employer_verifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_verifications" ON employer_verifications;
CREATE POLICY "anon_delete_verifications" ON employer_verifications FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_trainee ON timeline_events(trainee_id);
CREATE INDEX IF NOT EXISTS idx_verifications_token ON employer_verifications(token);
CREATE INDEX IF NOT EXISTS idx_trainees_district ON trainees(district);
