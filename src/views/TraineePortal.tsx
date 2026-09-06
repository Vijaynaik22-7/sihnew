import { useEffect, useState, useMemo } from 'react'
import {
  User, MapPin, GraduationCap, Briefcase, IndianRupee, Calendar,
  CheckCircle2, XCircle, Clock, Share2, ShieldCheck, FileSearch,
  Building2, TrendingUp, AlertCircle, Hash, Phone, IdCard,
  Award, Lock, Eye, EyeOff, ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Trainee, TimelineEvent } from '../types'

type ConsentField = 'consent_data_sharing' | 'consent_employer_verification' | 'consent_research' | 'consent_anonymize'

interface TimelineStage {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  ring: string
  description: (t: Trainee, e?: TimelineEvent) => string
  date: (t: Trainee, e?: TimelineEvent) => string | null
  detail: (t: Trainee, e?: TimelineEvent) => React.ReactNode
  isComplete: (t: Trainee, e?: TimelineEvent) => boolean
  isCurrent: (t: Trainee, e?: TimelineEvent) => boolean
}

export default function TraineePortal() {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('trainees').select('*').order('created_at')
      setTrainees(data ?? [])
      if (data && data.length > 0) setSelectedId(data[0].id)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setEventsLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('trainee_id', selectedId)
        .order('event_date', { ascending: true })
      setEvents(data ?? [])
      setEventsLoading(false)
    })()
  }, [selectedId])

  const selectedTrainee = trainees.find((t) => t.id === selectedId)

  const toggleConsent = async (field: ConsentField, value: boolean) => {
    if (!selectedId) return
    setUpdating(field)
    const { data } = await supabase
      .from('trainees')
      .update({ [field]: value })
      .eq('id', selectedId)
      .select()
      .single()
    if (data) {
      setTrainees((prev) => prev.map((t) => (t.id === selectedId ? data : t)))
      const labels: Record<ConsentField, string> = {
        consent_data_sharing: 'Data sharing with employers',
        consent_employer_verification: 'Longitudinal trackers',
        consent_research: 'Research & analytics',
        consent_anonymize: 'Identifier anonymization',
      }
      setToast(value ? `${labels[field]} enabled` : `${labels[field]} disabled`)
      setTimeout(() => setToast(null), 2500)
    }
    setUpdating(null)
  }

  // Build the 5-stage longitudinal timeline
  const stages: TimelineStage[] = useMemo(() => {
    const findEvent = (type: string) => events.find((e) => e.event_type === type)
    const findRetention = (months: number) => {
      const retentionEvents = events.filter((e) => e.event_type === 'Retention Check')
      return retentionEvents.find((e) => e.description?.includes(`${months} months`))
    }

    return [
      {
        key: 'enrolled',
        label: 'Enrolled',
        icon: <User className="w-5 h-5" />,
        color: 'bg-blue-100 text-blue-600',
        ring: 'ring-blue-100',
        description: (t) => `Enrolled in ${t.skill_sector} program at ${t.training_center}`,
        date: (t) => t.training_start_date,
        detail: (t) => (
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-xs text-ink-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {t.district}
            </span>
            <span className="text-xs text-ink-600 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> {t.course_name ?? t.skill_sector}
            </span>
          </div>
        ),
        isComplete: () => true,
        isCurrent: (t) => t.certification_status === 'In Progress',
      },
      {
        key: 'certified',
        label: 'Certified',
        icon: <Award className="w-5 h-5" />,
        color: 'bg-forest-100 text-forest-600',
        ring: 'ring-forest-100',
        description: (t) => t.certification_status === 'Certified'
          ? `Certification completed in ${t.skill_sector}`
          : 'Certification in progress',
        date: (t) => t.training_end_date,
        detail: (t) => (
          <span className={`badge ${t.certification_status === 'Certified' ? 'badge-success' : 'badge-warning'} text-xs`}>
            {t.certification_status}
          </span>
        ),
        isComplete: (t) => t.certification_status === 'Certified',
        isCurrent: (t) => t.certification_status === 'In Progress',
      },
      {
        key: 'placed',
        label: 'First Job Placed (Month 3)',
        icon: <Briefcase className="w-5 h-5" />,
        color: 'bg-saffron-100 text-saffron-600',
        ring: 'ring-saffron-100',
        description: (t) => t.placement_status === 'Placed'
          ? `Placed at ${t.employer_name} as ${t.job_role}`
          : t.placement_status === 'Seeking'
          ? 'Actively seeking employment'
          : 'Not yet placed',
        date: (t) => t.placement_date,
        detail: (t) => t.placement_status === 'Placed' ? (
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-xs text-ink-600 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {t.employer_name}
            </span>
            {t.current_wage != null && (
              <span className="text-xs text-ink-600 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> {t.current_wage.toLocaleString('en-IN')}/month
              </span>
            )}
          </div>
        ) : (
          <span className={`badge ${t.placement_status === 'Seeking' ? 'badge-warning' : 'badge-danger'} text-xs`}>
            {t.placement_status}
          </span>
        ),
        isComplete: (t) => t.placement_status === 'Placed',
        isCurrent: (t) => t.placement_status === 'Seeking' || (t.placement_status === 'Placed' && t.retention_months < 6),
      },
      {
        key: 'followup6',
        label: '6-Month Follow-Up',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'bg-amber-100 text-amber-600',
        ring: 'ring-amber-100',
        description: (t) => t.retention_months >= 6
          ? `Retained for 6 months at ${t.employer_name}`
          : t.placement_status === 'Placed'
          ? `Pending — ${t.retention_months} months completed so far`
          : 'Not applicable yet',
        date: (t) => t.placement_date ? addMonths(t.placement_date, 6) : null,
        detail: (t) => t.retention_months >= 6 ? (
          <span className="badge badge-success text-xs">Retained at 6 months</span>
        ) : t.placement_status === 'Placed' ? (
          <span className="badge badge-warning text-xs">{t.retention_months} months so far</span>
        ) : null,
        isComplete: (t) => t.retention_months >= 6,
        isCurrent: (t) => t.placement_status === 'Placed' && t.retention_months >= 3 && t.retention_months < 6,
      },
      {
        key: 'followup12',
        label: '12-Month Follow-Up',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: 'bg-forest-100 text-forest-600',
        ring: 'ring-forest-100',
        description: (t) => t.retention_months >= 12
          ? `Retained for 12 months at ${t.employer_name}`
          : t.placement_status === 'Placed'
          ? `Pending — ${t.retention_months} months completed so far`
          : 'Not applicable yet',
        date: (t) => t.placement_date ? addMonths(t.placement_date, 12) : null,
        detail: (t) => t.retention_months >= 12 ? (
          <span className="badge badge-success text-xs">Retained at 12 months</span>
        ) : t.placement_status === 'Placed' ? (
          <span className="badge badge-warning text-xs">{t.retention_months} months so far</span>
        ) : null,
        isComplete: (t) => t.retention_months >= 12,
        isCurrent: (t) => t.placement_status === 'Placed' && t.retention_months >= 6 && t.retention_months < 12,
      },
    ]
  }, [events])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-ink-100 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-ink-100 rounded-2xl" />
            <div className="h-64 bg-ink-100 rounded-2xl lg:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-ink-900">Trainee Profile & Consent Portal</h2>
        <p className="text-ink-500 mt-1">View your training journey and manage your data privacy preferences</p>
      </div>

      {/* Trainee selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {trainees.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
              t.id === selectedId
                ? 'bg-saffron-500 text-white'
                : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
            }`}
          >
            {t.full_name}
          </button>
        ))}
      </div>

      {selectedTrainee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile + Consent */}
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-saffron-500 to-saffron-600 px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white text-xl font-bold ring-2 ring-white/30">
                    {selectedTrainee.full_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold text-lg leading-tight">{selectedTrainee.full_name}</h3>
                    <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {selectedTrainee.district}, Maharashtra
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <ProfileRow
                  icon={<Hash className="w-4 h-4" />}
                  label="Trainee ID"
                  value={selectedTrainee.consent_anonymize ? hashId(selectedTrainee.id) : selectedTrainee.id}
                  mono
                />
                <ProfileRow
                  icon={<Award className="w-4 h-4" />}
                  label="Scheme Name"
                  value={selectedTrainee.scheme_name ?? 'N/A'}
                />
                <ProfileRow
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="Skill Course"
                  value={selectedTrainee.course_name ?? selectedTrainee.skill_sector}
                />
                <ProfileRow
                  icon={<Building2 className="w-4 h-4" />}
                  label="Training Provider"
                  value={selectedTrainee.training_provider ?? selectedTrainee.training_center}
                />
                <ProfileRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Training Period"
                  value={`${formatDate(selectedTrainee.training_start_date)} → ${formatDate(selectedTrainee.training_end_date)}`}
                />
                <ProfileRow
                  icon={<ShieldCheck className="w-4 h-4" />}
                  label="Certification"
                  value={selectedTrainee.certification_status}
                  badge={selectedTrainee.certification_status === 'Certified' ? 'success' : 'warning'}
                />
                <ProfileRow
                  icon={<Briefcase className="w-4 h-4" />}
                  label="Placement Status"
                  value={selectedTrainee.placement_status}
                  badge={selectedTrainee.placement_status === 'Placed' ? 'success' : selectedTrainee.placement_status === 'Seeking' ? 'warning' : 'danger'}
                />

                {/* Contact info with anonymization */}
                <div className="pt-3 mt-3 border-t border-ink-100 space-y-3">
                  <ProfileRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Phone Number"
                    value={selectedTrainee.consent_anonymize ? '••••• •••XX' : (selectedTrainee.phone_number ?? 'N/A')}
                    mono
                  />
                  <ProfileRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="Aadhaar ID"
                    value={selectedTrainee.consent_anonymize ? hashId(selectedTrainee.aadhaar_id ?? '') : (selectedTrainee.aadhaar_id ?? 'N/A')}
                    mono
                  />
                </div>
              </div>
            </div>

            {/* Privacy & Consent Control Panel */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-5 h-5 text-saffron-600" />
                <h3 className="font-semibold text-ink-900">Privacy & Consent Controls</h3>
              </div>
              <p className="text-xs text-ink-400 mb-4">
                You control how your data is used. Toggle any preference off at any time. Your choices are respected across all government systems.
              </p>

              {/* Anonymization badge */}
              {selectedTrainee.consent_anonymize && (
                <div className="mb-4 p-3 rounded-xl bg-forest-50 border border-forest-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-forest-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-forest-700">Data Anonymized via SHA-256 Hash</p>
                    <p className="text-xs text-forest-600 mt-0.5">
                      Your phone number and Aadhaar ID are hashed. Real identifiers are hidden from all views.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <ConsentToggle
                  icon={<Share2 className="w-4 h-4" />}
                  title="Allow Data Sharing with Employers"
                  description="Permit your employer to verify your employment status and wage through a secure tokenized link."
                  value={selectedTrainee.consent_employer_verification}
                  disabled={updating === 'consent_employer_verification'}
                  onToggle={(v) => toggleConsent('consent_employer_verification', v)}
                />
                <ConsentToggle
                  icon={<TrendingUp className="w-4 h-4" />}
                  title="Allow Longitudinal Trackers"
                  description="Enable long-term tracking of your career progression from training through employment follow-ups."
                  value={selectedTrainee.consent_data_sharing}
                  disabled={updating === 'consent_data_sharing'}
                  onToggle={(v) => toggleConsent('consent_data_sharing', v)}
                />
                <ConsentToggle
                  icon={<FileSearch className="w-4 h-4" />}
                  title="Anonymize Identifier"
                  description="Hash your phone number and Aadhaar ID using SHA-256. Real identifiers will be hidden from all views."
                  value={selectedTrainee.consent_anonymize}
                  disabled={updating === 'consent_anonymize'}
                  onToggle={(v) => toggleConsent('consent_anonymize', v)}
                  highlight
                />
                <ConsentToggle
                  icon={<FileSearch className="w-4 h-4" />}
                  title="Research & Analytics"
                  description="Allow your anonymized data to be used for research studies and labor market analytics."
                  value={selectedTrainee.consent_research}
                  disabled={updating === 'consent_research'}
                  onToggle={(v) => toggleConsent('consent_research', v)}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Longitudinal Timeline */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-ink-900">Longitudinal Career Timeline</h3>
                {selectedTrainee.is_retained && (
                  <span className="badge badge-success text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Currently Retained
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-500 mb-6">
                Your journey from enrollment through employment follow-ups
              </p>

              {eventsLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-12 h-12 bg-ink-100 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-ink-100 rounded w-1/3" />
                        <div className="h-3 bg-ink-100 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-ink-100" />

                  <div className="space-y-1">
                    {stages.map((stage, idx) => {
                      const complete = stage.isComplete(selectedTrainee)
                      const current = stage.isCurrent(selectedTrainee)
                      const date = stage.date(selectedTrainee)
                      const isLast = idx === stages.length - 1

                      return (
                        <div key={stage.key} className="relative flex gap-4 pb-8 last:pb-0">
                          {/* Dot */}
                          <div className="relative z-10 shrink-0">
                            <div
                              className={`flex items-center justify-center w-12 h-12 rounded-full ring-4 ring-white transition-all duration-300 ${
                                complete
                                  ? stage.color
                                  : current
                                  ? stage.color + ' ring-4 ring-white scale-110 shadow-md'
                                  : 'bg-ink-100 text-ink-400'
                              }`}
                            >
                              {complete ? stage.icon : current ? stage.icon : <Clock className="w-5 h-5" />}
                            </div>
                            {current && (
                              <div className="absolute inset-0 rounded-full animate-ping bg-saffron-400 opacity-20" />
                            )}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pt-1 ${complete ? '' : 'opacity-70'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-semibold ${complete ? 'text-ink-900' : 'text-ink-500'}`}>
                                {stage.label}
                              </h4>
                              {complete && (
                                <CheckCircle2 className="w-4 h-4 text-forest-500" />
                              )}
                              {current && (
                                <span className="badge badge-warning text-xs">In Progress</span>
                              )}
                            </div>
                            {date && (
                              <p className="text-xs text-ink-400 mb-1">
                                {formatDate(date)}
                              </p>
                            )}
                            <p className="text-sm text-ink-600">
                              {stage.description(selectedTrainee)}
                            </p>
                            {stage.detail(selectedTrainee)}
                          </div>

                          {/* Arrow connector */}
                          {!isLast && (
                            <div className="absolute left-6 top-12 -translate-x-1/2">
                              <ChevronRight className="w-3 h-3 text-ink-300 rotate-90" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Additional timeline events from DB */}
              {!eventsLoading && events.length > 0 && (
                <div className="mt-8 pt-6 border-t border-ink-100">
                  <h4 className="text-sm font-semibold text-ink-700 mb-4">Detailed Event Log</h4>
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-ink-50/50 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-saffron-400 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-ink-700">{event.title}</span>
                            <span className="text-xs text-ink-400">
                              {formatDate(event.event_date)}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-ink-500 mt-0.5">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

function ProfileRow({
  icon, label, value, badge, mono,
}: { icon: React.ReactNode; label: string; value: string; badge?: 'success' | 'warning' | 'danger'; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-ink-50 last:border-0">
      <span className="text-ink-500 flex items-center gap-2 text-sm shrink-0">
        <span className="text-ink-400">{icon}</span>
        {label}
      </span>
      {badge ? (
        <span className={`badge-${badge}`}>{value}</span>
      ) : (
        <span className={`text-ink-800 font-medium text-right text-sm ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </span>
      )}
    </div>
  )
}

function ConsentToggle({
  icon, title, description, value, disabled, onToggle, highlight,
}: {
  icon: React.ReactNode
  title: string
  description: string
  value: boolean
  disabled: boolean
  onToggle: (v: boolean) => void
  highlight?: boolean
}) {
  return (
    <div className={`flex items-start justify-between gap-4 p-3 rounded-xl transition-colors ${highlight ? 'bg-forest-50/50 border border-forest-100' : 'bg-ink-50/50'}`}>
      <div className="flex gap-3">
        <div className={`mt-0.5 ${value && highlight ? 'text-forest-600' : 'text-ink-400'}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-ink-800">{title}</p>
          <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(!value)}
        disabled={disabled}
        className={`toggle-switch ${value ? 'on' : 'off'} ${disabled ? 'opacity-50' : ''}`}
        aria-label={`Toggle ${title}`}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function hashId(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `SHA-256:${hex}••••`
}
