import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Building2, Users, BadgeCheck, ShieldCheck, LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './views/AdminDashboard'
import TraineePortal from './views/TraineePortal'
import EmployerVerification from './views/EmployerVerification'

const navItems = [
  { to: '/', label: 'Admin Dashboard', icon: Building2, end: true },
  { to: '/trainee', label: 'Trainee Portal', icon: Users, end: false },
  { to: '/employer', label: 'Employer Verification', icon: BadgeCheck, end: false },
]

function AdminGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-saffron-300 border-t-saffron-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <AdminLogin />
  }

  return <>{children}</>
}

function AppShell() {
  const location = useLocation()
  const isEmployerVerifyPage = location.pathname.startsWith('/employer/verify')
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      {!isEmployerVerifyPage && (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-ink-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-saffron-600 text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-ink-900 leading-none">KaushalTrace</h1>
                  <p className="text-xs text-ink-500 leading-none mt-0.5">Maharashtra</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-saffron-50 text-saffron-700'
                          : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </NavLink>
                ))}
                {session && (
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium text-ink-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<AdminGate><AdminDashboard /></AdminGate>} />
          <Route path="/trainee" element={<TraineePortal />} />
          <Route path="/employer" element={<EmployerVerification />} />
          <Route path="/employer/verify/:token" element={<EmployerVerification />} />
        </Routes>
      </main>
      {!isEmployerVerifyPage && (
        <footer className="border-t border-ink-100 bg-white py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-ink-400">
            KaushalTrace Maharashtra &middot; Government Skilling & Employment Outcome Tracker
          </div>
        </footer>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
