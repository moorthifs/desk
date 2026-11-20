# taxexpertindia.com

Website for **Moorthi Financial Services** — GST, Income Tax, TDS, business registration, compliance and insurance. Offices in Gingee and Thiruvannamalai, Tamil Nadu.

Plain HTML/CSS/JS, no build step. English and Tamil (toggle button in the header). Every enquiry opens WhatsApp to 81900 49996.

## Files
- `index.html` — page content (English text in `data-en`, Tamil in `data-ta`)
- `script.js` — the **service list** (`SERVICES` at the top — add/remove services there), language toggle, WhatsApp enquiry form
- `style.css` — brand colours (orange `#F26B1D`, dark grey `#2B2D31`, white)
- `CNAME` — custom domain for GitHub Pages

## Still to fill in
- Thiruvannamalai branch street address (`index.html`, search `TODO`)
- Instagram profile link (footer, search `TODO`)

## Go live with GitHub Pages
1. Repo **Settings → Pages** → Source: *Deploy from a branch* → `main` / root.
2. At your domain registrar, point `taxexpertindia.com`:
   - `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `moorthifs.github.io`
3. Back in Settings → Pages, tick **Enforce HTTPS** once the certificate is issued.
