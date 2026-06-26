import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type { ProjectionResult } from '../engine';
import type { SavingsInputs } from '../defaults';
import { formatRM, formatRMCompact } from '../format';
import { Section } from './ui';

export function OutlookTab({
  result,
  savings,
}: {
  result: ProjectionResult;
  savings: SavingsInputs;
}) {
  const data = result.rows.map((r) => ({
    age: r.age,
    epf: Math.round(r.epfClosing),
    personal: Math.round(r.personalClosing),
    total: Math.round(r.totalWealth),
    expense: Math.round(r.annualExpense),
    fromPersonal: Math.round(r.personalWithdrawal),
    fromEpf: Math.round(r.epfWithdrawal),
  }));

  // Cashflow chart only makes sense in the retirement (withdrawal) phase.
  const cashflow = result.rows
    .filter((r) => r.phase === 'retirement')
    .map((r) => ({
      age: r.age,
      fromPersonal: Math.round(r.personalWithdrawal),
      fromEpf: Math.round(r.epfWithdrawal),
      expense: Math.round(r.annualExpense),
    }));

  const milestones = result.rows.filter(
    (r) => r.age % 5 === 0 || r.age === savings.retirementAge || r.age === savings.projectionEndAge,
  );

  const tooltipStyle = {
    contentStyle: {
      borderRadius: 12,
      border: '1px solid rgb(148 163 184 / 0.4)',
      fontSize: 12,
    },
    formatter: (v: number) => formatRM(v),
    labelFormatter: (l: number) => `Age ${l}`,
  } as const;

  return (
    <div className="space-y-4">
      <Section title="Wealth & expenses over time">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatRMCompact} tick={{ fontSize: 11 }} width={64} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={savings.retirementAge} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Retire', fontSize: 11, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="total" name="Total wealth" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="epf" name="EPF" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="personal" name="Personal" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expense" name="Annual expense" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Net cashflow in retirement (where each year's spending comes from)">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashflow} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatRMCompact} tick={{ fontSize: 11 }} width={64} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="fromPersonal" name="From personal" stackId="w" fill="#16a34a" />
              <Bar dataKey="fromEpf" name="From EPF" stackId="w" fill="#2563eb" />
              <Line type="monotone" dataKey="expense" name="Expense target" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Milestones (every 5 years)">
        <div className="-mx-4 overflow-x-auto">
          <table className="min-w-full text-right text-sm tabular-nums">
            <thead className="bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                {['Age', 'Year', 'EPF', 'Personal', 'Total wealth', 'Annual expense'].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {milestones.map((r) => (
                <tr key={r.age} className="odd:bg-slate-50 dark:odd:bg-slate-800/40">
                  <td className="px-3 py-1.5 text-left font-medium">{r.age}</td>
                  <td className="px-3 py-1.5">{r.year}</td>
                  <td className="px-3 py-1.5 text-epf">{formatRM(r.epfClosing)}</td>
                  <td className="px-3 py-1.5 text-personal">{formatRM(r.personalClosing)}</td>
                  <td className="px-3 py-1.5 font-semibold text-wealth">{formatRM(r.totalWealth)}</td>
                  <td className="px-3 py-1.5">{r.annualExpense ? formatRM(r.annualExpense) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
