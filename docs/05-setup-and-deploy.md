# HeavyHire — Step 6: Setup, Environment Variables & Deployment

For running on your own computer, see the [README](../README.md).
This page is about **going live**.

```
 Renters / vendors (phone browser)
            │
            ▼
   Vercel  ── website (apps/web) ──────►  Render ── API (apps/api) ──► Neon (PostgreSQL)
                                              │
                    Razorpay ◄── payments ────┤──── webhooks ──► Razorpay calls the API back
                    MSG91    ◄── OTP + WhatsApp
                    Cloudinary ◄── photos & documents (uploaded straight from the phone)
```

---

## 1. Accounts to create (in this order)

| # | Service | What for | Time to get approved | Cost to start |
|---|---|---|---|---|
| 1 | **GitHub** | Store the code; Vercel and Render deploy from it | instant | free |
| 2 | **Neon** (neon.tech) | PostgreSQL database. Pick region **AWS Asia Pacific (Mumbai/Singapore)** | instant | free tier |
| 3 | **Cloudinary** | Machine photos, ID and RC documents | instant | free tier |
| 4 | **MSG91** | OTP SMS + WhatsApp messages | **DLT registration takes 3–7 days**, so start early | pay per SMS |
| 5 | **Razorpay** | UPI, card and netbanking payments, refunds | **KYC + website review takes days** | 2% per payment |
| 6 | **Render** | Runs the API | instant | ~$7/month (Starter) |
| 7 | **Vercel** | Runs the website | instant | free (Hobby) |
| 8 | **Google Cloud** (optional) | Places search for addresses | instant | free credit |

### MSG91 setup (the slowest part)
1. **DLT registration** (required by TRAI for all business SMS in India): register your business as a "Principal Entity" on a DLT portal (e.g. Jio/Vodafone), then register:
   - a **Sender ID** (header), e.g. `HVYHIR`
   - an **OTP template**, e.g. `Your HeavyHire login OTP is ##OTP##. Valid for 5 minutes. Do not share it.`
2. In MSG91 → **OTP** → create a template linked to that DLT template → copy its **Template ID** → `MSG91_OTP_TEMPLATE_ID`.
3. **WhatsApp**: MSG91 → WhatsApp → connect a WhatsApp Business number → `MSG91_WHATSAPP_NUMBER` (digits only, with 91).
4. Create one **WhatsApp template per message** in [apps/api/src/modules/notifications/templates.ts](../apps/api/src/modules/notifications/templates.ts).
   Use the **same name** (e.g. `booking_confirmed`) and the variables `{{1}}`, `{{2}}`... in the same order, in **English (en)** and **Hindi (hi)**. Meta approves them in a few hours.
5. Copy the **Auth Key** → `MSG91_AUTH_KEY`.

### Razorpay setup
1. Finish account KYC. Razorpay checks that your live website shows pricing, terms, refund policy, privacy policy and contact details, so have those pages ready.
2. Settings → **API Keys** → generate → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Use **Test mode** keys first.
3. Settings → **Payment capture** → make sure it's **Automatic**.
4. Settings → **Webhooks** → add:
   - URL: `https://YOUR-API.onrender.com/api/v1/webhooks/razorpay`
   - Secret: any long random string → `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `refund.processed`, `refund.failed`

### Cloudinary setup
Dashboard → copy **Cloud name**, **API Key**, **API Secret**. Nothing else is needed: the API signs every upload, and ID/RC documents are stored as private ("authenticated") files.

---

## 2. Environment variables

### API (`apps/api`, set on Render)

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Turns off all dev-mode fakes |
| `PORT` | (set by Render) | |
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/heavyhire?sslmode=require` | Use Neon's **direct** (non-pooled) connection string |
| `WEB_URL` | `https://heavyhire.in,https://www.heavyhire.in` | Allowed website addresses (CORS). Comma-separated |
| `API_URL` | `https://heavyhire-api.onrender.com` | Used in links |
| `JWT_ACCESS_SECRET` | 64 random hex chars | `openssl rand -hex 32`. Changing it logs everyone out |
| `FILE_URL_SECRET` | 64 random hex chars | Signs private document links |
| `ADMIN_PHONE` | `9876543210` | Becomes admin when you run the seed |
| `MSG91_AUTH_KEY` | | required in production |
| `MSG91_OTP_TEMPLATE_ID` | | required in production |
| `MSG91_WHATSAPP_NUMBER` | `919876543210` | optional; without it no WhatsApp messages are sent |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | required in production |
| `RAZORPAY_KEY_SECRET` | | required in production |
| `RAZORPAY_WEBHOOK_SECRET` | | required in production |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | | required in production |

