/*
# KaushalTrace Maharashtra — Employer Verification Enhancement

## Overview
Adds columns for employment status, retention months, and company name to the
employer_verifications table to support the enhanced zero-friction verification form.

## Modified Tables
1. **employer_verifications** — Added columns:
   - employment_status (text) — Full-time / Part-time / Left Job
   - retention_months (int) — months the employee has been retained
   - company_name (text) — the company submitting the verification

## Security
- Existing RLS policies already cover the new columns (TO anon, authenticated).
*/

ALTER TABLE employer_verifications ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE employer_verifications ADD COLUMN IF NOT EXISTS retention_months int;
ALTER TABLE employer_verifications ADD COLUMN IF NOT EXISTS company_name text;
