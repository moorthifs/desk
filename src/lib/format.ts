import type {TdsReturn, TdsStatus} from './supabase';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const rupees = (n: number | string) => inr.format(Number(n) || 0);

export const dateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const STATUS: Record<
  TdsStatus,
  {label: string; color: 'orange' | 'blue' | 'purple' | 'green' | 'red'}
> = {
  awaiting_payment: {label: 'Payment pending', color: 'orange'},
  paid: {label: 'Paid · in queue', color: 'blue'},
  in_progress: {label: 'Uploading', color: 'purple'},
  uploaded: {label: 'Uploaded', color: 'green'},
  rejected: {label: 'Rejected', color: 'red'},
};

export const FORM_TYPES = [
  {value: '24Q', label: '24Q — Salary'},
  {value: '26Q', label: '26Q — Non-salary (residents)'},
  {value: '27Q', label: '27Q — Non-residents'},
  {value: '27EQ', label: '27EQ — TCS'},
];

export const QUARTERS = [
  {value: 'Q1', label: 'Q1 (Apr–Jun)'},
  {value: 'Q2', label: 'Q2 (Jul–Sep)'},
  {value: 'Q3', label: 'Q3 (Oct–Dec)'},
  {value: 'Q4', label: 'Q4 (Jan–Mar)'},
];

/** Current and previous six financial years, e.g. "2026-27". */
export function financialYears(): string[] {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({length: 7}, (_, i) => {
    const y = start - i;
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  });
}

export const returnTitle = (r: Pick<TdsReturn, 'form_type' | 'quarter' | 'financial_year'>) =>
  `${r.form_type} · ${r.quarter} · FY ${r.financial_year}`;

export const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export const BUSINESS = {
  name: 'Moorthi Financial Services',
  phone: '81900 49996',
  whatsapp: 'https://wa.me/918190049996',
  site: 'taxexpertindia.com',
};
