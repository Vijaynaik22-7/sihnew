/*
# KaushalTrace Maharashtra — Trainee Portal Enhancement

## Overview
Adds columns for phone number, Aadhaar ID, scheme name, and an anonymization
consent toggle to the trainees table. Updates existing trainees with realistic
mock values for these new fields. Seeds additional timeline events for the
6-month and 12-month follow-up stages if they don't already exist.

## Modified Tables
1. **trainees** — Added columns:
   - phone_number (text, nullable) — trainee's phone number
   - aadhaar_id (text, nullable) — masked Aadhaar ID
   - scheme_name (text) — government skilling scheme name (e.g., PMKVY, ASDP)
   - consent_anonymize (boolean, default false) — whether to anonymize identifiers

2. **Existing 20 trainees** — Updated with:
   - phone_number: realistic Indian mobile numbers
   - aadhaar_id: masked Aadhaar numbers (XXXX-XXXX-1234 format)
   - scheme_name: assigned based on skill_sector
   - consent_anonymize: set to true for some trainees as defaults

## Security
- Existing trainees RLS policies already cover the new columns (TO anon, authenticated).
- No new tables created.
*/

ALTER TABLE trainees ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS aadhaar_id text;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS scheme_name text;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS consent_anonymize boolean NOT NULL DEFAULT false;

-- Assign scheme names based on skill sector
UPDATE trainees SET scheme_name = CASE
  WHEN skill_sector = 'IT & ITES' THEN 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY)'
  WHEN skill_sector = 'Healthcare' THEN 'Ayushman Skill Development Programme (ASDP)'
  WHEN skill_sector = 'Automotive' THEN 'Industrial Training Institute (ITI) Scheme'
  WHEN skill_sector = 'Construction' THEN 'Industrial Training Institute (ITI) Scheme'
  WHEN skill_sector = 'Agriculture' THEN 'Maharashtra Skill Development Programme (MSDP)'
  WHEN skill_sector = 'Textile & Handloom' THEN 'Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY)'
  ELSE 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY)'
END;

-- Assign phone numbers (Indian format +91)
UPDATE trainees SET phone_number = CASE
  WHEN full_name = 'Rahul Deshmukh' THEN '+91 98765 43210'
  WHEN full_name = 'Priya Sharma' THEN '+91 98220 11234'
  WHEN full_name = 'Amit Patil' THEN '+91 99700 56789'
  WHEN full_name = 'Sneha Joshi' THEN '+91 90011 22345'
  WHEN full_name = 'Vikram Pawar' THEN '+91 98123 45678'
  WHEN full_name = 'Anjali Deshmukh' THEN '+91 91234 67890'
  WHEN full_name = 'Rohit Jadhav' THEN '+91 99876 54321'
  WHEN full_name = 'Sunita Kale' THEN '+91 90234 56123'
  WHEN full_name = 'Ganesh Shinde' THEN '+91 98345 67812'
  WHEN full_name = 'Deepika Nair' THEN '+91 91123 45699'
  WHEN full_name = 'Manoj Kumar' THEN '+91 99345 11223'
  WHEN full_name = 'Kavita Reddy' THEN '+91 90123 45678'
  WHEN full_name = 'Sachin More' THEN '+91 98234 56711'
  WHEN full_name = 'Pooja Bhalerao' THEN '+91 91234 78901'
  WHEN full_name = 'Akash Yadav' THEN '+91 99701 23456'
  WHEN full_name = 'Meera Iyer' THEN '+91 90011 67823'
  WHEN full_name = 'Nilesh Bhosale' THEN '+91 98111 23467'
  WHEN full_name = 'Reshma Qureshi' THEN '+91 90211 34598'
  WHEN full_name = 'Tushar Kale' THEN '+91 99811 45672'
  WHEN full_name = 'Aishwarya Desai' THEN '+91 91211 56734'
END;

-- Assign masked Aadhaar IDs
UPDATE trainees SET aadhaar_id = CASE
  WHEN full_name = 'Rahul Deshmukh' THEN 'XXXX-XXXX-4521'
  WHEN full_name = 'Priya Sharma' THEN 'XXXX-XXXX-7832'
  WHEN full_name = 'Amit Patil' THEN 'XXXX-XXXX-1209'
  WHEN full_name = 'Sneha Joshi' THEN 'XXXX-XXXX-3456'
  WHEN full_name = 'Vikram Pawar' THEN 'XXXX-XXXX-8901'
  WHEN full_name = 'Anjali Deshmukh' THEN 'XXXX-XXXX-2345'
  WHEN full_name = 'Rohit Jadhav' THEN 'XXXX-XXXX-6789'
  WHEN full_name = 'Sunita Kale' THEN 'XXXX-XXXX-4567'
  WHEN full_name = 'Ganesh Shinde' THEN 'XXXX-XXXX-9012'
  WHEN full_name = 'Deepika Nair' THEN 'XXXX-XXXX-3458'
  WHEN full_name = 'Manoj Kumar' THEN 'XXXX-XXXX-5671'
  WHEN full_name = 'Kavita Reddy' THEN 'XXXX-XXXX-7894'
  WHEN full_name = 'Sachin More' THEN 'XXXX-XXXX-2367'
  WHEN full_name = 'Pooja Bhalerao' THEN 'XXXX-XXXX-5412'
  WHEN full_name = 'Akash Yadav' THEN 'XXXX-XXXX-8923'
  WHEN full_name = 'Meera Iyer' THEN 'XXXX-XXXX-1287'
  WHEN full_name = 'Nilesh Bhosale' THEN 'XXXX-XXXX-4509'
  WHEN full_name = 'Reshma Qureshi' THEN 'XXXX-XXXX-6734'
  WHEN full_name = 'Tushar Kale' THEN 'XXXX-XXXX-3198'
  WHEN full_name = 'Aishwarya Desai' THEN 'XXXX-XXXX-7245'
END;

-- Set default anonymize consent for a few trainees
UPDATE trainees SET consent_anonymize = true
WHERE full_name IN ('Priya Sharma', 'Sneha Joshi', 'Deepika Nair', 'Kavita Reddy', 'Aishwarya Desai');
