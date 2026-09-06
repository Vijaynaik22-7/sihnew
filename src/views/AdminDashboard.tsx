import { useEffect, useState, useMemo, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, TrendingUp, AlertTriangle, GraduationCap, MapPin,
  Filter, RotateCcw, ChevronDown, Download,
  MessageCircle, Send, X, CheckCircle2, Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { SkillGap, DashboardMetric, Trainee, WhatsAppSurveyReply } from '../types'

const SAFFRON = '#f06100'
const FOREST = '#16a34a'
const INK = '#57678a'
const AMBER = '#ff9a32'
const RED = '#dc2626'
const BLUE = '#2563eb'
const PURPLE = '#9333ea'
const TEAL = '#0d9488'

const NON_PLACEMENT_COLORS: Record<string, string> = {
  'Low Starting Salary': SAFFRON,
  'Location Constraints': BLUE,
  'Lack of Practical Skills': RED,
  'Dropped Out': INK,
}

const SEVERITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-saffron-100 text-saffron-700',
  Low: 'bg-forest-100 text-forest-700',
}

const OUTCOME_BADGES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  'Employed': { bg: 'bg-forest-100', text: 'text-forest-700', dot: 'bg-forest-500', label: 'Employed' },
  'Self-Employed': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Self-Employed' },
  'Unemployed': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Unemployed' },
}

const FOLLOWUP_BADGES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  'Sent': { bg: 'bg-saffron-100', text: 'text-saffron-700', dot: 'bg-saffron-500', label: 'Message Sent' },
}

interface OutcomeToast {
  id: string
  traineeNumber: number
  traineeName: string
  outcome: string
}

