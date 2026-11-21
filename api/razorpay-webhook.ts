import {adminClient, hmacHex, json, markPaid, safeEqual} from './_lib.js';

// POST /api/razorpay-webhook
// Backup path: if the customer closes the browser after paying, Razorpay
// still tells us. Set this URL in Razorpay Dashboard → Webhooks with the
// events "payment.captured" and "order.paid".
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return json({error: 'Webhook secret not configured'}, 500);

  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  if (!safeEqual(hmacHex(secret, raw), signature)) return json({error: 'Bad signature'}, 400);

  type Payment = {id: string; order_id: string; amount: number; status: string};
  const event = JSON.parse(raw) as {
    event: string;
    payload?: {payment?: {entity?: Payment}};
  };
  const p = event.payload?.payment?.entity;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && p?.order_id) {
    await markPaid(adminClient(), p.order_id, p.id, p.amount);
  }
  return json({ok: true});
}
