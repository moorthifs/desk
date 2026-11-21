import {adminClient, hmacHex, json, markPaid, razorpayKeys, requireUser, safeEqual} from './_lib.js';

// POST /api/verify-payment
// { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Called by the browser right after Razorpay Checkout succeeds.
export async function POST(request: Request): Promise<Response> {
  try {
    const db = adminClient();
    const userId = await requireUser(request, db);
    if (!userId) return json({error: 'Please sign in again.'}, 401);

    const body = (await request.json().catch(() => ({}))) as Record<string, string | undefined>;
    const orderId = body.razorpay_order_id ?? '';
    const paymentId = body.razorpay_payment_id ?? '';
    const signature = body.razorpay_signature ?? '';
    if (!orderId || !paymentId || !signature) return json({error: 'Missing payment details'}, 400);

    const {keySecret} = razorpayKeys();
    const expected = hmacHex(keySecret, `${orderId}|${paymentId}`);
    if (!safeEqual(expected, signature)) return json({error: 'Payment could not be verified'}, 400);

    const {data: row} = await db
      .from('tds_returns')
      .select('user_id')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();
    if (!row || row.user_id !== userId) return json({error: 'Return not found'}, 404);

    const ok = await markPaid(db, orderId, paymentId);
    return ok ? json({ok: true}) : json({error: 'Could not update the return'}, 500);
  } catch (e) {
    return json({error: (e as Error).message}, 500);
  }
}
