# HeavyHire — Step 3: API Endpoints

## Basics

- **Base URL:** `https://api.heavyhire.in/api/v1` (local: `http://localhost:4000/api/v1`)
- **Format:** JSON in, JSON out
- **Login:** send the token in a header → `Authorization: Bearer <accessToken>`
- **Money:** always in **paise** (₹1,000 = `100000`)
- **Lists** accept `?page=1&limit=20`

**Every response looks the same:**
```jsonc
// success
{ "success": true, "data": { ... } }
// list
{ "success": true, "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 57 } }
// error
{ "success": false, "error": { "code": "MACHINE_NOT_AVAILABLE", "message": "Machine is booked on these dates" } }
```

**Who can call it** (the 🔒 column):
`—` anyone · `U` logged-in user · `V` approved vendor · `A` admin

---

## 1. Auth (login)

| Method | Path | 🔒 | What it does |
|---|---|---|---|
| POST | `/auth/otp/send` | — | Send a 6-digit OTP by SMS. Body: `{ phone }` |
| POST | `/auth/otp/verify` | — | Check the OTP, create the user if new, return tokens. Body: `{ phone, code }` |
| POST | `/auth/refresh` | — | Get a new access token. Body: `{ refreshToken }` |
| POST | `/auth/logout` | U | Log out this device |
| GET | `/me` | U | My profile (+ vendor profile if I am one) |
| PATCH | `/me` | U | Update name, email, language |

```jsonc
// POST /auth/otp/verify → response
{ "success": true, "data": {
  "accessToken": "eyJ...", "refreshToken": "f3a9...",
  "user": { "id": "clx..", "phone": "+919876543210", "name": null, "isNew": true, "vendor": null }
}}
```

## 2. Categories & machines (public, no login needed)

| Method | Path | 🔒 | What it does |
|---|---|---|---|
| GET | `/categories` | — | Machine types for the home screen (JCB, Excavator...) |
| GET | `/machines/search` | — | Find machines (filters below) |
| GET | `/machines/:id` | — | Machine details page: photos, specs, prices, vendor, rating |
| GET | `/machines/:id/availability` | — | Busy dates for the calendar. `?month=2026-11` |
| GET | `/machines/:id/reviews` | — | Reviews, newest first |
| POST | `/machines/:id/price` | — | Price preview before booking. Body: `{ unit, quantity }` |

**Search filters:**
`?category=jcb&lat=12.97&lng=77.59&date=2026-11-05&unit=HOUR&maxPrice=150000&minRating=4&sort=nearest|price|rating`

```jsonc
// POST /machines/:id/price → response (the breakdown shown to the renter)
{ "success": true, "data": {
  "rate": 100000, "quantity": 8, "rentAmount": 800000, "transportAmount": 0,
  "gstPercent": 18, "gstAmount": 144000, "totalAmount": 944000,
  "advanceAmount": 236000
}}
```

## 3. Uploads

| Method | Path | 🔒 | What it does |
|---|---|---|---|
| POST | `/uploads/sign` | U | Get a Cloudinary signature; the app then uploads the photo **directly** to Cloudinary (faster, saves server bandwidth) |
| POST | `/uploads/local` | U | Dev mode only (no Cloudinary keys): upload to the API's disk |
| GET | `/uploads/private/:file` | signed link | Dev mode only: view a private document with a 15-minute link |

## 4. Bookings (renter)

| Method | Path | 🔒 | What it does |
|---|---|---|---|
| POST | `/bookings` | U | Create booking + Razorpay order (see below) |
| POST | `/bookings/:id/payments/verify` | U | After paying, the app sends Razorpay's proof → booking becomes REQUESTED |
| GET | `/bookings` | U | My bookings. `?status=active\|past` |
| GET | `/bookings/:id` | U | Booking details + timeline + vendor phone (after confirm) |
| POST | `/bookings/:id/cancel` | U | Cancel; refund is calculated from Settings rules |
| POST | `/bookings/:id/review` | U | Rate 1–5 + comment (only after COMPLETED) |

```jsonc
// POST /bookings → body
{ "machineId": "clx..", "unit": "HOUR", "quantity": 8, "startAt": "2026-11-05T09:00:00+05:30",
  "siteAddress": "Plot 12, Whitefield, Bengaluru", "siteLat": 12.969, "siteLng": 77.749,
  "notes": "Narrow gate", "paymentPlan": "FULL" }

// → response: the app opens Razorpay Checkout using razorpayOrderId
{ "success": true, "data": {
  "booking": { "id": "clx..", "bookingNumber": "HH-1001", "status": "PENDING_PAYMENT", "totalAmount": 944000 },
  "payment": { "razorpayOrderId": "order_Nx..", "amount": 944000, "keyId": "rzp_test_..." }
}}
```

