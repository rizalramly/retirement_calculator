/**
 * engine.ts — the single, pure calculation engine shared by web and Android.
 *
 * Nothing in here touches React, the DOM, storage, or the current date: every
 * input (including the projection's start year/month) is passed in, so the same
 * numbers are produced on every platform and the whole module is trivially
 * unit-testable.
 *
 * Currency is Malaysian Ringgit (RM) throughout. Rates are passed as percent
 * values (e.g. 6 means 6%).
 */

export interface SalaryIncrement {
  /** Percentage uplift applied to the monthly EPF contribution, e.g. 12 = +12%. */
  percent: number;
  /** Calendar year the increment takes effect. */
  year: number;
  /**
   * Month (1–12) within `year` the increment takes effect. An increment in
   * November only applies to Nov–Dec of that year (partial); the full uplift
   * applies to every subsequent year. Defaults to 1 (January = full year).
   */
  month: number;
}

export interface ExpenseItem {
  id: string;
  label: string;
  group: string;
  /** Monthly amount in RM. */
  monthly: number;
  /**
   * Years remaining on a loan / time-limited commitment. `null` = ongoing
   * (never expires). The payment drops to RM 0 once the term has elapsed.
   */
  yearsRemaining: number | null;
}

export interface EngineInputs {
  // --- Accumulation: EPF ---
  currentEpfBalance: number;
  currentAge: number;
  retirementAge: number;
  monthlyEpfContribution: number; // incl. employer
  bonusMonths: number;
  bonusMonth: number; // 1–12 calendar month the bonus is paid
  preRetirementSelfContributionPerYear: number;
  epfDividendRate: number; // %
  salaryIncrements: SalaryIncrement[];

  // --- Accumulation: personal savings ---
  currentPersonalSavings: number;
  monthlyPersonalSaving: number;
  personalSavingsReturn: number; // %

  // --- Retirement phase ---
  annualTransferToEpf: number; // EPF self-contribution cap
  inflationRate: number; // %
  stopTransferAtAge: number;

  // --- Projection window / clock ---
  startYear: number;
  startMonth: number; // 1–12 (current month); first year counts only the months after it
  projectionEndAge: number; // e.g. 85

  // --- Expenses (drives retirement withdrawals) ---
  expenses: ExpenseItem[];
}

export type Phase = 'accumulation' | 'retirement';

export interface ProjectionRow {
  age: number;
  year: number;
  phase: Phase;

  // EPF
  epfOpening: number;
  contributions: number; // contributions + bonus + self-contribution (accumulation only)
  dividend: number;
  transferIn: number; // from personal savings (retirement only)
  epfWithdrawal: number;
  epfClosing: number;

  // Personal savings
  personalOpening: number;
  savingReturn: number; // monthly saving + return earned this year
  transferOut: number; // to EPF (retirement only)
  personalWithdrawal: number;
  personalClosing: number;

  // Spending
  annualExpense: number;
  totalWealth: number; // epfClosing + personalClosing
  shortfall: number; // expense that could not be funded this year
}

export interface ProjectionResult {
  rows: ProjectionRow[];
  epfAtRetirement: number;
  personalAtRetirement: number;
  totalAtRetirement: number;
  epfAt85: number;
  totalAt85: number;
  /** First age at which expenses could not be fully funded, or null if secure. */
  depleteAge: number | null;
}

/**
 * Sum of annual (monthly × 12) expenses for a given number of years elapsed
 * since the projection start, dropping any item whose term has ended.
 *
 * An item with `yearsRemaining = n` is active while `yearsElapsed < n`, so it
 * pays for years 0..n-1 and drops to RM 0 from year n onward.
 */
export function annualExpenseBase(expenses: ExpenseItem[], yearsElapsed: number): number {
  let total = 0;
  for (const item of expenses) {
    const active = item.yearsRemaining == null || yearsElapsed < item.yearsRemaining;
    if (active) total += item.monthly * 12;
  }
  return total;
}

/** Calendar year a time-limited expense item ends (drops to RM 0), or null if ongoing. */
export function expenseEndYear(item: ExpenseItem, startYear: number): number | null {
  if (item.yearsRemaining == null) return null;
  return startYear + item.yearsRemaining;
}

/**
 * Generate recurring salary increments tied to the accumulation span
 * (current age → retirement age). One increment of `percent` is applied every
 * `intervalYears` years, but only while the increment year stays within the
 * working period.
 *
 * The count is `floor((retirementAge - currentAge) / intervalYears)`. For a
 * 47→55 plan (8-year span): yearly → 8 increments, every 2 years → 4, every
 * 3 years → 2. Each increment takes effect in January (full year).
 */
export function generatePeriodicIncrements(
  currentAge: number,
  retirementAge: number,
  startYear: number,
  intervalYears: number,
  percent: number,
): SalaryIncrement[] {
  const out: SalaryIncrement[] = [];
  const span = retirementAge - currentAge;
  if (intervalYears <= 0 || percent === 0 || span <= 0) return out;
  const count = Math.floor(span / intervalYears);
  for (let k = 1; k <= count; k++) {
    out.push({ percent, year: startYear + k * intervalYears, month: 1 });
  }
  return out;
}

/** Cumulative salary-increment multiplier in force at (year, month). */
function incrementFactor(increments: SalaryIncrement[], year: number, month: number): number {
  let factor = 1;
  for (const inc of increments) {
    if (inc.year < year || (inc.year === year && inc.month <= month)) {
      factor *= 1 + inc.percent / 100;
    }
  }
  return factor;
}

