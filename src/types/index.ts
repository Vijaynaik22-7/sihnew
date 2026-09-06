export interface Trainee {
  id: string
  full_name: string
  district: string
  gender: string
  age: number
  skill_sector: string
  training_center: string
  training_provider: string | null
  course_name: string | null
  non_placement_reason: string | null
  phone_number: string | null
  aadhaar_id: string | null
  scheme_name: string | null
  training_start_date: string
  training_end_date: string
  certification_status: string
  placement_status: string
  employer_name: string | null
  job_role: string | null
  current_wage: number | null
  placement_date: string | null
  retention_months: number
  is_retained: boolean
  last_verified_date: string | null
  consent_data_sharing: boolean
  consent_employer_verification: boolean
  consent_research: boolean
  consent_anonymize: boolean
  employment_outcome: string | null
  outcome_updated_at?: string | null
  follow_up_status?: string | null
  trainee_number: number | null
  created_at: string
}

export interface WhatsAppSurveyReply {
  id: string
  trainee_id: string
  reply_code: string
  outcome: string
  phone_number: string | null
  received_at: string
  created_at: string
}

export interface TimelineEvent {
  id: string
  trainee_id: string
  event_type: string
  event_date: string
  title: string
  description: string | null
  wage: number | null
  employer: string | null
  created_at: string
}

export interface SkillGap {
  id: string
  sector: string
  reason: string
  affected_count: number
  severity: string
  district: string
  created_at: string
}

export interface DistrictStat {
  id: string
  district: string
  total_trained: number
  total_placed: number
  placement_rate: number
  avg_wage: number
  created_at: string
}

export interface EmployerVerification {
  id: string
  trainee_id: string
  token: string
  employer_name: string
  employer_email: string
  status: string
  verified_wage: number | null
  is_retained: boolean | null
  employment_status: string | null
  retention_months: number | null
  company_name: string | null
  verified_at: string | null
  created_at: string
  expires_at: string
}

export interface DashboardMetric {
  id: string
  district: string
  training_provider: string
  course_name: string
  total_trained: number
  total_placed: number
  total_retained: number
  non_placement_low_salary: number
  non_placement_location: number
  non_placement_lack_skills: number
  non_placement_dropped_out: number
  created_at: string
}
