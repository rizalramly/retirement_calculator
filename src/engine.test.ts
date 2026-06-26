import { describe, it, expect } from 'vitest';
import {
  project,
  annualExpenseBase,
  expenseEndYear,
  generatePeriodicIncrements,
  type EngineInputs,
  type ExpenseItem,
  type SalaryIncrement,
} from './engine';

/** Minimal, mostly-zeroed inputs so individual rules can be tested in isolation. */
function baseInputs(overrides: Partial<EngineInputs> = {}): EngineInputs {
  return {
    currentEpfBalance: 0,
    currentAge: 55,
    retirementAge: 55,
    monthlyEpfContribution: 0,
    bonusMonths: 0,
    bonusMonth: 12,
    preRetirementSelfContributionPerYear: 0,
    epfDividendRate: 0,
    salaryIncrements: [],
    currentPersonalSavings: 0,
    monthlyPersonalSaving: 0,
    personalSavingsReturn: 0,
    annualTransferToEpf: 0,
    inflationRate: 0,
    stopTransferAtAge: 0,
    startYear: 2026,
    startMonth: 1,
    projectionEndAge: 56,
    expenses: [],
    ...overrides,
  };
}

const expense = (monthly: number, yearsRemaining: number | null = null): ExpenseItem => ({
  id: 'e',
  label: 'e',
  group: 'g',
  monthly,
  yearsRemaining,
});

describe('annualExpenseBase / loan expiry', () => {
  it('keeps ongoing items forever', () => {
    const items = [expense(1000, null)];
    expect(annualExpenseBase(items, 0)).toBe(12000);
    expect(annualExpenseBase(items, 50)).toBe(12000);
  });

  it('drops a time-limited item to RM 0 once its term ends', () => {
    const items = [{ ...expense(1000, 2), id: 'loan' }];
    expect(annualExpenseBase(items, 0)).toBe(12000); // year 0 — active
    expect(annualExpenseBase(items, 1)).toBe(12000); // year 1 — active
    expect(annualExpenseBase(items, 2)).toBe(0); // term ended
    expect(annualExpenseBase(items, 3)).toBe(0);
  });

  it('computes the end year as startYear + yearsRemaining', () => {
    expect(expenseEndYear({ ...expense(1000, 15), id: 'm' }, 2026)).toBe(2041);
    expect(expenseEndYear(expense(1000, null), 2026)).toBeNull();
  });

  it('mixes ongoing and expiring items correctly', () => {
    const items = [expense(1000, null), { ...expense(500, 1), id: 'short' }];
    expect(annualExpenseBase(items, 0)).toBe(12000 + 6000);
    expect(annualExpenseBase(items, 1)).toBe(12000); // short item ended
  });
});

describe('retirement withdrawal waterfall (personal savings first, then EPF)', () => {
  it('draws entirely from personal savings when it can cover the expense', () => {
    const r = project(
      baseInputs({
        currentEpfBalance: 100_000,
        currentPersonalSavings: 30_000,
        expenses: [expense(2000)], // 24,000 / yr
      }),
    );
    const ret = r.rows.find((row) => row.age === 56)!;
    expect(ret.personalWithdrawal).toBe(24_000);
    expect(ret.epfWithdrawal).toBe(0);
    expect(ret.personalClosing).toBe(6_000);
    expect(ret.epfClosing).toBe(100_000); // EPF untouched
    expect(ret.shortfall).toBe(0);
  });

  it('spills over to EPF only after personal savings is exhausted', () => {
    const r = project(
      baseInputs({
        currentEpfBalance: 100_000,
        currentPersonalSavings: 30_000,
        expenses: [expense(4000)], // 48,000 / yr
      }),
    );
    const ret = r.rows.find((row) => row.age === 56)!;
    expect(ret.personalWithdrawal).toBe(30_000); // all of personal
    expect(ret.personalClosing).toBe(0);
    expect(ret.epfWithdrawal).toBe(18_000); // remainder from EPF
    expect(ret.epfClosing).toBe(82_000);
    expect(ret.shortfall).toBe(0);
  });

  it('never goes below zero and flags a shortfall + deplete age when both pots run out', () => {
    const r = project(
      baseInputs({
        currentEpfBalance: 10_000,
        currentPersonalSavings: 5_000,
        expenses: [expense(5000)], // 60,000 / yr — far more than available
      }),
    );
    const ret = r.rows.find((row) => row.age === 56)!;
    expect(ret.personalWithdrawal).toBe(5_000);
    expect(ret.epfWithdrawal).toBe(10_000);
    expect(ret.personalClosing).toBe(0);
    expect(ret.epfClosing).toBe(0);
    expect(ret.shortfall).toBeCloseTo(45_000, 5);
    expect(r.depleteAge).toBe(56);
  });

  it('reports funds as secure (depleteAge null) when expenses are always covered', () => {
    const r = project(
      baseInputs({
        currentPersonalSavings: 1_000_000,
        projectionEndAge: 85,
        expenses: [expense(1000)],
      }),
    );
    expect(r.depleteAge).toBeNull();
  });
});

