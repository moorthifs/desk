import {createClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
);

export const BUCKET = 'tds-files';

export type TdsStatus = 'awaiting_payment' | 'paid' | 'in_progress' | 'uploaded' | 'rejected';

export type TdsReturn = {
  id: string;
  user_id: string;
  tan: string;
  deductor_name: string;
  form_type: '24Q' | '26Q' | '27Q' | '27EQ';
  financial_year: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  statement_type: 'regular' | 'correction';
  record_count: number;
  customer_note: string;
  fvu_path: string | null;
  form27a_path: string | null;
  extra_path: string | null;
  tin_fee: number;
  tin_gst: number;
  service_fee: number;
  service_gst: number;
  total_amount: number;
  status: TdsStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  token_number: string | null;
  ack_path: string | null;
  admin_note: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  firm_name: string;
  phone: string;
  email: string;
  is_admin: boolean;
};

export type FeeSettings = {
  slab1_fee: number;
  slab2_fee: number;
  slab3_fee: number;
  tin_gst_rate: number;
  service_charge: number;
  service_gst_rate: number;
};

export type Quote = {
  tin_fee: number;
  tin_gst: number;
  service_fee: number;
  service_gst: number;
  total_amount: number;
};

/** Mirrors public.quote_fee() in the database (the database result is what is charged). */
export function quoteFrom(fees: FeeSettings, records: number): Quote {
  const n = Number(records) || 0;
  const tin_fee = n <= 100 ? +fees.slab1_fee : n <= 1000 ? +fees.slab2_fee : +fees.slab3_fee;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const tin_gst = r2((tin_fee * +fees.tin_gst_rate) / 100);
  const service_fee = +fees.service_charge;
  const service_gst = r2((service_fee * +fees.service_gst_rate) / 100);
  const total_amount = Math.round(tin_fee + tin_gst + service_fee + service_gst);
  return {tin_fee, tin_gst, service_fee, service_gst, total_amount};
}

export async function downloadFile(path: string) {
  const {data, error} = await supabase.storage.from(BUCKET).createSignedUrl(path, 120, {
    download: path.split('/').pop(),
  });
  if (error || !data) throw error ?? new Error('Could not get file');
  window.open(data.signedUrl, '_blank', 'noopener');
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const {data} = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  const out = (await res.json().catch(() => ({}))) as T & {error?: string};
  if (!res.ok) throw new Error(out.error ?? `Request failed (${res.status})`);
  return out;
}
