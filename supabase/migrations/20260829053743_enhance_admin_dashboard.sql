/*
# KaushalTrace Maharashtra — Admin Dashboard Enhancement

## Overview
Adds columns for training provider, course name, and non-placement reason to the
trainees table. Creates a new `dashboard_metrics` table to store aggregate statistics
by district/provider/course combinations, enabling fast filtered queries for the
Admin Dashboard. Seeds the table with realistic Maharashtra skilling scheme data
totaling ~12,450 trainees, ~68% placement, ~74% retention. Adds 3 more skill gap
records to reach 18 total.

## Modified Tables
1. **trainees** — Added columns:
   - training_provider (text) — the organization providing the training
   - course_name (text) — specific course taken (more granular than skill_sector)
   - non_placement_reason (text, nullable) — reason for non-placement

2. **Existing 20 trainees** — Updated with training_provider, course_name, and
   non_placement_reason values.

## New Tables
3. **dashboard_metrics** — Aggregate statistics by district/provider/course.
   - id (uuid, PK)
   - district (text)
   - training_provider (text)
   - course_name (text)
   - total_trained (int)
   - total_placed (int)
   - total_retained (int) — retained after 6 months
   - non_placement_low_salary (int)
   - non_placement_location (int)
   - non_placement_lack_skills (int)
   - non_placement_dropped_out (int)
   - created_at (timestamptz)

## Security
- RLS enabled on dashboard_metrics with anon+authenticated CRUD (single-tenant, no auth).
- Existing trainees table RLS policies already cover the new columns.
*/

-- Add new columns to trainees
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS training_provider text;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS course_name text;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS non_placement_reason text;

-- Update existing 20 trainees with training_provider and course_name
UPDATE trainees SET
  training_provider = CASE
    WHEN skill_sector = 'IT & ITES' THEN 'Maharashtra Skill Development Society'
    WHEN skill_sector = 'Healthcare' THEN 'PMKVY Authorized Center'
    WHEN skill_sector = 'Automotive' THEN 'ITI Maharashtra'
    WHEN skill_sector = 'Construction' THEN 'ITI Maharashtra'
    WHEN skill_sector = 'Agriculture' THEN 'Maharashtra Skill Development Society'
    WHEN skill_sector = 'Textile & Handloom' THEN 'Mahila Arthik Vikas Mahamandal'
  END,
  course_name = CASE
    WHEN skill_sector = 'IT & ITES' THEN 'Web Development Fundamentals'
    WHEN skill_sector = 'Healthcare' THEN 'General Nursing Assistance'
    WHEN skill_sector = 'Automotive' THEN 'Auto Service Technician'
    WHEN skill_sector = 'Construction' THEN 'Construction & Site Management'
    WHEN skill_sector = 'Agriculture' THEN 'Modern Agriculture Practices'
    WHEN skill_sector = 'Textile & Handloom' THEN 'Textile Machine Operation'
  END;

-- Update non-placement reasons
UPDATE trainees SET non_placement_reason = 'Lack of Practical Skills'
WHERE placement_status = 'Not Placed' AND full_name = 'Vikram Pawar';
UPDATE trainees SET non_placement_reason = 'Location Constraints'
WHERE placement_status = 'Not Placed' AND full_name = 'Manoj Kumar';
UPDATE trainees SET non_placement_reason = 'Low Starting Salary'
WHERE placement_status = 'Seeking' AND full_name = 'Meera Iyer';

-- Create dashboard_metrics table
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district text NOT NULL,
  training_provider text NOT NULL,
  course_name text NOT NULL,
  total_trained int NOT NULL DEFAULT 0,
  total_placed int NOT NULL DEFAULT 0,
  total_retained int NOT NULL DEFAULT 0,
  non_placement_low_salary int NOT NULL DEFAULT 0,
  non_placement_location int NOT NULL DEFAULT 0,
  non_placement_lack_skills int NOT NULL DEFAULT 0,
  non_placement_dropped_out int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dashboard_metrics" ON dashboard_metrics;
CREATE POLICY "anon_select_dashboard_metrics" ON dashboard_metrics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_dashboard_metrics" ON dashboard_metrics;
CREATE POLICY "anon_insert_dashboard_metrics" ON dashboard_metrics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_dashboard_metrics" ON dashboard_metrics;
CREATE POLICY "anon_update_dashboard_metrics" ON dashboard_metrics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_dashboard_metrics" ON dashboard_metrics;
CREATE POLICY "anon_delete_dashboard_metrics" ON dashboard_metrics FOR DELETE
  TO anon, authenticated USING (true);