### Website (`apps/web`, set on Vercel)

| Variable | Example | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://heavyhire-api.onrender.com` | No trailing slash |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `AIza...` | Optional. Restrict it to your domain in Google Cloud |

> Anything starting with `NEXT_PUBLIC_` is visible in the browser. Never put secrets there.

---

## 3. Deploy step by step

### Step A: Put the code on GitHub
```bash
git add .
git commit -m "HeavyHire MVP"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/heavyhire.git
git push -u origin main
```

### Step B: Database on Neon
1. Create a project → region Mumbai/Singapore → database name `heavyhire`.
2. Copy the **direct** connection string → this is `DATABASE_URL`.

### Step C: API on Render
1. Render → **New → Blueprint** → choose your repo. It reads [render.yaml](../render.yaml).
2. Fill in the secrets it asks for (table above). `JWT_ACCESS_SECRET` and `FILE_URL_SECRET` are generated for you.
3. Deploy. The build also runs `prisma migrate deploy`, which creates the tables.
4. Add starter data **once**, from your computer:
   ```bash
   cd apps/api
   DATABASE_URL="<neon url>" ADMIN_PHONE=9876543210 NODE_ENV=production pnpm exec tsx prisma/seed.ts
   ```
   (`NODE_ENV=production` skips the demo vendor and machines.)
5. Open `https://YOUR-API.onrender.com/health`. It should show `{"status":"ok"}`.

> Use the **Starter** plan, not Free. Free servers sleep after 15 minutes, and then
> unanswered bookings don't expire or get refunded on time.

### Step D: Website on Vercel
1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory**: `apps/web`. Vercel detects Next.js and pnpm automatically.
3. Environment variables: `NEXT_PUBLIC_API_URL` (and the Maps key if you have one).
4. Deploy. Then add your domain (e.g. `heavyhire.in`) in Vercel → Domains.
5. Go back to Render and set `WEB_URL` to the Vercel/domain URL so the browser is allowed to call the API.

### Step E: Connect the services
- Razorpay webhook URL → your Render API (see Razorpay setup above).
- Test the whole flow with **Razorpay test keys**: book → pay with test UPI `success@razorpay` → vendor accepts → complete → review.
- Then switch to **live keys** in Render.

---

## 4. Before launch checklist

- [ ] Real MSG91, Razorpay **live** and Cloudinary keys on Render
- [ ] Razorpay webhook added and showing successful deliveries
- [ ] All WhatsApp templates approved (EN + HI)
- [ ] Admin phone works and `/admin` opens
- [ ] **CA confirmed** the GST rate and whether HeavyHire or the vendor issues the GST invoice; also whether TCS (Section 52) applies. Update **Admin → Settings** if needed
- [ ] Terms, privacy, refund/cancellation policy pages published (Razorpay needs them)
- [ ] Support phone/WhatsApp number in `messages/en.json` + `hi.json` (`profile.help`)
- [ ] 30–50 Bengaluru vendors onboarded and their machines approved
- [ ] Daily backup on Neon (enabled by default; check restore works)

## 5. Day-to-day operations (admin)

| Task | Where | How often |
|---|---|---|
| Approve new vendors and machines | Admin → Approve | Daily (promise: within 24 h) |
| Pay vendors | Admin → Settings → Pending payouts: send by UPI/bank, paste the UTR | Every 2 working days |
| Handle complaints, refunds | Admin → Bookings → search HH-number or phone | As needed |
| Change commission / GST / timings | Admin → Settings | Rarely |

## 6. What to build next (Phase 2)

1. **Automatic vendor payouts** with Razorpay Route (`razorpayAccountId` is already in the database)
2. Google Map pin on the booking page (drag to the exact gate)
3. Weekly / monthly prices and **request a quote** for big projects
4. In-app chat; push notifications
5. Pickup/return condition photos + security deposit (for machines without operator)
6. React Native app (Expo) reusing `packages/shared` and the same API
7. Featured listings and vendor Pro plan (see the revenue model in [01-product-overview.md](01-product-overview.md))
