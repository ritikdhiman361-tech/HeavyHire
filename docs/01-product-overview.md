# HeavyHire — Step 1: Product Overview (simple version)

> Rent a JCB, excavator, tipper or crane in a few taps.

**Design rule:** many of our users are contractors and machine owners who use
WhatsApp every day but rarely use apps. Every screen should work for someone
who has never booked anything online. That means:

- Big buttons, few words, Hindi and English
- Browsing never needs a login. We ask for a phone number only at booking
- One price shown upfront, with no surprise charges
- Booking takes **3 steps**, and adding a machine takes **1 screen**
- Updates come on **WhatsApp**, so nobody has to keep checking the app

---

## 1. Renter (person who needs a machine)

```
1. Choose machine     [ JCB ]  [ Excavator ]  [ Tipper ]  [ Crane ] ...
2. See machines near you  →  photo, price/hour or day, rating, "With operator"
3. Tap a machine  →  "Book"
       Step 1: When?        (date + hours or days)
       Step 2: Where?       (pick site on map or type the address)
       Step 3: Pay          (phone OTP → UPI / card)
4. Done. WhatsApp updates arrive:  Booked ✓ → On the way 🚚 → Working 🔧 → Done ✅
5. Rate the job (1–5 stars)
```

**Price shown to the renter**: one total, e.g. **₹9,440 total** (tap to see the details):
```
Rent (8 hrs × ₹1,000)   ₹8,000
Transport               ₹    0  (included)
GST                     ₹1,440
Total                   ₹9,440
```

**Payment**: the renter pays **once**, either the full amount or a small advance.
If the vendor doesn't confirm within **2 hours**, the money is **refunded
automatically**. The renter never has to come back to "complete" a booking.

**Renter screens (only 5):** Home/Search · Machine page · Book (3 steps) · My bookings · Profile

---

## 2. Vendor (machine owner)

```
1. Sign up with phone OTP → "I want to list my machine"
2. Upload 3 things:  ID (PAN or Aadhaar photo)  ·  Machine RC  ·  Bank account or UPI ID
3. Add machine (one screen):
       type, brand/model, year, 3+ photos, price per hour/day, area (city)
4. Wait for approval (usually within 24 hrs). After that the machine is live.
5. New booking? A WhatsApp message arrives with [Accept] [Reject] buttons
6. During the job, tap one button at each stage:  On the way → Reached site → Job done
7. Money arrives in their bank/UPI after the job is done
```

**Vendor screens (only 4):** My machines · Bookings · Earnings · Profile

---

## 3. Admin (us)

Kept simple, using one dashboard with 4 tabs:
- **Approve**: new vendors and machines (look at the docs, then tap Approve or Reject)
- **Bookings**: see and cancel any booking, and issue refunds
- **Users**: block or unblock people
- **Settings**: commission %, GST %, machine types, cities

Analytics for the MVP is just a few numbers: bookings, revenue and top machines.

---

## 4. What we're deliberately leaving out of the MVP

| Left out | Why it's fine for now |
|---|---|
| Security deposit & damage photo checks | MVP machines always come **with the owner's operator**, so the machine never leaves the owner's control |
| In-app chat | A **Call** button appears after booking, and WhatsApp covers the rest |
| Weekly/monthly pricing, bulk quotes | Most small jobs are hourly or daily. These come in Phase 2 |
| Many filters | Only machine type, price and rating at first |
| Email & push notifications | WhatsApp + SMS reach everyone |
| Mobile app | The website is mobile-first and works like an app. React Native comes later |

These will all be added later. The database will be designed so that adding them
doesn't require a rebuild.

---

## 5. How HeavyHire makes money

1. **Commission:** ~10% of each booking, deducted before paying the vendor (from day 1)
2. **Featured listings:** vendors pay to show at the top of search (later)
3. **Vendor Pro plan:** monthly fee for lower commission + more machines (later)

At launch, charge **0% commission for the first 3 months** to get vendors on board.

---

## 6. MVP launch plan (one city)

- **Launch city: Bengaluru** (big construction market, many small JCB/tipper owners)
- Sign up **30–50 machine owners in person** before launch
- Start with 5 machine types: JCB, Excavator, Tipper, Crane, Road roller

---

## 7. Technical choices (decided — no action needed)

Next.js + Tailwind (web) · Express + TypeScript (API) · PostgreSQL + Prisma ·
Razorpay · Cloudinary (photos) · MSG91 (OTP, SMS, WhatsApp) · Google Maps ·
one repo with shared code for the future mobile app.
