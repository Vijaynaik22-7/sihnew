/*
# KaushalTrace Maharashtra — WhatsApp Survey Outcome Tracking

## Overview
Adds support for tracking employment outcomes collected via WhatsApp survey
replies. Trainees receive a WhatsApp survey asking them to reply with:
  1 = Employed (Green badge)
  2 = Self-Employed (Blue badge)
  3 = Unemployed (Red badge)

This migration adds an `employment_outcome` column to the trainees table to
store the latest outcome reported by the trainee, and creates a new
`whatsapp_survey_replies` table to log every incoming WhatsApp reply payload
for audit purposes.

## Modified Tables
1. **trainees** — Added columns:
   - employment_outcome (text, nullable) — 'Employed' | 'Self-Employed' | 'Unemployed'
   - trainee_number (int, nullable) — a human-friendly sequential display number (e.g. 1024)

## New Tables
1. **whatsapp_survey_replies** — Logs every incoming WhatsApp survey reply.
   - id (uuid, PK)
   - trainee_id (uuid, FK -> trainees.id ON DELETE CASCADE)
   - reply_code (text) — the raw reply code received: '1', '2', or '3'
   - outcome (text) — the mapped outcome: 'Employed', 'Self-Employed', 'Unemployed'
   - phone_number (text, nullable) — the phone number the reply came from
   - received_at (timestamptz) — when the reply was received
   - created_at (timestamptz) — row creation timestamp

## Security
- RLS enabled on whatsapp_survey_replies.
- CRUD policies use TO anon, authenticated (single-tenant demo app, all data public).
- Existing trainees policies already cover the new columns.
*/

-- Add employment_outcome column to trainees
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS employment_outcome text;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS trainee_number int;

-- Assign sequential trainee numbers starting at 1001
DO $$
DECLARE
  rec RECORD;
  counter int := 1000;
BEGIN
  FOR rec IN SELECT id FROM trainees ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE trainees SET trainee_number = counter WHERE id = rec.id;
  END LOOP;
END $$;

-- Create whatsapp_survey_replies table
CREATE TABLE IF NOT EXISTS whatsapp_survey_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  reply_code text NOT NULL,
  outcome text NOT NULL,
  phone_number text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_survey_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_whatsapp_replies" ON whatsapp_survey_replies;
CREATE POLICY "anon_select_whatsapp_replies" ON whatsapp_survey_replies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_whatsapp_replies" ON whatsapp_survey_replies;
CREATE POLICY "anon_insert_whatsapp_replies" ON whatsapp_survey_replies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_whatsapp_replies" ON whatsapp_survey_replies;
CREATE POLICY "anon_update_whatsapp_replies" ON whatsapp_survey_replies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_whatsapp_replies" ON whatsapp_survey_replies;
CREATE POLICY "anon_delete_whatsapp_replies" ON whatsapp_survey_replies FOR DELETE
  TO anon, authenticated USING (true);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_replies_trainee ON whatsapp_survey_replies(trainee_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_replies_received ON whatsapp_survey_replies(received_at DESC);
