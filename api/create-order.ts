import {adminClient, json, razorpayKeys, requireUser} from './_lib.js';

// POST /api/create-order  { returnId }
// Creates (or reuses) a Razorpay order for an unpaid return owned by the caller.
export async function POST(request: Request): Promise<Response> {
  try {
    const db = adminClient();
    const userId = await requireUser(request, db);
    if (!userId) return json({error: 'Please sign in again.'}, 401);

    const {returnId} = (await request.json().catch(() => ({}))) as {returnId?: string};
    if (!returnId) return json({error: 'returnId is required'}, 400);

    const {data: row} = await db
      .from('tds_returns')
      .select('id,user_id,status,total_amount,razorpay_order_id,fvu_path,form27a_path,tan,form_type,quarter,financial_year')
      .eq('id', returnId)
      .maybeSingle();
    if (!row || row.user_id !== userId) return json({error: 'Return not found'}, 404);
    if (row.status !== 'awaiting_payment') return json({error: 'This return is already paid.'}, 409);
    if (!row.fvu_path || !row.form27a_path) {
      return json({error: 'Please upload the FVU file and Form 27A first.'}, 400);
    }

    const amount = Math.round(Number(row.total_amount) * 100); // paise
    const {keyId, keySecret} = razorpayKeys();

    // Reuse the order from an earlier attempt, so a late payment on it is still matched.
    if (row.razorpay_order_id) return json({orderId: row.razorpay_order_id, amount, keyId});

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: row.id.replace(/-/g, '').slice(0, 40),
        notes: {
          return_id: row.id,
          tan: row.tan,
          form: `${row.form_type} ${row.quarter} ${row.financial_year}`,
        },
      }),
    });
    const order = (await res.json()) as {id?: string; error?: {description?: string}};
    if (!res.ok || !order.id) {
      return json({error: order.error?.description ?? 'Could not start payment.'}, 502);
    }

    await db.from('tds_returns').update({razorpay_order_id: order.id}).eq('id', row.id);
    return json({orderId: order.id, amount, keyId});
  } catch (e) {
    return json({error: (e as Error).message}, 500);
  }
}
