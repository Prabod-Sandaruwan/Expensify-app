import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getCategorySummary, type CategorySummary } from '../services/ExpenseService';

// Updated COLORS to match your Primary Blue and Accent Green
const COLORS = ['#2563EB', '#22C55E', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

interface ExpenseChartProps {
  isDark: boolean;
  refreshKey?: number;
}

export default function ExpenseChart({ isDark, refreshKey }: ExpenseChartProps) {
  const [data, setData] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategorySummary()
      .then((summaries) => {
        if (!cancelled) setData(summaries);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load summary');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className={`rounded-2xl border p-6 h-[400px] flex items-center justify-center transition-colors ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} animate-pulse`}>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border p-6 transition-colors ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <p className="text-red-400 text-center">{error}</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <motion.div
      className={`rounded-2xl border p-6 space-y-6 transition-colors shadow-sm ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>
        Expenses by Category
      </h2>

      {data.length === 0 ? (
        <p className={`${isDark ? 'text-slate-500' : 'text-slate-400'} text-sm text-center py-12`}>No data available.</p>
      ) : (
        <>
          {/* Donut Chart Section */}
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="total"
                  nameKey="category"
                  stroke="none"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    color: isDark ? '#f1f5f9' : '#111827',
                    boxShadow: isDark ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: isDark ? '#f1f5f9' : '#111827' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
              <span className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* List Breakdown Section */}
          <div className="space-y-4">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.total / total) * 100 : 0;
              const color = COLORS[index % COLORS.length];
              
              return (
                <div key={item.category} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-[#64748B]'}`}>
                        {item.category}
                      </span>
                    </div>
                    <span className={`text-sm font-mono font-semibold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>
                      ${item.total.toFixed(2)}
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