## 5. Vendor

| Method | Path | 🔒 | What it does |
|---|---|---|---|
| POST | `/vendor` | U | Become a vendor (business name, ID doc, bank/UPI) → status PENDING |
| GET | `/vendor` | U | My vendor profile + approval status |
| PATCH | `/vendor` | V | Update profile / bank details |
| GET | `/vendor/dashboard` | V | Today's jobs, new requests, this month's earnings |
| **Machines** | | | |
| GET | `/vendor/machines` | V | My machines |
| POST | `/vendor/machines` | V | Add a machine (with photos) → status PENDING |
| PATCH | `/vendor/machines/:id` | V | Edit details/prices (big changes send it back for approval) |
| POST | `/vendor/machines/:id/pause` | V | Hide from search |
| POST | `/vendor/machines/:id/resume` | V | Show in search again |
| POST | `/vendor/machines/:id/blocks` | V | Mark dates "not available". Body: `{ startAt, endAt, reason }` |
| DELETE | `/vendor/machines/:id/blocks/:blockId` | V | Remove a blocked date |
| **Bookings** | | | |
| GET | `/vendor/bookings` | V | My bookings. `?status=new\|upcoming\|ongoing\|past` |
| GET | `/vendor/bookings/:id` | V | Details incl. renter phone & site location |
| POST | `/vendor/bookings/:id/accept` | V | Accept. Body: `{ operatorName, operatorPhone }` |
| POST | `/vendor/bookings/:id/reject` | V | Reject → renter refunded automatically. Body: `{ reason }` |
| POST | `/vendor/bookings/:id/status` | V | Move forward: `ON_THE_WAY` → `WORKING` → `COMPLETED` |
| **Money** | | | |
| GET | `/vendor/payouts` | V | Payout history + pending amount |

## 6. Admin

| Method | Path | 🔒 | What it does |
|---|---|---|---|
| GET | `/admin/stats` | A | Bookings, revenue, top machines (for date range) |
| GET | `/admin/vendors` | A | List. `?status=PENDING` = approval queue |
| GET | `/admin/vendors/:id` | A | Vendor + documents + machines |
| POST | `/admin/vendors/:id/approve` | A | Approve |
| POST | `/admin/vendors/:id/reject` | A | Reject. Body: `{ reason }` |
| GET | `/admin/machines` | A | List. `?status=PENDING` = approval queue |
| GET | `/admin/machines/:id` | A | Machine + RC + photos |
| POST | `/admin/machines/:id/approve` | A | Approve → goes live |
| POST | `/admin/machines/:id/reject` | A | Reject. Body: `{ reason }` |
| GET | `/admin/bookings` | A | All bookings, search by number/phone |
| GET | `/admin/bookings/:id` | A | Full details, payments, timeline |
| POST | `/admin/bookings/:id/cancel` | A | Cancel any booking |
| POST | `/admin/bookings/:id/refund` | A | Refund. Body: `{ amount, reason }` |
| GET | `/admin/payouts` | A | Payouts. `?status=PENDING` |
| POST | `/admin/payouts/:id/mark-paid` | A | Record a manual payout. Body: `{ reference }` |
| GET | `/admin/users` | A | Search users by phone/name |
| POST | `/admin/users/:id/block` | A | Block a user |
| POST | `/admin/users/:id/unblock` | A | Unblock |
| GET | `/admin/categories` | A | All categories |
| POST | `/admin/categories` | A | Add a category |
| PATCH | `/admin/categories/:id` | A | Edit / hide a category |
| GET | `/admin/settings` | A | Commission %, GST %, etc. |
| PATCH | `/admin/settings` | A | Change them |

## 7. Webhooks (called by other services, not by our app)

| Method | Path | Called by | What it does |
|---|---|---|---|
| POST | `/webhooks/razorpay` | Razorpay | Confirms payments/refunds even if the user closed the app. Checked with a signature. |

## 8. Background jobs (run automatically, no endpoint)

| Job | How often | What it does |
|---|---|---|
| Expire bookings | every minute | REQUESTED bookings past `vendorReplyBy` → EXPIRED + full refund |
| Clean unpaid | every 15 min | PENDING_PAYMENT older than 30 min → removed (frees the dates) |
| Reminders | every hour | WhatsApp the vendor 1 hr before the job starts |

## 9. Health

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Returns `ok` (Render uses it to check the server is alive) |

**Total: about 60 endpoints.**

### Changes made while building (simpler for users)
- **No balance payment online.** On the advance plan, the renter pays the rest to the operator at site. The advance always covers HeavyHire's commission, so vendor payouts are simply *paid online − commission*.
- **No WhatsApp button webhook.** WhatsApp messages contain a link to the vendor's bookings page instead. Inbound button callbacks were fragile, and vendors stay logged in for 30 days.
