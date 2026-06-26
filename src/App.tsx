import { useMemo, useState } from 'react';
import { project, generatePeriodicIncrements, type EngineInputs } from './engine';
import { DEFAULT_EXPENSES, DEFAULT_SAVINGS, type SavingsInputs } from './defaults';
import type { ExpenseItem } from './engine';
import { usePersistedState, useDebounced } from './usePersistedState';
import { SavingsTab } from './components/SavingsTab';
import { ExpensesTab } from './components/ExpensesTab';
import { OutlookTab } from './components/OutlookTab';

type TabKey = 'savings' | 'expenses' | 'outlook';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'savings', label: 'Savings' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'outlook', label: 'Outlook' },
];

// The projection clock comes from the device date so it always rolls forward.
const NOW = new Date();
const START_YEAR = NOW.getFullYear();
const START_MONTH = NOW.getMonth() + 1; // 1–12

export default function App() {
  const [tab, setTab] = useState<TabKey>('savings');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const [savings, setSavings] = usePersistedState<SavingsInputs>('rc-savings', DEFAULT_SAVINGS);
  const [expenses, setExpenses] = usePersistedState<ExpenseItem[]>('rc-expenses', DEFAULT_EXPENSES);

  // Debounce so rapid typing doesn't recompute the whole table on every keystroke.
  const dSavings = useDebounced(savings, 250);
  const dExpenses = useDebounced(expenses, 250);

  const result = useMemo(() => {
    // In periodic mode the increments are derived from the retirement plan;
    // otherwise the user's explicit list is used.
    const salaryIncrements =
      dSavings.incrementMode === 'periodic'
        ? generatePeriodicIncrements(
            dSavings.currentAge,
            dSavings.retirementAge,
            START_YEAR,
            dSavings.periodicIntervalYears,
            dSavings.periodicPercent,
          )
        : dSavings.salaryIncrements;

    const inputs: EngineInputs = {
      ...dSavings,
      salaryIncrements,
      startYear: START_YEAR,
      startMonth: START_MONTH,
      expenses: dExpenses,
    };
    return project(inputs);
  }, [dSavings, dExpenses]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('rc-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  const resetAll = () => {
    if (confirm('Reset all inputs to the Malaysian defaults?')) {
      setSavings(DEFAULT_SAVINGS);
      setExpenses(DEFAULT_EXPENSES);
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-3 pb-10 sm:px-5">
      <header className="sticky top-0 z-10 -mx-3 mb-3 border-b border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold sm:text-lg">Retirement Calculator for Malaysian</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">EPF + personal savings projection · all amounts in RM</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              Reset
            </button>
            <button onClick={toggleTheme} aria-label="Toggle dark mode" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-700 dark:hover:bg-slate-800">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <nav className="mt-3 flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/70">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        {tab === 'savings' && <SavingsTab savings={savings} setSavings={setSavings} result={result} startYear={START_YEAR} />}
        {tab === 'expenses' && <ExpensesTab expenses={expenses} setExpenses={setExpenses} startYear={START_YEAR} />}
        {tab === 'outlook' && <OutlookTab result={result} savings={savings} />}
      </main>

      <Disclaimer />
    </div>
  );
}

function Disclaimer() {
  return (
    <footer className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <strong>Assumptions &amp; disclaimer.</strong> This tool is an educational projection only and is{' '}
      <strong>not licensed financial advice</strong>. Figures assume the EPF dividend rate stays constant, but real
      EPF dividends vary every year and are not guaranteed. Returns, inflation, salary increments and expenses are
      simplified estimates. The retirement phase spends down personal savings first (it earns less) before drawing on
      EPF. Consult a licensed financial planner before making decisions.
    </footer>
  );
}
