# TDS Upload Portal — Moorthi Financial Services

Online TDS / TCS return upload portal for **taxexpertindia.com**.

Customers (auditors, tax practitioners, companies) sign up, upload the validated
`.fvu` file and signed Form 27A, and pay online. The TIN-FC team downloads the
files, uploads them at the TIN-FC, then posts the token number and the
acknowledgement back to the customer's account.

**Price per return** = Protean TIN-FC upload fee at cost (+ GST) + ₹199 service
charge. The admin can change all fees from **Admin → Fees**.

## Stack

| Part | Tool |
|---|---|
| Screens | React 19 + Vite, [Astryx](https://github.com/meta/astryx) components, custom orange `mfs` theme |
| Login, database, file storage | Supabase (email + password) |
| Payments | Razorpay Checkout (UPI, cards, netbanking) |
| Hosting + payment API | Vercel (static site + 3 functions in `/api`) |

## One-time setup

### 1. Supabase
1. Create a free project at <https://supabase.com> (region: Mumbai).
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, click **Run**.
3. **Authentication → URL Configuration**: set Site URL to `https://taxexpertindia.com`
   (and add `http://localhost:5173` for testing).
4. **Project Settings → API**: copy the Project URL, the `anon` key and the
   `service_role` key.

### 2. Razorpay
1. Sign up at <https://razorpay.com>, complete KYC.
2. **Settings → API Keys**: generate a key (use *Test mode* first).
3. **Settings → Webhooks → Add**: URL `https://taxexpertindia.com/api/razorpay-webhook`,
   events `payment.captured` and `order.paid`, and a secret you choose.

### 3. Vercel
1. Import this GitHub repo at <https://vercel.com/new> (framework: Vite).
2. Add the environment variables from `.env.example`.
3. Deploy, then add the domain `taxexpertindia.com` under **Settings → Domains**.

### 4. Make yourself admin
Sign up on the portal with your own email, then run in the Supabase SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'YOUR-EMAIL';
```

You will now see **Admin queue** and **Fees** in the top bar.

## Daily work (admin)
1. **Admin queue** shows paid returns, oldest first.
2. Open a return → download the FVU file and Form 27A → *Start — mark as uploading*.
3. Upload at TIN-FC, then enter the 15-digit token number, attach the provisional
   receipt, and click **Mark as uploaded**. The customer can download it at once.
4. Use the **WhatsApp** button to tell the customer (message is pre-filled).
5. If the TIN-FC rejects the file, write the reason in the note and click **Reject**.

## Develop locally

```bash
npm install
cp .env.example .env.local   # fill in the VITE_ values
npm run dev                  # screens only
npx vercel dev               # screens + /api payment functions
```

`npm run build` type-checks and builds. `npx astryx doctor --built src` checks the
screens follow Astryx rules.

## Security notes
- Prices are calculated in the database (`quote_fee`), never trusted from the browser.
- Customers can only see their own returns and files (row level security).
- Only the admin can change status, upload acknowledgements or edit fees.
- Payments are confirmed by Razorpay signature checks (browser + webhook).
- Keep `SUPABASE_SERVICE_ROLE_KEY` and Razorpay secrets only in Vercel settings.
