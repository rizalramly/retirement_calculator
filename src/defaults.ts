import type { ExpenseItem, SalaryIncrement } from './engine';

/**
 * The persisted, user-editable state. The projection's clock (startYear /
 * startMonth) is derived from the device date at runtime, not stored here, so
 * the projection always rolls forward.
 */
export interface SavingsInputs {
  currentEpfBalance: number;
  currentAge: number;
  retirementAge: number;
  monthlyEpfContribution: number;
  bonusMonths: number;
  bonusMonth: number; // 1–12 calendar month the bonus is paid
  preRetirementSelfContributionPerYear: number;
  epfDividendRate: number;

  /**
   * How salary increments are defined:
   *  - 'periodic' — one increment of `periodicPercent` every
   *    `periodicIntervalYears` years, auto-tied to the retirement plan span.
   *  - 'custom' — the explicit list in `salaryIncrements`.
   */
  incrementMode: 'periodic' | 'custom';
  periodicIntervalYears: number; // 1 = yearly, 2 = every 2 years, 3 = every 3 years
  periodicPercent: number;
  salaryIncrements: SalaryIncrement[];

  currentPersonalSavings: number;
  monthlyPersonalSaving: number;
  personalSavingsReturn: number;

  annualTransferToEpf: number;
  inflationRate: number;
  stopTransferAtAge: number;

  projectionEndAge: number;
}

export interface AppState {
  savings: SavingsInputs;
  expenses: ExpenseItem[];
}

export const DEFAULT_SAVINGS: SavingsInputs = {
  currentEpfBalance: 0,
  currentAge: 0,
  retirementAge: 0,
  monthlyEpfContribution: 0,
  bonusMonths: 0,
  bonusMonth: 12, // default year-end; ignored while bonusMonths is 0
  preRetirementSelfContributionPerYear: 0,
  epfDividendRate: 0,
  incrementMode: 'periodic',
  periodicIntervalYears: 1,
  periodicPercent: 0,
  salaryIncrements: [
    { percent: 0, year: 0, month: 0 },
    { percent: 0, year: 0, month: 0 },
  ],
  currentPersonalSavings: 0,
  monthlyPersonalSaving: 0,
  personalSavingsReturn: 0,
  annualTransferToEpf: 0,
  inflationRate: 0,
  stopTransferAtAge: 0,
  projectionEndAge: 0,
};

// Item labels, groups, and which lines are time-limited (a number) vs ongoing
// (null) are preserved; all amounts and remaining terms default to 0.
export const DEFAULT_EXPENSES: ExpenseItem[] = [
  // Housing
  { id: 'mortgage1', label: 'Mortgage 1', group: 'Housing', monthly: 0, yearsRemaining: 0 },
  { id: 'mortgage2', label: 'Mortgage 2', group: 'Housing', monthly: 0, yearsRemaining: 0 },
  { id: 'homeUtilities', label: 'Maintenance & Utilities', group: 'Housing', monthly: 0, yearsRemaining: null },

  // Vehicles
  { id: 'carLoan1', label: 'Car Loan 1', group: 'Vehicles', monthly: 0, yearsRemaining: 0 },
  { id: 'carLoan2', label: 'Car Loan 2', group: 'Vehicles', monthly: 0, yearsRemaining: 0 },
  { id: 'carLoan3', label: 'Car Loan 3', group: 'Vehicles', monthly: 0, yearsRemaining: 0 },
  { id: 'fuelTolls', label: 'Fuel & Tolls', group: 'Vehicles', monthly: 0, yearsRemaining: null },

  // Daily living
  { id: 'groceries', label: 'Groceries', group: 'Daily Living', monthly: 0, yearsRemaining: null },
  { id: 'eatingOut', label: 'Eating Out', group: 'Daily Living', monthly: 0, yearsRemaining: null },
  { id: 'education', label: 'Children Education', group: 'Daily Living', monthly: 0, yearsRemaining: 0 },

  // Protection
  { id: 'medicalCard', label: 'Medical Card', group: 'Protection', monthly: 0, yearsRemaining: null },
  { id: 'lifeTakaful', label: 'Life / Takaful', group: 'Protection', monthly: 0, yearsRemaining: null },
  { id: 'zakat', label: 'Zakat (avg/mo)', group: 'Protection', monthly: 0, yearsRemaining: null },
  { id: 'familySupport', label: 'Parents / Family Support', group: 'Protection', monthly: 0, yearsRemaining: null },

  // Lifestyle
  { id: 'entertainment', label: 'Entertainment & Subscriptions', group: 'Lifestyle', monthly: 0, yearsRemaining: null },
  { id: 'clothing', label: 'Clothing', group: 'Lifestyle', monthly: 0, yearsRemaining: null },
  { id: 'travel', label: 'Overseas Travel (avg/mo)', group: 'Lifestyle', monthly: 0, yearsRemaining: null },
  { id: 'miscBuffer', label: 'Misc Buffer', group: 'Lifestyle', monthly: 0, yearsRemaining: null },
];

export const EXPENSE_GROUPS = ['Housing', 'Vehicles', 'Daily Living', 'Protection', 'Lifestyle'] as const;

export const DEFAULT_STATE: AppState = {
  savings: DEFAULT_SAVINGS,
  expenses: DEFAULT_EXPENSES,
};
