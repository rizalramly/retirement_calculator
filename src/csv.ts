import type { ProjectionRow } from './engine';

const COLUMNS: { key: keyof ProjectionRow; header: string }[] = [
  { key: 'age', header: 'Age' },
  { key: 'year', header: 'Year' },
  { key: 'phase', header: 'Phase' },
  { key: 'epfOpening', header: 'EPF Opening' },
  { key: 'contributions', header: 'Contributions+Bonus' },
  { key: 'dividend', header: 'EPF Dividend' },
  { key: 'transferIn', header: 'Transfer In' },
  { key: 'epfWithdrawal', header: 'EPF Withdrawal' },
  { key: 'epfClosing', header: 'EPF Closing' },
  { key: 'personalOpening', header: 'Personal Opening' },
  { key: 'savingReturn', header: 'Saving/Return' },
  { key: 'transferOut', header: 'Transfer Out' },
  { key: 'personalWithdrawal', header: 'Personal Withdrawal' },
  { key: 'personalClosing', header: 'Personal Closing' },
  { key: 'annualExpense', header: 'Annual Expense' },
  { key: 'totalWealth', header: 'Total Wealth' },
];

export function rowsToCSV(rows: ProjectionRow[]): string {
  const header = COLUMNS.map((c) => c.header).join(',');
  const lines = rows.map((row) =>
    COLUMNS.map((c) => {
      const v = row[c.key];
      return typeof v === 'number' ? Math.round(v) : `${v}`;
    }).join(','),
  );
  return [header, ...lines].join('\n');
}

/** Trigger a client-side download of the projection as a .csv file. */
export function downloadCSV(rows: ProjectionRow[], filename = 'retirement-projection.csv'): void {
  const csv = rowsToCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
