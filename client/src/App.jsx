import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import ExpenseChart from './components/ExpenseChart'
import Transactions from './components/Transactions'
import Login from './components/Login'
import Register from './components/Register'
import { authService } from './services/authService'
import { resetAllExpenses, getBudget, updateBudget, getAnalyticsWeekly, getAnalyticsMonthly, getCategorySummary, getExpenses, createExpense } from './services/ExpenseService'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import AnalysePage from './components/AnalysePage.tsx'
import { LayoutDashboard, BarChart3, User as UserIcon, Sun, Moon, Settings, Plus, Menu } from 'lucide-react'

const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:8080'

export default function App() {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = authService.getToken()
    const savedUser = authService.getUser()
    return !!(token && savedUser)
  })
  const [showRegister, setShowRegister] = useState(false)
  const [user, setUser] = useState(() => authService.getUser())
  const [total, setTotal] = useState(0)
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    return stored ? stored === 'dark' : true
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [budget, setBudget] = useState({ monthlyLimit: 0, monthTotal: 0, remaining: 0, percent: 0 })
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsTab, setSettingsTab] = useState('data')
  const [showAddModal, setShowAddModal] = useState(false)
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const [topCategory, setTopCategory] = useState('')
  const [monthlyOverview, setMonthlyOverview] = useState([])
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchTotal()
      fetchBudget()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDark])

  useEffect(() => {
    async function verifySession() {
      const token = authService.getToken()
      if (!token) {
        setIsAuthenticated(false)
        setUser(null)
        setBooting(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          authService.saveUser({ email: data.email, name: data.name, userId: data.userId })
          setIsAuthenticated(true)
          setUser(authService.getUser())
          await Promise.all([fetchTotal(), fetchBudget()])
        } else {
          authService.logout()
          setIsAuthenticated(false)
          setUser(null)
        }
      } catch {
        authService.logout()
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        setBooting(false)
      }
    }
    verifySession()
  }, [])

  useEffect(() => {
    const base = 'Expensify'
    let title = base
    if (booting) {
      title = base
    } else if (!isAuthenticated) {
      title = `${base} - Login`
    } else {
      title = location.pathname === '/analyse' ? `${base} - Analyse` : `${base} - Dashboard`
    }
    document.title = title
  }, [booting, isAuthenticated, location.pathname])

  async function fetchTotal() {
    const res = await fetch(`${API_BASE}/api/expenses/total`, {
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    if (res.ok) {
      const data = await res.json();
      setTotal(data.total);
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      try {
        const [weekly, monthly, cats] = await Promise.all([
          getAnalyticsWeekly(),
          getAnalyticsMonthly(),
          getCategorySummary()
        ])
        if (cancelled) return
        const wSum = weekly.reduce((s, d) => s + d.total, 0)
        setWeeklyTotal(wSum)
        setMonthlyOverview(monthly.map(m => ({ label: `${new Date(m.year, m.month - 1, 1).toLocaleString(undefined, { month: 'short' })} ${m.year}`, total: m.total })))
        const top = cats.slice().sort((a, b) => b.total - a.total)[0]
        setTopCategory(top ? top.category : '')
      } catch {}
    }
    fetchStats()
    return () => { cancelled = true }
  }, [refreshKey])

  function handleLoginSuccess() {
    setIsAuthenticated(true)
    setUser(authService.getUser())
    fetchTotal()
    fetchBudget()
  }

  function handleLogout() {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    setTotal(0)
  }

  async function handleResetAll() {
    const confirmed = window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')
    if (!confirmed) return
    try {
      await resetAllExpenses()
      setTotal(0)
      await fetchBudget()
      setRefreshKey((k) => k + 1)
    } catch (e) {
      // Optional: surface error UI, keeping minimal as requested
      console.error(e)
    }
  }

  function handleToggleTheme() {
    const next = !isDark
    setIsDark(next)
    const root = document.documentElement
    if (next) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  async function handleSaveBudget() {
    try {
      const value = parseFloat(budgetInput || '0')
      await updateBudget(Number.isNaN(value) ? 0 : value)
      setShowBudgetModal(false)
      setBudgetInput('')
      await fetchBudget()
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchBudget() {
    try {
      const b = await getBudget()
      setBudget(b)
    } catch (e) {
      // silently ignore for now
    }
  }

  async function handleExportCSV() {
    if (exporting) return
    setExporting(true)
    try {
      const expenses = await getExpenses()
      const header = ['Date', 'Category', 'Description', 'Amount', 'Type']
      const rows = expenses.map((e) => {
        const date = new Date(e.date).toISOString().slice(0, 10)
        const amount = (typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount)
        const amtStr = Number.isNaN(amount) ? '0.00' : amount.toFixed(2)
        const type = 'Expense'
        function esc(v) {
          const s = String(v ?? '')
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }
        return [esc(date), esc(e.category), esc(e.description), esc(amtStr), esc(type)].join(',')
      })
      const csv = [header.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `Expense_Report_${today}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleImportCSV(file) {
    if (!file || importing) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
      const dataLines = lines.slice(1)
      for (const line of dataLines) {
        const cols = []
        let cur = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"' ) {
            if (inQuotes && line[i+1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
          } else if (ch === ',' && !inQuotes) {
            cols.push(cur); cur = ''
          } else {
            cur += ch
          }
        }
        cols.push(cur)
        const [date, category, description, amountStr] = cols
        const amount = parseFloat(amountStr)
        await createExpense({
          description: description || '',
          amount: Number.isNaN(amount) ? 0 : amount,
          date: date || new Date().toISOString().slice(0,10),
          category: category || ''
        })
      }
      await fetchTotal()
      await fetchBudget()
      setRefreshKey(k => k + 1)
    } finally {
      setImporting(false)
    }
  }

  if (booting) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F9FAFB] text-[#111827]'}`}>
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onRegisterSuccess={handleLoginSuccess} onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setShowRegister(true)} />
    )
  }

  return (
    <div className={`h-screen transition-colors duration-500 font-sans ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F9FAFB] text-[#111827]'}`}>
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 w-64 ${isDark ? 'bg-slate-900/80 border-r border-slate-800' : 'bg-white border-r border-slate-200'} flex-col`}>
        <div className="px-5 py-4">
          <div className="text-xl font-extrabold tracking-tight">Expensify</div>
        </div>
        <nav className="px-3 py-2 space-y-1">
          <div className={`px-3 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>Navigation</div>
          <NavLink to="/" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? (isDark ? 'bg-slate-800' : 'bg-slate-100') : (isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50')} transition-all`}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/analyse" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? (isDark ? 'bg-slate-800' : 'bg-slate-100') : (isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50')} transition-all`}>
            <BarChart3 size={16} />
            Analyse
          </NavLink>
        </nav>
        <div className="mt-auto px-3 py-4 space-y-2">
          <div className={`px-3 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>System</div>
          <button onClick={() => setShowSettingsModal(true)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
            <Settings size={16} />
            Settings
          </button>
          <button onClick={handleToggleTheme} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            Theme
          </button>
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <UserIcon size={16} />
              <span className="text-sm">{user?.name || 'User'}</span>
            </div>
            <button onClick={handleLogout} className={`px-3 py-1 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>Logout</button>
          </div>
        </div>
      </aside>
      <main className="lg:ml-64 ml-0 h-full overflow-y-auto">
        <div className="lg:hidden sticky top-0 z-40 flex items-center h-12 px-4">
          <button
            onClick={() => setShowMobileSidebar(true)}
            aria-label="Open Menu"
            className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-[#111827] border border-slate-200'}`}
          >
            <Menu size={18} />
          </button>
        </div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>Total Balance</div>
                      <div className="text-2xl font-extrabold tabular-nums">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`flex items-center justify-between`}>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>Monthly Budget</span>
                        <span className="text-xs">${budget.monthTotal.toFixed(2)} / ${budget.monthlyLimit.toFixed(2)}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className={`h-full ${budget.percent > 100 ? 'bg-danger-500' : budget.percent > 80 ? 'bg-yellow-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, budget.percent)}%` }} />
                      </div>
                    </div>
                    <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>This Week</div>
                      <div className="text-2xl font-extrabold tabular-nums">${weeklyTotal.toFixed(2)}</div>
                    </div>
                    <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>Top Category</div>
                      <div className="text-lg font-bold">{topCategory || '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>Spending Overview</div>
                        <div className="h-80 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyOverview}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                              <XAxis dataKey="label" stroke={isDark ? '#94a3b8' : '#64748B'} />
                              <YAxis stroke={isDark ? '#94a3b8' : '#64748B'} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                                  borderRadius: '12px',
                                  color: isDark ? '#f1f5f9' : '#111827'
                                }}
                              />
                              <ReferenceLine y={budget.monthlyLimit || 0} stroke="#6366F1" strokeDasharray="4 4" />
                              <Area type="monotone" dataKey="total" stroke="#6366F1" fill={isDark ? '#4f46e5' : '#c7d2fe'} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Transactions onUpdate={async () => { await fetchTotal(); await fetchBudget(); setRefreshKey((k) => k + 1); }} isDark={isDark} refreshKey={refreshKey} variant="formOnly" />
                      <button
                        onClick={() => setShowBudgetModal(true)}
                        className={`mt-4 w-full px-4 py-2 min-h-[44px] rounded-2xl font-semibold border-2 transition-transform transform md:hover:scale-105 active:scale-95 ${
                          isDark ? 'border-brand-500 text-brand-400' : 'border-brand-600 text-brand-600'
                        }`}
                      >
                        Set Budget
                      </button>
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-6 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <Transactions onUpdate={async () => { await fetchTotal(); await fetchBudget(); setRefreshKey((k) => k + 1); }} isDark={isDark} refreshKey={refreshKey} variant="listOnly" />
                  </div>
                </div>
              }
            />
            <Route path="/analyse" element={<div className="space-y-6"><AnalysePage isDark={isDark} refreshKey={refreshKey} /></div>} />
          </Routes>
        </div>
      </main>

      {showMobileSidebar && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileSidebar(false)}
          />
          <aside className={`absolute inset-y-0 left-0 w-64 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'} p-4 flex flex-col`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold">Menu</div>
              <button onClick={() => setShowMobileSidebar(false)} className="p-2">✕</button>
            </div>
            <nav className="space-y-2">
              <NavLink to="/" end onClick={() => setShowMobileSidebar(false)} className="block px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Dashboard</NavLink>
              <NavLink to="/analyse" onClick={() => setShowMobileSidebar(false)} className="block px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Analyse</NavLink>
            </nav>
            <div className="mt-auto space-y-2">
              <button onClick={() => { setShowSettingsModal(true); setShowMobileSidebar(false); }} className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-[#111827]'}`}>Settings</button>
              <button onClick={handleToggleTheme} className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-[#111827]'}`}>Theme</button>
              <button onClick={() => { handleLogout(); setShowMobileSidebar(false); }} className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-[#111827]'}`}>Logout</button>
            </div>
          </aside>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 md:hidden">
        <div className={`mx-4 mb-4 rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="grid grid-cols-4 text-center">
            <NavLink to="/" end className="py-3">
              <LayoutDashboard size={20} />
            </NavLink>
            <NavLink to="/analyse" className="py-3">
              <BarChart3 size={20} />
            </NavLink>
            <button onClick={() => setShowAddModal(true)} className="py-3">
              <Plus size={20} />
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="py-3">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        className={`md:hidden fixed bottom-20 right-6 z-50 px-5 py-4 min-h-[44px] rounded-full shadow-lg ring-2 ring-offset-2 transform md:hover:scale-105 active:scale-95 ${
          isDark ? 'bg-brand-600 text-white ring-brand-300 shadow-brand-500/20' : 'bg-[#2563EB] text-white ring-blue-300 shadow-blue-500/20'
        }`}
        aria-label="Add Transaction"
        title="Add Transaction"
      >
        <Plus size={20} />
      </button>

      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-sm rounded-2xl border p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>Set Monthly Budget</h3>
            <input
              type="number"
              step="0.01"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 mb-4 outline-none border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-[#F9FAFB] border-slate-200 text-[#111827]'}`}
              placeholder="Enter monthly budget amount"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowBudgetModal(false); setBudgetInput(''); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white border border-slate-200'}`}>Cancel</button>
              <button onClick={handleSaveBudget} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-brand-600 text-white' : 'bg-[#2563EB] text-white'}`}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Transactions onUpdate={async () => { await fetchTotal(); await fetchBudget(); setRefreshKey((k) => k + 1); setShowAddModal(false); }} isDark={isDark} refreshKey={refreshKey} variant="formOnly" />
            <div className="flex justify-end">
              <button onClick={() => setShowAddModal(false)} className={`mt-3 px-4 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-[#111827]'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSettingsTab('data')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${settingsTab === 'data' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100') : (isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-white border border-slate-200')}`}>Data</button>
              <button onClick={() => setSettingsTab('danger')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${settingsTab === 'danger' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100') : (isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-white border border-slate-200')}`}>Danger Zone</button>
            </div>
            {settingsTab === 'data' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button onClick={handleExportCSV} disabled={exporting} className={`px-4 py-2 rounded-xl font-semibold ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white border border-slate-200'} ${exporting ? 'opacity-60' : ''}`}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
                  <label className={`px-4 py-2 rounded-xl font-semibold cursor-pointer ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white border border-slate-200'}`}>
                    Import CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleImportCSV(e.target.files?.[0])} />
                  </label>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>CSV columns: Date, Category, Description, Amount, Type</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-sm font-semibold mb-2">Reset All Data</div>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>Deletes all transactions. This cannot be undone.</p>
                  <button onClick={handleResetAll} className={`px-4 py-2 rounded-xl font-semibold ${isDark ? 'bg-danger-600 text-white' : 'bg-red-100 text-red-700'}`}>Delete Everything</button>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowSettingsModal(false)} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-[#111827]'}`}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