const REPLY_CODE_TO_OUTCOME: Record<string, string> = {
  '1': 'Employed',
  '2': 'Self-Employed',
  '3': 'Unemployed',
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([])
  const [loading, setLoading] = useState(true)
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [outcomeToasts, setOutcomeToasts] = useState<OutcomeToast[]>([])
  const [followUpToast, setFollowUpToast] = useState<{ name: string } | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const toastIdRef = useRef(0)

  const [districtFilter, setDistrictFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')

  useEffect(() => {
    ;(async () => {
      const [mRes, sgRes, tRes] = await Promise.all([
        supabase.from('dashboard_metrics').select('*'),
        supabase.from('skill_gaps').select('*').order('affected_count', { ascending: false }),
        supabase.from('trainees').select('*').order('created_at'),
      ])
      setMetrics(mRes.data ?? [])
      setSkillGaps(sgRes.data ?? [])
      setTrainees(tRes.data ?? [])
      setLoading(false)
    })()

    // Realtime subscription for incoming WhatsApp survey replies
    const channel = supabase
      .channel('whatsapp-survey-replies')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_survey_replies' },
        (payload: { new: WhatsAppSurveyReply }) => {
          const reply = payload.new
          const outcome = REPLY_CODE_TO_OUTCOME[reply.reply_code] ?? reply.outcome
          const timestamp = reply.received_at ?? new Date().toISOString()
          setTrainees((prev) => {
            const trainee = prev.find((t) => t.id === reply.trainee_id)
            if (trainee) {
              const toastId = `toast-${++toastIdRef.current}`
              setOutcomeToasts((toasts) => [
                ...toasts,
                {
                  id: toastId,
                  traineeNumber: trainee.trainee_number ?? 0,
                  traineeName: trainee.full_name,
                  outcome,
                },
              ])
              setTimeout(() => {
                setOutcomeToasts((toasts) => toasts.filter((t) => t.id !== toastId))
              }, 6000)
            }
            return prev.map((t) =>
              t.id === reply.trainee_id
                ? { ...t, employment_outcome: outcome, outcome_updated_at: timestamp }
                : t,
            )
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const dismissToast = (id: string) => {
    setOutcomeToasts((toasts) => toasts.filter((t) => t.id !== id))
  }

  const triggerFollowUp = async (trainee: Trainee) => {
    setSendingId(trainee.id)
    try {
      const phone = (trainee.phone_number ?? '').replace(/[^0-9]/g, '')
      const response = await fetch('https://hook.us2.make.com/qsupvjmkoikn42n9kqmgfv53ojkssc79', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message: `Hello ${trainee.full_name}! Please reply with your daily update:`,
        }),
      })
      if (response.ok) {
        const now = new Date().toISOString()
        setTrainees((prev) =>
          prev.map((t) =>
            t.id === trainee.id
              ? { ...t, follow_up_status: 'Sent', outcome_updated_at: now }
              : t,
          ),
        )
        setFollowUpToast({ name: trainee.full_name })
        setTimeout(() => setFollowUpToast(null), 4000)
      } else {
        alert('Webhook response error: ' + response.status)
      }
    } catch (err) {
      console.error('Trigger error:', err)
      alert('Failed to send trigger: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSendingId(null)
    }
  }

  const sendMockWhatsAppReply = async (traineeId: string, replyCode: string) => {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-survey-webhook`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ trainee_id: traineeId, reply_code: replyCode }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `Request failed (${res.status})`)
    }
  }

  const liveStats = useMemo(() => {
    const totalSurveyed = trainees.filter((t) => t.employment_outcome).length
    const employedCount = trainees.filter((t) => t.employment_outcome === 'Employed').length
    const selfEmployedCount = trainees.filter((t) => t.employment_outcome === 'Self-Employed').length
    const unemployedCount = trainees.filter((t) => t.employment_outcome === 'Unemployed').length
    const activeFollowUps = trainees.filter((t) => !t.employment_outcome).length
    const livePlacementRate = totalSurveyed > 0
      ? Math.round(((employedCount + selfEmployedCount) / totalSurveyed) * 100)
      : 0
    return { totalSurveyed, employedCount, selfEmployedCount, unemployedCount, activeFollowUps, livePlacementRate }
  }, [trainees])

  const districts = useMemo(() => [...new Set(metrics.map((m) => m.district))].sort(), [metrics])
  const providers = useMemo(() => [...new Set(metrics.map((m) => m.training_provider))].sort(), [metrics])
  const courses = useMemo(() => [...new Set(metrics.map((m) => m.course_name))].sort(), [metrics])

  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      if (districtFilter !== 'all' && m.district !== districtFilter) return false
      if (providerFilter !== 'all' && m.training_provider !== providerFilter) return false
      if (courseFilter !== 'all' && m.course_name !== courseFilter) return false
      return true
    })
  }, [metrics, districtFilter, providerFilter, courseFilter])

  const stats = useMemo(() => {
    const totalTrained = filteredMetrics.reduce((s, m) => s + m.total_trained, 0)
    const totalPlaced = filteredMetrics.reduce((s, m) => s + m.total_placed, 0)
    const totalRetained = filteredMetrics.reduce((s, m) => s + m.total_retained, 0)
    const placementRate = totalTrained > 0 ? Math.round((totalPlaced / totalTrained) * 100) : 0
    const retentionRate = totalPlaced > 0 ? Math.round((totalRetained / totalPlaced) * 100) : 0
    const activeGaps = skillGaps.filter((g) => {
      if (districtFilter !== 'all' && g.district !== districtFilter) return false
      return true
    }).length
    return { totalTrained, totalPlaced, totalRetained, placementRate, retentionRate, activeGaps }
  }, [filteredMetrics, skillGaps, districtFilter])

  const districtChartData = useMemo(() => {
    const byDistrict = new Map<string, { district: string; trained: number; placed: number }>()
    for (const m of filteredMetrics) {
      const existing = byDistrict.get(m.district) ?? { district: m.district, trained: 0, placed: 0 }
      existing.trained += m.total_trained
      existing.placed += m.total_placed
      byDistrict.set(m.district, existing)
    }
    return [...byDistrict.values()].sort((a, b) => b.placed - a.placed)
  }, [filteredMetrics])

  const nonPlacementData = useMemo(() => {
    const totals = {
      'Low Starting Salary': 0,
      'Location Constraints': 0,
      'Lack of Practical Skills': 0,
      'Dropped Out': 0,
    } as Record<string, number>
    for (const m of filteredMetrics) {
      totals['Low Starting Salary'] += m.non_placement_low_salary
      totals['Location Constraints'] += m.non_placement_location
      totals['Lack of Practical Skills'] += m.non_placement_lack_skills
      totals['Dropped Out'] += m.non_placement_dropped_out
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: NON_PLACEMENT_COLORS[name] }))
  }, [filteredMetrics])

  const filteredTrainees = useMemo(() => {
    return trainees.filter((t) => {
      if (districtFilter !== 'all' && t.district !== districtFilter) return false
      if (providerFilter !== 'all' && t.training_provider !== providerFilter) return false
      if (courseFilter !== 'all' && t.course_name !== courseFilter) return false
      return true
    })
  }, [trainees, districtFilter, providerFilter, courseFilter])

  const filteredSkillGaps = useMemo(() => {
    if (districtFilter === 'all') return skillGaps
    return skillGaps.filter((g) => g.district === districtFilter)
  }, [skillGaps, districtFilter])

  const resetFilters = () => {
    setDistrictFilter('all')
    setProviderFilter('all')
    setCourseFilter('all')
  }

  const hasActiveFilters = districtFilter !== 'all' || providerFilter !== 'all' || courseFilter !== 'all'

  const exportCSV = () => {
    const headers = ['District', 'Training Provider', 'Course Name', 'Total Trained', 'Total Placed', 'Placement Rate (%)', 'Total Retained', 'Retention Rate (%)', 'Non-Placement: Low Salary', 'Non-Placement: Location', 'Non-Placement: Lack Skills', 'Non-Placement: Dropped Out']

    const rows = filteredMetrics.map((m) => {
      const pr = m.total_trained > 0 ? ((m.total_placed / m.total_trained) * 100).toFixed(1) : '0'
      const rr = m.total_placed > 0 ? ((m.total_retained / m.total_placed) * 100).toFixed(1) : '0'
      return [
        m.district,
        m.training_provider,
        m.course_name,
        m.total_trained.toString(),
        m.total_placed.toString(),
        pr,
        m.total_retained.toString(),
        rr,
        m.non_placement_low_salary.toString(),
        m.non_placement_location.toString(),
        m.non_placement_lack_skills.toString(),
        m.non_placement_dropped_out.toString(),
      ]
    })

    // Add summary row
    rows.push([
      'TOTAL',
      'All Providers',
      'All Courses',
      stats.totalTrained.toString(),
      stats.totalPlaced.toString(),
      stats.placementRate.toString(),
      stats.totalRetained.toString(),
      stats.retentionRate.toString(),
      nonPlacementData.reduce((s, d) => s + (d.name === 'Low Starting Salary' ? d.value : 0), 0).toString(),
      nonPlacementData.reduce((s, d) => s + (d.name === 'Location Constraints' ? d.value : 0), 0).toString(),
      nonPlacementData.reduce((s, d) => s + (d.name === 'Lack of Practical Skills' ? d.value : 0), 0).toString(),
      nonPlacementData.reduce((s, d) => s + (d.name === 'Dropped Out' ? d.value : 0), 0).toString(),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kaushaltrace-analytics-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-ink-100 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-ink-100 rounded-2xl" />
            ))}
          </div>
          <div className="h-20 bg-ink-100 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-ink-100 rounded-2xl" />
            <div className="h-80 bg-ink-100 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Follow-Up Success Toast */}
      {followUpToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-forest-600 text-white rounded-xl shadow-lg px-5 py-3.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Follow-up sent to {followUpToast.name}</span>
          <button
            onClick={() => setFollowUpToast(null)}
            className="text-white/70 hover:text-white transition-colors shrink-0 ml-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Outcome Toasts */}
      {outcomeToasts.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-2xl px-4">
          {outcomeToasts.map((toast) => {
            const badge = OUTCOME_BADGES[toast.outcome] ?? OUTCOME_BADGES['Unemployed']
            return (
              <div
                key={toast.id}
                className="flex items-center gap-3 bg-white rounded-xl shadow-lg border border-ink-100 px-4 py-3 animate-fade-in"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-saffron-50 text-saffron-600 shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    New Outcome Logged via WhatsApp: Trainee #{toast.traineeNumber} updated to {toast.outcome}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">{toast.traineeName}</p>
                </div>
                <span className={`badge ${badge.bg} ${badge.text} shrink-0 flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-ink-400 hover:text-ink-600 transition-colors shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-saffron-600 text-sm font-medium mb-1">
            <MapPin className="w-4 h-4" />
            <span>Government of Maharashtra</span>
          </div>
          <h2 className="text-2xl font-bold text-ink-900">Skilling & Employment Outcome Dashboard</h2>
          <p className="text-ink-500 mt-1">Tracking training-to-employment outcomes across Maharashtra districts</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-white hover:bg-ink-50 text-ink-700 font-medium px-4 py-2.5 rounded-xl border border-ink-200 transition-colors duration-200 shrink-0 text-sm"
        >
          <Download className="w-4 h-4" />
          Export Analytics Report to CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-600 shrink-0">
            <Filter className="w-4 h-4 text-saffron-600" />
            <span>Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <FilterDropdown
              label="District"
              value={districtFilter}
              options={districts}
              onChange={setDistrictFilter}
            />
            <FilterDropdown
              label="Training Provider"
              value={providerFilter}
              options={providers}
              onChange={setProviderFilter}
            />
            <FilterDropdown
              label="Course Name"
              value={courseFilter}
              options={courses}
              onChange={setCourseFilter}
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-saffron-600 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-ink-50 text-xs text-ink-400">
            Showing {filteredMetrics.length} of {metrics.length} data segments · {filteredTrainees.length} of {trainees.length} trainees
            {districtFilter !== 'all' && <span className="ml-2 text-saffron-600">· {districtFilter}</span>}
            {providerFilter !== 'all' && <span className="ml-2 text-saffron-600">· {providerFilter}</span>}
            {courseFilter !== 'all' && <span className="ml-2 text-saffron-600">· {courseFilter}</span>}
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Placement Rate (Live)"
          value={`${liveStats.livePlacementRate}%`}
          sub={`${liveStats.employedCount + liveStats.selfEmployedCount} placed via survey`}
          color="forest"
        />
        <MetricCard
          icon={<MessageCircle className="w-6 h-6" />}
          label="Total Surveyed"
          value={liveStats.totalSurveyed.toLocaleString('en-IN')}
          sub={`${liveStats.employedCount} employed · ${liveStats.selfEmployedCount} self-employed`}
          color="saffron"
        />
        <MetricCard
          icon={<Send className="w-6 h-6" />}
          label="Active Follow-Ups"
          value={liveStats.activeFollowUps.toLocaleString('en-IN')}
          sub="Awaiting WhatsApp response"
          color="amber"
        />
        <MetricCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Active Skill Gaps Identified"
          value={stats.activeGaps.toString()}
          sub="Across all sectors"
          color="blue"
        />
      </div>

      {/* WhatsApp Survey Simulation Panel */}
      <WhatsAppSurveySimulator
        trainees={trainees}
        onSendReply={sendMockWhatsAppReply}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart: Placement by District */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-ink-900 mb-1">Placement Rates by District</h3>
          <p className="text-sm text-ink-500 mb-4">Trained vs Placed trainees across Maharashtra districts</p>
          {districtChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={districtChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebeef3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#7c8aa6' }} />
                <YAxis dataKey="district" type="category" tick={{ fontSize: 12, fill: '#435071' }} width={75} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ebeef3', fontSize: 13 }}
                  formatter={(v: number, name: string) => [v.toLocaleString('en-IN'), name === 'trained' ? 'Trained' : 'Placed']}
                />
                <Legend formatter={(v) => (v === 'trained' ? 'Trained' : 'Placed')} />
                <Bar dataKey="trained" fill={INK} radius={[0, 6, 6, 0]} name="trained" barSize={16} />
                <Bar dataKey="placed" fill={SAFFRON} radius={[0, 6, 6, 0]} name="placed" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart: Live WhatsApp Survey Outcomes */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-ink-900 mb-1">WhatsApp Survey Outcomes (Live)</h3>
          <p className="text-sm text-ink-500 mb-4">Real-time employment outcomes from WhatsApp survey replies</p>
          {liveStats.totalSurveyed === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Employed', value: liveStats.employedCount, color: FOREST },
                    { name: 'Self-Employed', value: liveStats.selfEmployedCount, color: BLUE },
                    { name: 'Unemployed', value: liveStats.unemployedCount, color: RED },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={130}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent! * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {[
                    { name: 'Employed', value: liveStats.employedCount, color: FOREST },
                    { name: 'Self-Employed', value: liveStats.selfEmployedCount, color: BLUE },
                    { name: 'Unemployed', value: liveStats.unemployedCount, color: RED },
                  ].filter((d) => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ebeef3', fontSize: 13 }}
                  formatter={(v: number) => v.toLocaleString('en-IN')}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trainee Roster with Follow-Up Actions */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-saffron-600" />
          <h3 className="text-lg font-semibold text-ink-900">Trainee Roster</h3>
        </div>
        <p className="text-sm text-ink-500 mb-4">
          All tracked trainees. Click "Trigger Follow-Up" to send an automated WhatsApp check-in.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Trainee</th>
                <th className="pb-3 pr-4">District</th>
                <th className="pb-3 pr-4">Course</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Last Updated</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-ink-400">
                    No trainees found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t) => {
                  const badge = t.employment_outcome ? OUTCOME_BADGES[t.employment_outcome] : null
                  return (
                    <tr key={t.id} className="hover:bg-ink-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-ink-400">#{t.trainee_number ?? '—'}</span>
                          <span className="text-sm font-medium text-ink-800">{t.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-ink-600">{t.district}</td>
                      <td className="py-3 pr-4 text-sm text-ink-600">{t.course_name ?? t.skill_sector}</td>
                      <td className="py-3 pr-4">
                        {badge ? (
                          <span className={`badge ${badge.bg} ${badge.text} flex items-center gap-1.5 w-fit`}>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        ) : t.follow_up_status === 'Sent' ? (
                          <span className={`badge ${FOLLOWUP_BADGES['Sent'].bg} ${FOLLOWUP_BADGES['Sent'].text} flex items-center gap-1.5 w-fit`}>
                            <span className={`w-2 h-2 rounded-full ${FOLLOWUP_BADGES['Sent'].dot}`} />
                            {FOLLOWUP_BADGES['Sent'].label}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-ink-500">
                        {t.outcome_updated_at
                          ? new Date(t.outcome_updated_at).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => triggerFollowUp(t)}
                          disabled={sendingId === t.id}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-saffron-50 text-saffron-700 hover:bg-saffron-100 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {sendingId === t.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-saffron-300 border-t-saffron-700 rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              Trigger Follow-Up
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skill Gap Reasons Table */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-saffron-600" />
          <h3 className="text-lg font-semibold text-ink-900">Skill Gap Reasons</h3>
        </div>
        <p className="text-sm text-ink-500 mb-4">
          Key reasons for skill gaps across sectors{districtFilter !== 'all' ? ` in ${districtFilter}` : ''}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Sector</th>
                <th className="pb-3 pr-4">Reason</th>
                <th className="pb-3 pr-4">District</th>
                <th className="pb-3 pr-4 text-right">Affected</th>
                <th className="pb-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filteredSkillGaps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ink-400">
                    No skill gaps found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredSkillGaps.map((gap) => (
                  <tr key={gap.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-ink-400" />
                        <span className="text-sm font-medium text-ink-800">{gap.sector}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-ink-600">{gap.reason}</td>
                    <td className="py-3 pr-4 text-sm text-ink-600">{gap.district}</td>
                    <td className="py-3 pr-4 text-sm font-medium text-ink-800 text-right">
                      {gap.affected_count.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${SEVERITY_COLORS[gap.severity] ?? 'badge-neutral'}`}>
                        {gap.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilterDropdown({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-ink-400 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-ink-200 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-saffron-400 bg-white cursor-pointer transition-colors"
        >
          <option value="all">All {label}s</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
      </div>
    </div>
  )
}

function MetricCard({
  icon, label, value, sub, color,
}: { icon: React.ReactNode; label: string; value: string; sub: string; color: 'saffron' | 'forest' | 'blue' | 'amber' }) {
  const colorMap = {
    saffron: 'bg-saffron-50 text-saffron-600',
    forest: 'bg-forest-50 text-forest-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm text-ink-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-ink-900 mt-1 tabular-nums">{value}</p>
        <p className="text-xs text-ink-400 mt-1">{sub}</p>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[360px] text-ink-400">
      <Filter className="w-8 h-8 mb-2" />
      <p className="text-sm">No data for the selected filters</p>
    </div>
  )
}

function WhatsAppSurveySimulator({
  trainees, onSendReply,
}: {
  trainees: Trainee[]
  onSendReply: (traineeId: string, replyCode: string) => Promise<void>
}) {
  const [selectedTrainee, setSelectedTrainee] = useState('')
  const [replyCode, setReplyCode] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrainee || !replyCode) {
      setError('Select a trainee and a reply code')
      return
    }
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      await onSendReply(selectedTrainee, replyCode)
      const trainee = trainees.find((t) => t.id === selectedTrainee)
      setSuccess(`Reply '${replyCode}' sent for ${trainee?.full_name ?? 'trainee'}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const replyOptions = [
    { code: '1', label: 'Employed', color: 'bg-forest-500', badge: 'bg-forest-100 text-forest-700' },
    { code: '2', label: 'Self-Employed', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
    { code: '3', label: 'Unemployed', color: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  ]

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-5 h-5 text-saffron-600" />
        <h3 className="text-lg font-semibold text-ink-900">WhatsApp Survey Reply Simulator</h3>
      </div>
      <p className="text-sm text-ink-500 mb-4">
        Simulate an incoming WhatsApp survey reply. The trainee's employment outcome badge updates in real time across the dashboard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Select Trainee</label>
            <select
              value={selectedTrainee}
              onChange={(e) => setSelectedTrainee(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-saffron-400 bg-white"
            >
              <option value="">Choose a trainee...</option>
              {trainees.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.trainee_number ?? '—'} — {t.full_name} ({t.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Survey Reply</label>
            <div className="grid grid-cols-3 gap-2">
              {replyOptions.map((opt) => {
                const isActive = replyCode === opt.code
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setReplyCode(opt.code)}
                    className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? `${opt.badge} border-current`
                        : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full ${opt.color} flex items-center justify-center text-white text-sm font-bold`}>
                      {opt.code}
                    </span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <X className="w-4 h-4" /> {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-forest-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Simulate WhatsApp Reply
            </>
          )}
        </button>
      </form>

      {/* Recent outcomes summary */}
      {trainees.some((t) => t.employment_outcome) && (
        <div className="mt-6 pt-4 border-t border-ink-100">
          <h4 className="text-sm font-semibold text-ink-700 mb-3">Recent Outcome Responses</h4>
          <div className="flex flex-wrap gap-2">
            {trainees
              .filter((t) => t.employment_outcome)
              .slice(0, 10)
              .map((t) => {
                const badge = OUTCOME_BADGES[t.employment_outcome!]
                return (
                  <span
                    key={t.id}
                    className={`badge ${badge?.bg ?? 'badge-neutral'} ${badge?.text ?? ''} flex items-center gap-1.5`}
                  >
                    <span className={`w-2 h-2 rounded-full ${badge?.dot ?? 'bg-ink-400'}`} />
                    #{t.trainee_number ?? '—'} {t.full_name.split(' ')[0]} — {badge?.label ?? t.employment_outcome}
                  </span>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
