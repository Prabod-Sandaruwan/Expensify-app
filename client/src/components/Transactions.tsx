import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { getExpenses, createExpense, deleteExpense } from '../services/ExpenseService';
import type { Expense, CreateExpenseRequest } from '../types/expense';

const springPop = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

interface TransactionsProps {
  onUpdate?: () => void;
  isDark: boolean;
  refreshKey?: number;
  variant?: 'full' | 'formOnly' | 'listOnly';
}

export default function Transactions({ onUpdate, isDark, refreshKey, variant = 'full' }: TransactionsProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateExpenseRequest>({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Memoized fetch function so we can call it after adding an expense
  const fetchExpenses = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses(true);
  }, [fetchExpenses, refreshKey]);

  useEffect(() => {
    if (lastAddedId == null) return;
    const t = setTimeout(() => setLastAddedId(null), 1000);
    return () => clearTimeout(t);
  }, [lastAddedId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || form.amount === '' || !form.date || !form.category.trim()) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const amountValue = typeof form.amount === 'string' ? parseFloat(form.amount) : form.amount;
      const saved = await createExpense({
        ...form,
        amount: Number.isNaN(amountValue) ? 0 : amountValue,
      });

      // 1. Update local list state immediately for UI snappiness
      setExpenses((prev) => [saved, ...prev]);
      setLastAddedId(saved.id);

      // 2. Trigger parent total refresh (Fixes the "Total 0" issue)
      if (onUpdate) onUpdate();

      // 3. Reset Form
      setForm({
        description: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        category: '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  }

  function formatAmount(amount: string | number): string {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    return Number.isNaN(n) ? '0.00' : n.toFixed(2);
  }

  if (loading && (variant !== 'formOnly')) {
    return (
      <div className={`${isDark ? 'text-slate-400' : 'text-[#64748B]'} text-center py-12`}>
        <div className="animate-pulse">Loading transactions…</div>
      </div>
    );
  }

  const inputClass = `w-full rounded-lg px-3 py-2 transition-all outline-none border ${
    isDark 
    ? 'bg-slate-900 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-emerald-500' 
    : 'bg-[#F9FAFB] border-slate-200 text-[#111827] placeholder-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]'
  }`;

  const Form = (
    <motion.form
      onSubmit={handleSubmit}
      className={`rounded-2xl border p-6 space-y-4 shadow-sm transition-colors ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>Add transaction</h2>
      {error && <p className="text-red-500 text-sm font-medium" role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>
            Description
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={inputClass}
            placeholder="e.g. Groceries"
          />
        </div>
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>
            Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-[#64748B]'}`}>
            Category
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className={inputClass}
            placeholder="e.g. Food"
          />
        </div>
      </div>
      <motion.button
        type="submit"
        disabled={submitting}
        className={`w-full sm:w-auto px-8 py-3 min-h-[44px] rounded-2xl font-bold transition-all shadow-lg ring-2 ring-offset-2 transform md:hover:scale-105 active:scale-95 ${
          isDark 
          ? 'bg-brand-600 text-white ring-green-500 shadow-brand-500/20 disabled:bg-slate-600' 
          : 'bg-[#2563EB] text-white ring-blue-300 shadow-blue-500/20 disabled:bg-slate-300'
        }`}
        whileHover={!submitting ? { scale: 1.02 } : {}}
        whileTap={!submitting ? { scale: 0.98 } : {}}
      >
        <span className="inline-flex items-center gap-2 justify-center">
          <Plus size={18} />
          {submitting ? 'Adding…' : 'Add Transaction'}
        </span>
      </motion.button>
    </motion.form>
  );

  const List = (
    <div>
      <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>Recent Activity</h2>
      <ul className="space-y-3">
        <AnimatePresence mode="popLayout">
          {expenses.length === 0 ? (
            <motion.li
              key="empty"
              className={`rounded-xl border py-12 text-center text-sm ${
                isDark ? 'bg-slate-800/40 border-slate-700 text-slate-500' : 'bg-white border-slate-100 text-[#64748B]'
              }`}
            >
              No transactions yet.
            </motion.li>
          ) : (
            expenses.map((expense) => (
              <motion.li
                key={expense.id}
                layout
                initial={expense.id === lastAddedId ? { scale: 0.8, opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={expense.id === lastAddedId ? springPop : { duration: 0.2 }}
                className={`group rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 shadow-sm transition-all ${
                  isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-bold truncate ${isDark ? 'text-slate-100' : 'text-[#111827]'}`}>
                    {expense.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-[#64748B]'}`}>
                      {expense.date}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-[#111827]'
                    }`}>
                      {expense.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-mono font-bold tabular-nums text-lg ${isDark ? 'text-emerald-400' : 'text-[#22C55E]'}`}>
                    −{formatAmount(expense.amount)}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await deleteExpense(expense.id);
                        setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
                        if (onUpdate) onUpdate();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to delete expense');
                      }
                    }}
                    className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 px-3 py-1 min-h-[32px] rounded-lg text-xs font-semibold transition-all ${
                      isDark
                        ? 'bg-danger-600 hover:bg-danger-500 text-white'
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                    aria-label="Delete expense"
                  >
                    Delete
                  </button>
                </div>
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ul>
    </div>
  );

  if (variant === 'formOnly') {
    return Form;
  }

  if (variant === 'listOnly') {
    return List;
  }

  return (
    <div className="space-y-8">
      {Form}
      {List}
    </div>
  );
}