-- Clear existing data
DELETE FROM dashboard_metrics;

-- Seed dashboard_metrics using a procedural loop with simple arrays
DO $$
DECLARE
  districts text[] := ARRAY['Pune','Mumbai','Nagpur','Nashik','Thane','Aurangabad','Kolhapur','Solapur','Amravati','Ratnagiri'];
  district_totals int[] := ARRAY[2200,2500,1200,1000,1400,1100,800,700,550,1000];
  district_rates float[] := ARRAY[0.75,0.75,0.60,0.60,0.70,0.60,0.70,0.60,0.60,0.70];
  providers text[] := ARRAY[
    'Maharashtra Skill Development Society',
    'NSDC Partner - IL&FS',
    'PMKVY Authorized Center',
    'ITI Maharashtra',
    'Mahila Arthik Vikas Mahamandal'
  ];
  courses text[] := ARRAY[
    'Web Development Fundamentals',
    'General Nursing Assistance',
    'Auto Service Technician',
    'Construction & Site Management',
    'Modern Agriculture Practices',
    'Textile Machine Operation',
    'Retail Sales Associate',
    'Hospitality Management',
    'Electronics Assembly',
    'Beauty & Wellness'
  ];
  di int;
  pi int;
  ci int;
  combos int;
  base int;
  remainder int;
  counter int;
  trained int;
  placed int;
  retained int;
  not_placed int;
  r1 int; r2 int; r3 int; r4 int;
  d_total int;
  d_rate float;
  d_district text;
BEGIN
  FOR di IN 1..array_length(districts, 1) LOOP
    d_district := districts[di];
    d_total := district_totals[di];
    d_rate := district_rates[di];

    -- Count valid combos
    combos := 0;
    FOR pi IN 1..array_length(providers, 1) LOOP
      FOR ci IN 1..array_length(courses, 1) LOOP
        IF (pi + ci) % 3 != 0 THEN
          combos := combos + 1;
        END IF;
      END LOOP;
    END LOOP;

    base := d_total / combos;
    remainder := d_total % combos;
    counter := 0;

    FOR pi IN 1..array_length(providers, 1) LOOP
      FOR ci IN 1..array_length(courses, 1) LOOP
        IF (pi + ci) % 3 = 0 THEN
          CONTINUE;
        END IF;

        counter := counter + 1;
        trained := base;
        IF counter <= remainder THEN
          trained := trained + 1;
        END IF;
        trained := trained + floor(random() * 5 - 2);
        IF trained < 5 THEN
          trained := 5;
        END IF;

        placed := floor(trained * d_rate + (random() * 0.06 - 0.03));
        placed := LEAST(placed, trained);
        placed := GREATEST(placed, 0);

        retained := floor(placed * 0.74 + (random() * 0.06 - 0.03));
        retained := LEAST(retained, placed);
        retained := GREATEST(retained, 0);

        not_placed := trained - placed;

        r1 := floor(not_placed * 0.35);
        r2 := floor(not_placed * 0.25);
        r3 := floor(not_placed * 0.25);
        r4 := not_placed - r1 - r2 - r3;
        IF r4 < 0 THEN
          r4 := 0;
          r3 := not_placed - r1 - r2;
        END IF;

        INSERT INTO dashboard_metrics
          (district, training_provider, course_name, total_trained, total_placed, total_retained,
           non_placement_low_salary, non_placement_location, non_placement_lack_skills, non_placement_dropped_out)
        VALUES
          (d_district, providers[pi], courses[ci], trained, placed, retained, r1, r2, r3, r4);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Add 3 more skill gap records to reach 18 total
INSERT INTO skill_gaps (sector, reason, affected_count, severity, district) VALUES
('Retail', 'Lack of digital payment system training', 130, 'Medium', 'Pune'),
('Hospitality', 'Insufficient English hospitality vocabulary', 110, 'Low', 'Mumbai'),
('Electronics', 'Limited PCB repair skills', 95, 'Low', 'Aurangabad')
ON CONFLICT DO NOTHING;
