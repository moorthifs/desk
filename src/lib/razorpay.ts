import {apiPost} from './supabase';
import {BUSINESS} from './format';

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {open: () => void; on: (ev: string, cb: (r: unknown) => void) => void};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'));
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout for a return and resolves once the payment is verified. */
export async function payForReturn(
  returnId: string,
  prefill: {name?: string; email?: string; contact?: string},
  description: string,
): Promise<'paid' | 'dismissed'> {
  await loadCheckout();
  const order = await apiPost<{orderId: string; amount: number; keyId: string}>(
    '/api/create-order',
    {returnId},
  );

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: 'INR',
      order_id: order.orderId,
      name: BUSINESS.name,
      description,
      prefill,
      theme: {color: '#C2410C'},
      handler: async (res: RazorpaySuccess) => {
        try {
          await apiPost('/api/verify-payment', res);
          resolve('paid');
        } catch (e) {
          reject(e);
        }
      },
      modal: {ondismiss: () => resolve('dismissed')},
    });
    rzp.on('payment.failed', () => {
      /* Razorpay shows the failure and lets the customer retry inside the popup. */
    });
    rzp.open();
  });
}
