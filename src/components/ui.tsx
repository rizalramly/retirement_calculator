import React, { useState } from 'react';

/**
 * Small "ⓘ" help marker. Shows its tooltip on hover (desktop) and on tap
 * (mobile/Capacitor), so every field can carry a short explanation.
 */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label="More information"
        title={text}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-400 transition hover:border-blue-400 hover:text-blue-500 dark:border-slate-600 dark:text-slate-500"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-52 max-w-[60vw] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug text-white shadow-lg dark:bg-slate-700"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** Labelled numeric input that emits a number on every change. */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  suffix,
  prefix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
  prefix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="field-label flex items-center">
        {label}
        {hint && <InfoTip text={hint} />}
      </span>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          className={`field-input ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`}
          // Show an empty box (with a "0" placeholder) for a zero value so a
          // leading "0" doesn't stick in front of what the user types.
          value={Number.isFinite(value) && value !== 0 ? value : ''}
          placeholder="0"
          step={step}
          min={min}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

/** A titled grouping of fields. */
export function Section({
  title,
  children,
  right,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
          {hint && <InfoTip text={hint} />}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/** A summary metric tile. */
export function MetricCard({
  label,
  value,
  tone = 'default',
  sub,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'epf' | 'personal' | 'wealth' | 'good' | 'bad';
  sub?: string;
}) {
  const tones: Record<string, string> = {
    default: 'text-slate-900 dark:text-slate-100',
    epf: 'text-epf',
    personal: 'text-personal',
    wealth: 'text-wealth',
    good: 'text-green-600 dark:text-green-400',
    bad: 'text-red-600 dark:text-red-400',
  };
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
