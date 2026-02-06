import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar, ReferenceLine, AreaChart, Area } from 'recharts';
import { getAverageDaily, getAnalyticsTotal, getAnalyticsWeekly, getAnalyticsMonthly } from '../services/ExpenseService';

type AnalysePageProps = {
  isDark: boolean;
  refreshKey?: number;
};

const COLORS = ['#22C55E', '#6366F1', '#EF4444', '#22C55E', '#6366F1', '#EF4444', '#22C55E', '#6366F1'];

export default function AnalysePage({ isDark, refreshKey }: AnalysePageProps) {
  const [avgDaily, setAvgDaily] = useState<{ averageDaily: number; daysElapsed: number }>({ averageDaily: 0, daysElapsed: 0 });
  const [totalByCategory, setTotalByCategory] = useState<{ category: string; total: number }[]>([]);
  const [weekly, setWeekly] = useState<{ date: string; total: number }[]>([]);
  const [monthly, setMonthly] = useState<{ label: string; total: number }[]>([]);
  const [highestDay, setHighestDay] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      const [avg, totalCat, weeklyData, monthlyData] = await Promise.all([
        getAverageDaily(),
        getAnalyticsTotal(),
        getAnalyticsWeekly(),
        getAnalyticsMonthly()
      ]);
      if (cancelled) return;
      setAvgDaily(avg);
      setTotalByCategory(totalCat);
      setWeekly(weeklyData.map(d => ({ date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), total: d.total })));
      const hd = weeklyData.reduce((m, d) => Math.max(m, d.total), 0);
      setHighestDay(hd);
      setMonthly(monthlyData.map(m => ({ label: `${new Date(m.year, m.month - 1, 1).toLocaleString(undefined, { month: 'short' })} ${m.year}`, total: m.total })));
    }
    fetchAll().catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

 

  return (
    <div className="space-y-8">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>Insights</h2>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>Average Daily Spending</span>
            <span className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>${avgDaily.averageDaily.toFixed(2)}</span>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-[#64748B]'}`}>Based on {avgDaily.daysElapsed} days</p>
        </div>
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>Highest Spending Day</span>
            <span className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>${highestDay.toFixed(2)}</span>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-[#64748B]'}`}>In the last 7 days</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>All-time by Category</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={totalByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} stroke="none">
                  {totalByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: isDark ? '#f1f5f9' : '#111827'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>7-Day Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" stroke={isDark ? '#94a3b8' : '#64748B'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748B'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: isDark ? '#f1f5f9' : '#111827'
                  }}
                />
              <ReferenceLine y={avgDaily.averageDaily} stroke="#6366F1" strokeDasharray="4 4" />
              <Bar dataKey="total" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>6-Month Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
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
              <Area type="monotone" dataKey="total" stroke="#6366F1" fill="#93C5FD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