describe('retirement transfer rule (personal savings -> EPF)', () => {
  it('transfers the cap into EPF, which then earns the EPF dividend', () => {
    const r = project(
      baseInputs({
        // Start already in retirement (age 56) so no accumulation-year dividend
        // is applied before the transfer we want to isolate.
        currentAge: 56,
        retirementAge: 55,
        currentEpfBalance: 100_000,
        currentPersonalSavings: 200_000,
        epfDividendRate: 10,
        annualTransferToEpf: 100_000,
        stopTransferAtAge: 65,
        expenses: [], // isolate the transfer
      }),
    );
    const ret = r.rows.find((row) => row.age === 56)!;
    expect(ret.transferOut).toBe(100_000);
    expect(ret.transferIn).toBe(100_000);
    // EPF: (100k + 100k) earns 10% => 220k.
    expect(ret.epfClosing).toBeCloseTo(220_000, 5);
    // Personal: 200k - 100k transferred out = 100k (no return, no expense).
    expect(ret.personalClosing).toBeCloseTo(100_000, 5);
  });

  it('caps the transfer at the personal balance actually held', () => {
    const r = project(
      baseInputs({
        currentEpfBalance: 0,
        currentPersonalSavings: 40_000,
        annualTransferToEpf: 100_000,
        stopTransferAtAge: 65,
      }),
    );
    const ret = r.rows.find((row) => row.age === 56)!;
    expect(ret.transferOut).toBe(40_000);
    expect(ret.personalClosing).toBe(0);
  });

  it('stops transferring once age exceeds stopTransferAtAge', () => {
    const r = project(
      baseInputs({
        currentAge: 55,
        retirementAge: 55,
        projectionEndAge: 58,
        currentPersonalSavings: 1_000_000,
        annualTransferToEpf: 100_000,
        stopTransferAtAge: 56, // only age 56 may transfer
      }),
    );
    expect(r.rows.find((row) => row.age === 56)!.transferOut).toBe(100_000);
    expect(r.rows.find((row) => row.age === 57)!.transferOut).toBe(0);
    expect(r.rows.find((row) => row.age === 58)!.transferOut).toBe(0);
  });
});

describe('accumulation phase', () => {
  it('counts only the months after the current one in the first calendar year', () => {
    // Start in June (month 6): the June contribution is already made, so only
    // Jul–Dec = 6 months remain.
    const r = project(
      baseInputs({
        currentAge: 47,
        retirementAge: 55,
        projectionEndAge: 47,
        startMonth: 6,
        monthlyEpfContribution: 1000,
        epfDividendRate: 0,
      }),
    );
    const first = r.rows[0];
    expect(first.contributions).toBe(6000); // 6 months × 1000, no bonus/dividend
    expect(first.epfClosing).toBe(6000);
  });

  it('applies a salary increment partially in its November, then fully next year', () => {
    const increments: SalaryIncrement[] = [{ percent: 100, year: 2027, month: 11 }];
    const r = project(
      baseInputs({
        currentAge: 47,
        retirementAge: 55,
        projectionEndAge: 49,
        startYear: 2026,
        startMonth: 1,
        monthlyEpfContribution: 1000,
        salaryIncrements: increments,
      }),
    );
    const y2026 = r.rows.find((row) => row.year === 2026)!;
    const y2027 = r.rows.find((row) => row.year === 2027)!;
    const y2028 = r.rows.find((row) => row.year === 2028)!;
    // 2026 is the (partial) first year: starts in Feb (Jan already contributed)
    // => 11 months × 1000, no increment yet.
    expect(y2026.contributions).toBe(11_000);
    // 2027 is a full year: Jan–Oct at 1000 (10 mo) + Nov–Dec at 2000 (2 mo) = 14,000.
    expect(y2027.contributions).toBe(14_000);
    expect(y2028.contributions).toBe(24_000); // full year at the doubled rate
  });

  it('adds a bonus of monthly-rate × bonusMonths', () => {
    const r = project(
      baseInputs({
        currentAge: 47,
        retirementAge: 55,
        projectionEndAge: 47,
        startMonth: 1,
        monthlyEpfContribution: 1000,
        bonusMonths: 2,
      }),
    );
    // First (partial) year: 11 months × 1000 + 2 × 1000 bonus = 13,000.
    // (bonusMonth defaults to Dec, still ahead of the Jan start, so it counts.)
    expect(r.rows[0].contributions).toBe(13_000);
  });

  it('skips the first-year bonus when its month has already passed', () => {
    // Current month June (6); bonus is paid in April (4) — already gone this year.
    const r = project(
      baseInputs({
        currentAge: 47,
        retirementAge: 55,
        projectionEndAge: 48,
        startYear: 2026,
        startMonth: 6,
        monthlyEpfContribution: 1000,
        bonusMonths: 2,
        bonusMonth: 4,
        epfDividendRate: 0,
      }),
    );
    const y2026 = r.rows.find((x) => x.year === 2026)!;
    const y2027 = r.rows.find((x) => x.year === 2027)!;
    // 2026: Jul–Dec = 6 months, NO bonus (April already paid) => 6,000.
    expect(y2026.contributions).toBe(6_000);
    // 2027: full year + April bonus => 12,000 + 2,000 = 14,000.
    expect(y2027.contributions).toBe(14_000);
  });

  it('includes the first-year bonus when its month is still ahead', () => {
    // Current month June (6); bonus paid in September (9) — still to come.
    const r = project(
      baseInputs({
        currentAge: 47,
        retirementAge: 55,
        projectionEndAge: 47,
        startYear: 2026,
        startMonth: 6,
        monthlyEpfContribution: 1000,
        bonusMonths: 2,
        bonusMonth: 9,
        epfDividendRate: 0,
      }),
    );
    // 6 months contributions + 2-month bonus = 6,000 + 2,000 = 8,000.
    expect(r.rows[0].contributions).toBe(8_000);
  });
});

