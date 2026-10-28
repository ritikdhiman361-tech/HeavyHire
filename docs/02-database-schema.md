# HeavyHire — Step 2: Database Schema

The real schema lives in [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).
This page explains it in plain words.

## How the tables connect

```
                    ┌──────────────┐
                    │     User     │  (anyone with a phone number)
                    └──────┬───────┘
          has 0 or 1       │        makes many
        ┌──────────────────┼───────────────────┐
        ▼                                      ▼
  ┌──────────┐   owns many   ┌──────────┐  ┌──────────┐
  │  Vendor  │──────────────►│ Machine  │◄─│ Booking  │ (renter books a machine)
  └────┬─────┘               └────┬─────┘  └────┬─────┘
       │                          │             │
       │ gets many                │ has many    ├── BookingEvent  (status history)
       ▼                          ├─ Photos     ├── Payment ── Refund
    Payout ◄──── one per booking ─┼─ Blocks     ├── Payout   (money to vendor)
                                  └─ Category   └── Review   (1 per booking)
```

## The 16 tables in one line each

| Table | What it stores |
|---|---|
| **User** | Everyone who logs in (phone, name, language, admin or not) |
| **OtpCode** | Login codes sent by SMS (stored only as a hash, expire in 5 min) |
| **RefreshToken** | Keeps people logged in on their phone |
| **Vendor** | Machine owner profile: name, ID document, bank/UPI, approval status |
| **Category** | Machine types: JCB, Excavator, Tipper... (English + Hindi names) |
| **Machine** | One physical machine: model, year, photos, location, prices, rating |
| **MachinePhoto** | Photos of a machine (first one is the cover) |
| **MachineBlock** | Dates when the owner says "not available" |
| **Booking** | One rental: who, which machine, when, where, price, status |
| **BookingEvent** | Every status change with time (the booking timeline) |
| **Payment** | Money the renter paid via Razorpay |
| **Refund** | Money returned to the renter |
| **Payout** | Money we send to the vendor after the job |
| **Review** | Star rating + comment after a completed booking |
| **Notification** | Log of every SMS/WhatsApp we sent |
| **Settings** | Commission %, GST %, advance %, vendor reply time (admin-editable) |

## 4 rules worth remembering

1. **Money is in paise.** ₹1,000 is stored as `100000`. Razorpay uses paise too.
2. **Bookings save a price snapshot.** If the vendor changes prices later, old bookings don't change.
3. **One account, two roles.** A user becomes a vendor by creating a `Vendor` profile.
4. **Nothing goes live without approval.** Vendors and machines start as `PENDING`.

## Booking status → what the renter sees

| Status in database | Renter sees |
|---|---|
| PENDING_PAYMENT | (still on the payment screen) |
| REQUESTED | Booked, waiting for owner |
| CONFIRMED | Booked ✓ |
| ON_THE_WAY | On the way 🚚 |
| WORKING | Working 🔧 |
| COMPLETED | Done ✅ |
| REJECTED / EXPIRED | Owner not available, so money is refunded |
| CANCELLED | Cancelled |

## Ready for later (no rebuild needed)
- Weekly/monthly pricing → add `pricePerWeek` / `pricePerMonth` to Machine
- Deposits & damage photos → add a `ConditionCheck` table linked to Booking
- Chat → add `Conversation` + `Message` tables
- More cities → `city` already exists on Vendor and Machine
