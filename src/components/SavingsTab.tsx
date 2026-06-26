import { generatePeriodicIncrements, type ProjectionResult } from '../engine';
import type { SavingsInputs } from '../defaults';
import { formatRM } from '../format';
import { downloadCSV } from '../csv';
import { MetricCard, NumberField, Section } from './ui';

const INTERVAL_OPTIONS = [
  { interval: 1, label: 'Every year' },
  { interval: 2, label: 'Every 2 years' },
  { interval: 3, label: 'Every 3 years' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function SavingsTab({
  savings,
  setSavings,
  result,
  startYear,
}: {
  savings: SavingsInputs;
  setSavings: React.Dispatch<React.SetStateAction<SavingsInputs>>;
  result: ProjectionResult;
  startYear: number;
}) {
  const set = <K extends keyof SavingsInputs>(key: K, value: SavingsInputs[K]) =>
    setSavings((s) => ({ ...s, [key]: value }));

  const setIncrement = (idx: number, field: 'percent' | 'year' | 'month', value: number) =>
    setSavings((s) => {
      const salaryIncrements = s.salaryIncrements.map((inc, i) =>
        i === idx ? { ...inc, [field]: value } : inc,
      );
      return { ...s, salaryIncrements };
    });

  const secure = result.depleteAge == null;

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label={`EPF at ${savings.retirementAge}`} value={formatRM(result.epfAtRetirement)} tone="epf" />
        <MetricCard label={`Personal at ${savings.retirementAge}`} value={formatRM(result.personalAtRetirement)} tone="personal" />
        <MetricCard label={`Total at ${savings.retirementAge}`} value={formatRM(result.totalAtRetirement)} tone="wealth" />
        <MetricCard label="EPF at 85" value={formatRM(result.epfAt85)} tone="epf" />
        <MetricCard label="Total at 85" value={formatRM(result.totalAt85)} tone="wealth" />
        <MetricCard
          label="Status"
          value={secure ? 'Secure to 85' : `Depletes at ${result.depleteAge}`}
          tone={secure ? 'good' : 'bad'}
          sub={secure ? 'Funds last the full projection' : 'Expenses exceed savings'}
        />
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="EPF — accumulation">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Current EPF balance" prefix="RM" value={savings.currentEpfBalance} onChange={(v) => set('currentEpfBalance', v)} step={1000} />
            <NumberField label="Current age" value={savings.currentAge} onChange={(v) => set('currentAge', v)} />
            <NumberField label="Retirement age" value={savings.retirementAge} onChange={(v) => set('retirementAge', v)} />
            <NumberField label="Project to age" value={savings.projectionEndAge} onChange={(v) => set('projectionEndAge', v)} />
            <NumberField label="Monthly EPF (incl. employer)" prefix="RM" value={savings.monthlyEpfContribution} onChange={(v) => set('monthlyEpfContribution', v)} step={100} />
            <NumberField label="Bonus months" value={savings.bonusMonths} onChange={(v) => set('bonusMonths', v)} />
            <label className="block">
              <span className="field-label">Bonus paid in</span>
              <select
                className="field-input"
                value={savings.bonusMonth}
                onChange={(e) => set('bonusMonth', Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <NumberField label="Self-contribution / year" prefix="RM" value={savings.preRetirementSelfContributionPerYear} onChange={(v) => set('preRetirementSelfContributionPerYear', v)} step={500} />
            <NumberField label="EPF dividend rate" suffix="%" value={savings.epfDividendRate} onChange={(v) => set('epfDividendRate', v)} step={0.1} />
          </div>
        </Section>

        <Section title="Salary increments">
          {/* Mode selector: periodic intervals tied to the plan, or a custom list. */}
          <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/70">
            {INTERVAL_OPTIONS.map((opt) => {
              const active = savings.incrementMode === 'periodic' && savings.periodicIntervalYears === opt.interval;
              return (
                <button
                  key={opt.interval}
                  onClick={() => setSavings((s) => ({ ...s, incrementMode: 'periodic', periodicIntervalYears: opt.interval }))}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            <button
              onClick={() => setSavings((s) => ({ ...s, incrementMode: 'custom' }))}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                savings.incrementMode === 'custom'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {savings.incrementMode === 'periodic' ? (
            <div className="space-y-3">
              <NumberField
                label="Increment each step"
                suffix="%"
                value={savings.periodicPercent}
                onChange={(v) => set('periodicPercent', v)}
                step={0.5}
              />
              <PeriodicSummary savings={savings} startYear={startYear} />
            </div>
          ) : (
            <div className="space-y-3">
              {savings.salaryIncrements.map((inc, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <NumberField label={`#${i + 1} percent`} suffix="%" value={inc.percent} onChange={(v) => setIncrement(i, 'percent', v)} />
                  <NumberField label="Year" value={inc.year} onChange={(v) => setIncrement(i, 'year', v)} />
                  <NumberField label="Month" value={inc.month} onChange={(v) => setIncrement(i, 'month', v)} min={1} />
                </div>
              ))}
              <p className="text-xs text-slate-400">
                An increment in e.g. November applies only to Nov–Dec that year, then fully thereafter.
              </p>
            </div>
          )}
        </Section>

        <Section title="Personal savings & retirement phase">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Current personal savings" prefix="RM" value={savings.currentPersonalSavings} onChange={(v) => set('currentPersonalSavings', v)} step={1000} />
            <NumberField label="Monthly personal saving" prefix="RM" value={savings.monthlyPersonalSaving} onChange={(v) => set('monthlyPersonalSaving', v)} step={100} />
            <NumberField label="Personal return" suffix="%" value={savings.personalSavingsReturn} onChange={(v) => set('personalSavingsReturn', v)} step={0.1} />
            <NumberField label="Annual transfer to EPF (cap)" prefix="RM" value={savings.annualTransferToEpf} onChange={(v) => set('annualTransferToEpf', v)} step={1000} />
            <NumberField label="Inflation rate" suffix="%" value={savings.inflationRate} onChange={(v) => set('inflationRate', v)} step={0.1} />
            <NumberField label="Stop transfer at age" value={savings.stopTransferAtAge} onChange={(v) => set('stopTransferAtAge', v)} />
          </div>
        </Section>
      </div>

      {/* Year-by-year table */}
      <Section
        title="Year-by-year projection"
        right={
          <button
            onClick={() => downloadCSV(result.rows)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Export CSV
          </button>
        }
      >
        <div className="-mx-4 overflow-x-auto">
          <table className="min-w-full text-right text-xs tabular-nums">
            <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                {[
                  'Age', 'Year', 'EPF open', 'Contrib+bonus', 'Dividend', 'Transfer in', 'EPF withdraw', 'EPF close',
                  'Pers open', 'Save/return', 'Transfer out', 'Pers withdraw', 'Pers close', 'Annual expense', 'Total wealth',
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 font-semibold first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => {
                const isRetAge = r.age === savings.retirementAge;
                return (
                  <tr
                    key={r.age}
                    className={
                      isRetAge
                        ? 'bg-amber-100 font-semibold dark:bg-amber-900/40'
                        : r.phase === 'retirement'
                          ? 'odd:bg-slate-50 dark:odd:bg-slate-800/40'
                          : 'odd:bg-blue-50/40 dark:odd:bg-blue-900/10'
                    }
                  >
                    <td className="whitespace-nowrap px-2 py-1 text-left">
                      {r.age}
                      {isRetAge && <span className="badge ml-1 bg-amber-500 text-white">retire</span>}
                    </td>
                    <td className="px-2 py-1">{r.year}</td>
                    <td className="px-2 py-1">{formatRM(r.epfOpening)}</td>
                    <td className="px-2 py-1">{formatRM(r.contributions)}</td>
                    <td className="px-2 py-1">{formatRM(r.dividend)}</td>
                    <td className="px-2 py-1">{r.transferIn ? formatRM(r.transferIn) : '—'}</td>
                    <td className="px-2 py-1 text-red-600 dark:text-red-400">{r.epfWithdrawal ? formatRM(r.epfWithdrawal) : '—'}</td>
                    <td className="px-2 py-1 font-medium text-epf">{formatRM(r.epfClosing)}</td>
                    <td className="px-2 py-1">{formatRM(r.personalOpening)}</td>
                    <td className="px-2 py-1">{formatRM(r.savingReturn)}</td>
                    <td className="px-2 py-1">{r.transferOut ? formatRM(r.transferOut) : '—'}</td>
                    <td className="px-2 py-1 text-red-600 dark:text-red-400">{r.personalWithdrawal ? formatRM(r.personalWithdrawal) : '—'}</td>
                    <td className="px-2 py-1 font-medium text-personal">{formatRM(r.personalClosing)}</td>
                    <td className="px-2 py-1">{r.annualExpense ? formatRM(r.annualExpense) : '—'}</td>
                    <td className="px-2 py-1 font-semibold text-wealth">{formatRM(r.totalWealth)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

/** Shows how many increments the chosen interval produces and at which ages/years. */
function PeriodicSummary({ savings, startYear }: { savings: SavingsInputs; startYear: number }) {
  const incs = generatePeriodicIncrements(
    savings.currentAge,
    savings.retirementAge,
    startYear,
    savings.periodicIntervalYears,
    savings.periodicPercent,
  );
  const span = savings.retirementAge - savings.currentAge;

  if (savings.periodicPercent === 0) {
    return <p className="text-xs text-slate-400">Set a percentage above to apply recurring increments.</p>;
  }
  if (incs.length === 0) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        No increments — check that retirement age is above current age.
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">
      <p className="text-slate-600 dark:text-slate-300">
        <span className="font-semibold">{incs.length}</span> increment{incs.length > 1 ? 's' : ''} of{' '}
        <span className="font-semibold">{savings.periodicPercent}%</span> across the {span}-year plan
        (age {savings.currentAge} → {savings.retirementAge}).
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {incs.map((inc) => (
          <span key={inc.year} className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            {inc.year} · age {savings.currentAge + (inc.year - startYear)}
          </span>
        ))}
      </div>
    </div>
  );
}