describe('periodic salary increments (tied to the retirement plan)', () => {
  // 47 -> 55 is an 8-year accumulation span.
  it('yearly: one increment every year of the plan', () => {
    const incs = generatePeriodicIncrements(47, 55, 2026, 1, 10);
    expect(incs).toHaveLength(8);
    expect(incs[0]).toEqual({ percent: 10, year: 2027, month: 1 });
    expect(incs[7]).toEqual({ percent: 10, year: 2034, month: 1 });
  });

  it('every 2 years: 4 increments over an 8-year span', () => {
    const incs = generatePeriodicIncrements(47, 55, 2026, 2, 10);
    expect(incs).toHaveLength(4);
    expect(incs.map((i) => i.year)).toEqual([2028, 2030, 2032, 2034]);
  });

  it('every 3 years: only 2 increments over an 8-year span', () => {
    const incs = generatePeriodicIncrements(47, 55, 2026, 3, 10);
    expect(incs).toHaveLength(2);
    expect(incs.map((i) => i.year)).toEqual([2029, 2032]);
  });

  it('returns none for a zero percent, non-positive interval, or no span', () => {
    expect(generatePeriodicIncrements(47, 55, 2026, 1, 0)).toHaveLength(0);
    expect(generatePeriodicIncrements(47, 55, 2026, 0, 10)).toHaveLength(0);
    expect(generatePeriodicIncrements(55, 55, 2026, 1, 10)).toHaveLength(0);
  });

  it('compounds when fed into the projection (same % each step)', () => {
    const incs = generatePeriodicIncrements(47, 49, 2026, 1, 100); // double each year
    const r = project(
      baseInputs({
        currentAge: 47,
        retirementAge: 49,
        projectionEndAge: 49,
        startMonth: 1,
        monthlyEpfContribution: 1000,
        salaryIncrements: incs,
      }),
    );
    // 2026: partial first year, 11 x 1000 = 11,000 (no increment yet).
    expect(r.rows.find((x) => x.year === 2026)!.contributions).toBe(11_000);
    // 2027: doubled => 12 x 2000 = 24,000.
    expect(r.rows.find((x) => x.year === 2027)!.contributions).toBe(24_000);
    // 2028: doubled again => 12 x 4000 = 48,000.
    expect(r.rows.find((x) => x.year === 2028)!.contributions).toBe(48_000);
  });
});

describe('summary metrics', () => {
  it('reports EPF/personal/total at the retirement-age row', () => {
    const r = project(
      baseInputs({
        currentAge: 54,
        retirementAge: 55,
        projectionEndAge: 60,
        currentEpfBalance: 500_000,
        currentPersonalSavings: 100_000,
        startMonth: 1,
      }),
    );
    const ret = r.rows.find((row) => row.age === 55)!;
    expect(r.epfAtRetirement).toBe(ret.epfClosing);
    expect(r.personalAtRetirement).toBe(ret.personalClosing);
    expect(r.totalAtRetirement).toBe(ret.epfClosing + ret.personalClosing);
  });
});