export function project(inputs: EngineInputs): ProjectionResult {
  const rows: ProjectionRow[] = [];

  const divRate = inputs.epfDividendRate / 100;
  const persRate = inputs.personalSavingsReturn / 100;
  const infl = inputs.inflationRate / 100;
  const baseMonthly = inputs.monthlyEpfContribution;

  let epf = inputs.currentEpfBalance;
  let personal = inputs.currentPersonalSavings;

  for (let age = inputs.currentAge; age <= inputs.projectionEndAge; age++) {
    const yearsElapsed = age - inputs.currentAge;
    const year = inputs.startYear + yearsElapsed;
    const isFirst = age === inputs.currentAge;
    // The first projection year only counts the months still ahead in the
    // current calendar year. The current month's contribution is treated as
    // already made, so it is excluded: e.g. June (month 6) leaves Jul–Dec = 6
    // months. Every later year is a full 12 months.
    const monthsActive = isFirst ? 12 - inputs.startMonth : 12;
    const isAccumulation = age <= inputs.retirementAge;

    const epfOpening = epf;
    const personalOpening = personal;

    let contributions = 0;
    let dividend = 0;
    let transferIn = 0;
    let epfWithdrawal = 0;
    let savingReturn = 0;
    let transferOut = 0;
    let personalWithdrawal = 0;
    let annualExpense = 0;
    let shortfall = 0;

    if (isAccumulation) {
      // --- EPF inflows ---
      // First year starts at the month *after* the current one (current month
      // already contributed); later years start in January.
      const startM = isFirst ? inputs.startMonth + 1 : 1;
      let contribTotal = 0;
      for (let m = startM; m <= 12; m++) {
        contribTotal += baseMonthly * incrementFactor(inputs.salaryIncrements, year, m);
      }
      // The bonus only counts if its pay-month is still ahead this year. For the
      // first (partial) year that means strictly after the current month (a bonus
      // already paid earlier in the year is gone); later years always include it.
      const bonusAhead = !isFirst || inputs.bonusMonth > inputs.startMonth;
      const bonusRate = baseMonthly * incrementFactor(inputs.salaryIncrements, year, inputs.bonusMonth);
      const bonus = bonusAhead ? bonusRate * inputs.bonusMonths : 0;
      const self = inputs.preRetirementSelfContributionPerYear;
      const inflows = contribTotal + bonus + self;
      contributions = inflows;

      // Dividend on the average balance over the year, pro-rated by months active.
      dividend = (epfOpening + 0.5 * inflows) * divRate * (monthsActive / 12);
      epf = epfOpening + inflows + dividend;

      // --- Personal savings ---
      const saving = inputs.monthlyPersonalSaving * monthsActive;
      const personalGrowth = (personalOpening + 0.5 * saving) * persRate * (monthsActive / 12);
      savingReturn = saving + personalGrowth;
      personal = personalOpening + saving + personalGrowth;

      // Informational only — nothing is withdrawn while still working.
      annualExpense = annualExpenseBase(inputs.expenses, yearsElapsed);
    } else {
      // --- Retirement: execute strictly in this order ---
      // 1. This year's inflated expenses (with expired loans dropped).
      annualExpense =
        annualExpenseBase(inputs.expenses, yearsElapsed) *
        Math.pow(1 + infl, age - inputs.retirementAge);

      // 2. Personal savings first earns its annual return.
      const personalGrowth = personalOpening * persRate;
      savingReturn = personalGrowth;
      let pBal = personalOpening + personalGrowth;

      // 3. Transfer into EPF (capped, only while still permitted, only what we hold).
      if (age <= inputs.stopTransferAtAge) {
        transferOut = Math.min(inputs.annualTransferToEpf, pBal);
      }
      pBal -= transferOut;
      transferIn = transferOut;

      // 4. EPF earns its dividend on the full balance (including the transfer in).
      const epfAfterTransfer = epfOpening + transferIn;
      dividend = epfAfterTransfer * divRate;
      let eBal = epfAfterTransfer + dividend;

      // 5. Withdraw expenses from personal savings FIRST, then EPF for the rest.
      const fromPersonal = Math.min(pBal, annualExpense);
      pBal -= fromPersonal;
      const remaining = annualExpense - fromPersonal;
      const fromEpf = Math.min(eBal, remaining);
      eBal -= fromEpf;

      personalWithdrawal = fromPersonal;
      epfWithdrawal = fromEpf;
      shortfall = remaining - fromEpf; // > 0 only when both pots are exhausted

      // 6. Neither balance can go below zero (guaranteed by the Math.min above).
      personal = pBal;
      epf = eBal;
    }

    const epfClosing = epf;
    const personalClosing = personal;

    rows.push({
      age,
      year,
      phase: isAccumulation ? 'accumulation' : 'retirement',
      epfOpening,
      contributions,
      dividend,
      transferIn,
      epfWithdrawal,
      epfClosing,
      personalOpening,
      savingReturn,
      transferOut,
      personalWithdrawal,
      personalClosing,
      annualExpense,
      totalWealth: epfClosing + personalClosing,
      shortfall,
    });
  }

  const retRow = rows.find((r) => r.age === inputs.retirementAge);
  const lastRow = rows[rows.length - 1];
  const depleteRow = rows.find((r) => r.phase === 'retirement' && r.shortfall > 0.01);

  return {
    rows,
    epfAtRetirement: retRow?.epfClosing ?? 0,
    personalAtRetirement: retRow?.personalClosing ?? 0,
    totalAtRetirement: retRow?.totalWealth ?? 0,
    epfAt85: lastRow?.epfClosing ?? 0,
    totalAt85: lastRow?.totalWealth ?? 0,
    depleteAge: depleteRow ? depleteRow.age : null,
  };
}
