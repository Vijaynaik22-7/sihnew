import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BadgeCheck, ShieldCheck, Link2, CheckCircle2, XCircle, Clock,
  User, Building2, Briefcase, IndianRupee, Calendar, AlertCircle, Copy, Mail,
  Hash, TrendingUp, FileText, ChevronDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Trainee, EmployerVerification } from '../types'

type EmploymentStatus = 'Full-time' | 'Part-time' | 'Left Job' | ''

export default function EmployerVerificationPage() {
  const { token } = useParams<{ token?: string }>()
  const navigate = useNavigate()
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [verifications, setVerifications] = useState<EmployerVerification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [tRes, vRes] = await Promise.all([
        supabase.from('trainees').select('*').eq('placement_status', 'Placed').order('created_at'),
        supabase.from('employer_verifications').select('*').order('created_at', { ascending: false }),
      ])
      setTrainees(tRes.data ?? [])
      setVerifications(vRes.data ?? [])
      setLoading(false)
    })()
  }, [])

  if (token) {
    return <VerificationForm token={token} trainees={trainees} verifications={verifications} loading={loading} />
  }

  return <VerificationLanding trainees={trainees} verifications={verifications} loading={loading} onNavigate={navigate} />
}

function VerificationLanding({
  trainees, verifications, loading, onNavigate,
}: {
  trainees: Trainee[]
  verifications: EmployerVerification[]
  loading: boolean
  onNavigate: (path: string) => void
}) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const copyLink = (tok: string) => {
    const url = `${window.location.origin}/employer/verify/${tok}`
    navigator.clipboard.writeText(url)
    setCopiedToken(tok)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-ink-100 rounded w-1/3" />
          <div className="h-48 bg-ink-100 rounded-2xl" />
          <div className="h-48 bg-ink-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  const pendingCount = verifications.filter((v) => v.status === 'Pending').length
  const verifiedCount = verifications.filter((v) => v.status === 'Verified').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-saffron-600 text-sm font-medium mb-1">
          <BadgeCheck className="w-4 h-4" />
          <span>Employer Verification Portal</span>
        </div>
        <h2 className="text-2xl font-bold text-ink-900">Verify Employee Retention & Wages</h2>
        <p className="text-ink-500 mt-1">
          Generate secure tokenized links for employers to confirm trainee employment status. Each link is unique and expires automatically.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-saffron-50 text-saffron-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">{pendingCount}</p>
              <p className="text-xs text-ink-500">Pending Verification</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest-50 text-forest-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">{verifiedCount}</p>
              <p className="text-xs text-ink-500">Verified</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">{verifications.length}</p>
              <p className="text-xs text-ink-500">Total Links Sent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Links Table */}
      <div className="card p-6 mb-8">
        <h3 className="font-semibold text-ink-900 mb-4">Active Verification Links</h3>
        {verifications.length === 0 ? (
          <p className="text-sm text-ink-400 text-center py-8">No verification links generated yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Trainee</th>
                  <th className="pb-3 pr-4">Employer</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Expires</th>
                  <th className="pb-3">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {verifications.map((v) => {
                  const trainee = trainees.find((t) => t.id === v.trainee_id)
                  return (
                    <tr key={v.id} className="hover:bg-ink-50/50 transition-colors">
                      <td className="py-3 pr-4 text-sm font-medium text-ink-800">
                        {trainee?.full_name ?? 'Unknown'}
                      </td>
                      <td className="py-3 pr-4 text-sm text-ink-600">{v.employer_name}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3 pr-4 text-sm text-ink-500">
                        {new Date(v.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyLink(v.token)}
                            className="flex items-center gap-1.5 text-xs font-medium text-saffron-600 hover:text-saffron-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedToken === v.token ? 'Copied!' : 'Copy Link'}
                          </button>
                          <button
                            onClick={() => onNavigate(`/employer/verify/${v.token}`)}
                            className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate New Link */}
      <GenerateLinkForm trainees={trainees} onCreated={() => window.location.reload()} />
    </div>
  )
}

function GenerateLinkForm({ trainees, onCreated }: { trainees: Trainee[]; onCreated: () => void }) {
  const [selectedTrainee, setSelectedTrainee] = useState('')
  const [employerName, setEmployerName] = useState('')
  const [employerEmail, setEmployerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrainee || !employerName || !employerEmail) {
      setError('Please fill in all fields')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('employer_verifications').insert({
      trainee_id: selectedTrainee,
      employer_name: employerName,
      employer_email: employerEmail,
      status: 'Pending',
    })
    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }
    onCreated()
  }

  const eligibleTrainees = trainees.filter((t) => t.consent_employer_verification)

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-saffron-600" />
        <h3 className="font-semibold text-ink-900">Generate New Verification Link</h3>
      </div>
      <p className="text-sm text-ink-500 mb-4">
        Only trainees who have granted employer verification consent are available for selection.
      </p>
      {eligibleTrainees.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-ink-400 py-4">
          <AlertCircle className="w-4 h-4" />
          No trainees have granted employer verification consent.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Select Trainee</label>
            <select
              value={selectedTrainee}
              onChange={(e) => setSelectedTrainee(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-saffron-400 bg-white"
            >
              <option value="">Choose a trainee...</option>
              {eligibleTrainees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} — {t.skill_sector} ({t.district})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Employer Name</label>
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="e.g., Tata Motors"
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-saffron-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Employer Email</label>
              <input
                type="email"
                value={employerEmail}
                onChange={(e) => setEmployerEmail(e.target.value)}
                placeholder="hr@company.com"
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-saffron-400"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
            {submitting ? 'Generating...' : 'Generate Tokenized Link'}
          </button>
        </form>
      )}
    </div>
  )
}

function VerificationForm({
  token, trainees, verifications, loading,
}: {
  token: string
  trainees: Trainee[]
  verifications: EmployerVerification[]
  loading: boolean
}) {
  const verification = verifications.find((v) => v.token === token)
  const trainee = trainees.find((t) => t.id === verification?.trainee_id)

  const [employeeId, setEmployeeId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('')
  const [salary, setSalary] = useState('')
  const [retentionMonths, setRetentionMonths] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (verification) {
      setCompanyName(verification.employer_name ?? verification.company_name ?? '')
      if (verification.employment_status) setEmploymentStatus(verification.employment_status as EmploymentStatus)
      if (verification.verified_wage != null) setSalary(verification.verified_wage.toString())
      if (verification.retention_months != null) setRetentionMonths(verification.retention_months.toString())
    }
    if (trainee) {
      setEmployeeId(trainee.id.substring(0, 8).toUpperCase())
    }
  }, [verification, trainee])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="animate-pulse space-y-4">
          <div className="w-16 h-16 bg-ink-200 rounded-full mx-auto" />
          <div className="h-6 bg-ink-200 rounded w-48 mx-auto" />
        </div>
      </div>
    )
  }

  if (!verification || !trainee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Invalid Verification Link</h2>
          <p className="text-sm text-ink-500">
            This verification link could not be found. It may have expired or been revoked.
            Please contact the KaushalTrace administrator for a new link.
          </p>
        </div>
      </div>
    )
  }

  const isExpired = new Date(verification.expires_at) < new Date()
  const isAlreadyVerified = verification.status === 'Verified'

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-saffron-100 text-saffron-600 mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Link Expired</h2>
          <p className="text-sm text-ink-500">
            This verification link expired on{' '}
            {new Date(verification.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
            Please request a new link from the KaushalTrace administrator.
          </p>
        </div>
      </div>
    )
  }

  if (submitted || isAlreadyVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4 py-8">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-forest-100 text-forest-600 mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Verification Complete</h2>
          <p className="text-sm text-ink-500 mb-4">
            Thank you for confirming the employment details for{' '}
            <span className="font-medium text-ink-700">{trainee.full_name}</span>.
            Your response has been recorded in the KaushalTrace system.
          </p>
          <div className="bg-ink-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Employee ID</span>
              <span className="font-mono text-xs font-medium text-ink-800">{employeeId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Company</span>
              <span className="font-medium text-ink-800">{companyName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Employment Status</span>
              <span className="font-medium text-ink-800">{employmentStatus}</span>
            </div>
            {salary && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Confirmed Salary</span>
                <span className="font-medium text-ink-800">₹{parseInt(salary).toLocaleString('en-IN')}/month</span>
              </div>
            )}
            {retentionMonths && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Retention</span>
                <span className="font-medium text-ink-800">{retentionMonths} months</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Verified On</span>
              <span className="font-medium text-ink-800">
                {verification.verified_at
                  ? new Date(verification.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Just now'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employmentStatus) {
      setError('Please select an employment status')
      return
    }
    if (!companyName.trim()) {
      setError('Please enter the company name')
      return
    }
    setSubmitting(true)
    setError(null)

    const isRetained = employmentStatus !== 'Left Job'

    const { error: updateError } = await supabase
      .from('employer_verifications')
      .update({
        status: 'Verified',
        employment_status: employmentStatus,
        company_name: companyName,
        verified_wage: salary ? parseFloat(salary) : null,
        retention_months: retentionMonths ? parseInt(retentionMonths) : null,
        is_retained: isRetained,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id)

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    await supabase
      .from('trainees')
      .update({
        is_retained: isRetained,
        current_wage: salary ? parseFloat(salary) : trainee.current_wage,
        retention_months: retentionMonths ? parseInt(retentionMonths) : trainee.retention_months,
        last_verified_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', trainee.id)

    setToast('Verification submitted successfully!')
    setTimeout(() => {
      setSubmitted(true)
      setSubmitting(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-ink-50 py-6 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-saffron-500 to-saffron-600 text-white mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-ink-900">KaushalTrace Maharashtra</h1>
          <p className="text-sm text-ink-500">Employer Verification Portal</p>
        </div>

        {/* Employee Info Card */}
        <div className="card p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-ink-400" />
            <h3 className="text-sm font-semibold text-ink-900">Employee Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailItem icon={<User className="w-4 h-4" />} label="Name" value={trainee.full_name} />
            <DetailItem icon={<Building2 className="w-4 h-4" />} label="Sector" value={trainee.skill_sector} />
            <DetailItem icon={<Briefcase className="w-4 h-4" />} label="Role" value={trainee.job_role ?? 'N/A'} />
            <DetailItem icon={<Calendar className="w-4 h-4" />} label="Placement Date" value={trainee.placement_date ? formatDate(trainee.placement_date) : 'N/A'} />
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="w-5 h-5 text-saffron-600" />
            <h3 className="font-semibold text-ink-900">Employment Verification</h3>
          </div>
          <p className="text-sm text-ink-500 mb-6">
            Please verify the employment details below. All fields are required for a complete verification.
          </p>

          <div className="space-y-5">
            {/* Employee ID */}
            <FormField label="Employee ID" icon={<Hash className="w-4 h-4" />}>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Employee ID"
                className="form-input pl-11"
              />
            </FormField>

            {/* Company Name */}
            <FormField label="Company Name" icon={<Building2 className="w-4 h-4" />}>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Tata Motors"
                className="form-input pl-11"
              />
            </FormField>

            {/* Employment Status */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Current Employment Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['Full-time', 'Part-time', 'Left Job'] as const).map((status) => {
                  const isActive = employmentStatus === status
                  const isLeft = status === 'Left Job'
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEmploymentStatus(status)}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? isLeft
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-forest-500 bg-forest-50 text-forest-700'
                          : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300'
                      }`}
                    >
                      {isLeft ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {status}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Salary + Retention */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Current Monthly Salary (INR)" icon={<IndianRupee className="w-4 h-4" />}>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g., 25000"
                  className="form-input pl-11"
                />
              </FormField>

              <FormField label="Job Retention Status (Months)" icon={<TrendingUp className="w-4 h-4" />}>
                <input
                  type="number"
                  value={retentionMonths}
                  onChange={(e) => setRetentionMonths(e.target.value)}
                  placeholder="e.g., 6"
                  className="form-input pl-11"
                  min="0"
                />
              </FormField>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-4">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}

          {/* Verify & Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white font-semibold px-5 py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <BadgeCheck className="w-5 h-5" />
                Verify &amp; Submit
              </>
            )}
          </button>

          <p className="text-xs text-ink-400 text-center mt-4">
            By submitting, you confirm that the information provided is accurate to the best of your knowledge.
          </p>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-forest-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  )
}

function FormField({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">{icon}</div>
        {children}
      </div>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-50/50">
      <span className="text-ink-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-sm font-medium text-ink-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Verified') return <span className="badge-success">Verified</span>
  if (status === 'Rejected') return <span className="badge-danger">Rejected</span>
  return <span className="badge-warning">Pending</span>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
