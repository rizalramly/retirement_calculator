import type { ExpenseItem } from '../engine';
import { expenseEndYear } from '../engine';
import { EXPENSE_GROUPS } from '../defaults';
import { formatRM } from '../format';
import { MetricCard, Section } from './ui';

export function ExpensesTab({
  expenses,
  setExpenses,
  startYear,
}: {
  expenses: ExpenseItem[];
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
  startYear: number;
}) {
  const update = (id: string, field: 'monthly' | 'yearsRemaining', value: number | null) =>
    setExpenses((items) => items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));

  const totalMonthly = expenses.reduce((s, e) => s + e.monthly, 0);
  const ongoingMonthly = expenses.filter((e) => e.yearsRemaining == null).reduce((s, e) => s + e.monthly, 0);
  const limitedMonthly = expenses.filter((e) => e.yearsRemaining != null).reduce((s, e) => s + e.monthly, 0);

  const endYears = expenses
    .filter((e) => e.yearsRemaining != null)
    .map((e) => ({ label: e.label, year: expenseEndYear(e, startYear)! }))
    .sort((a, b) => a.year - b.year);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total monthly" value={formatRM(totalMonthly)} tone="wealth" />
        <MetricCard label="Ongoing (fixed)" value={formatRM(ongoingMonthly)} sub="never expires" />
        <MetricCard label="Time-limited" value={formatRM(limitedMonthly)} sub="loans / education" />
        <MetricCard label="Total yearly" value={formatRM(totalMonthly * 12)} tone="wealth" />
      </div>

      {EXPENSE_GROUPS.map((group) => {
        const items = expenses.filter((e) => e.group === group);
        if (items.length === 0) return null;
        const groupMonthly = items.reduce((s, e) => s + e.monthly, 0);
        return (
          <Section
            key={group}
            title={group}
            hint="For each item, enter the monthly cost in RM. For loans or time-limited commitments, set the years remaining — the payment drops to RM 0 after that (shown as an 'ends YYYY' badge). 'Ongoing' items never expire."
            right={<span className="text-xs text-slate-400">{formatRM(groupMonthly)}/mo</span>}
          >
            <div className="space-y-2">
              {items.map((item) => {
                const end = expenseEndYear(item, startYear);
                const ended = end != null && end <= startYear;
                return (
                  <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-12 flex items-center gap-2 sm:col-span-5">
                      <span className="text-sm text-slate-700 dark:text-slate-200">{item.label}</span>
                      {item.yearsRemaining != null && (
                        <span
                          className={`badge ${
                            ended
                              ? 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          }`}
                        >
                          ends {end}
                        </span>
                      )}
                    </div>
                    <div className="col-span-7 sm:col-span-4">
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">RM</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="field-input pl-10"
                          value={item.monthly === 0 ? '' : item.monthly}
                          placeholder="0"
                          step={50}
                          onChange={(e) => update(item.id, 'monthly', e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      {item.yearsRemaining == null ? (
                        <div className="field-input text-center text-slate-400">ongoing</div>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="numeric"
                            className="field-input pr-12"
                            value={item.yearsRemaining === 0 ? '' : item.yearsRemaining ?? ''}
                            placeholder="0"
                            min={0}
                            onChange={(e) =>
                              update(item.id, 'yearsRemaining', e.target.value === '' ? 0 : Number(e.target.value))
                            }
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400">yrs</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}

      <Section title="Loan / commitment end years">
        {endYears.length === 0 ? (
          <p className="text-sm text-slate-400">No time-limited commitments.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {endYears.map((e) => (
              <li key={e.label} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
                <span className="text-slate-600 dark:text-slate-300">{e.label}</span>
                <span className="font-semibold tabular-nums">{e.year}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
