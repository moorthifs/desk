import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {createHmac, timingSafeEqual} from 'node:crypto';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {persistSession: false, autoRefreshToken: false},
  });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  });
}

/** Returns the signed-in user's id from the "Authorization: Bearer <token>" header. */
export async function requireUser(request: Request, db: SupabaseClient): Promise<string | null> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const {data, error} = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function razorpayKeys() {
  return {keyId: env('RAZORPAY_KEY_ID'), keySecret: env('RAZORPAY_KEY_SECRET')};
}

/** Marks a return as paid. Idempotent: only moves rows still awaiting payment. */
export async function markPaid(
  db: SupabaseClient,
  orderId: string,
  paymentId: string,
  amountPaise?: number,
): Promise<boolean> {
  const {data: row} = await db
    .from('tds_returns')
    .select('id,total_amount,status')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!row) return false;
  if (row.status !== 'awaiting_payment') return true; // already handled
  if (amountPaise !== undefined && Math.round(Number(row.total_amount) * 100) !== amountPaise) {
    return false;
  }
  const {error} = await db
    .from('tds_returns')
    .update({status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString()})
    .eq('id', row.id)
    .eq('status', 'awaiting_payment');
  return !error;
}
