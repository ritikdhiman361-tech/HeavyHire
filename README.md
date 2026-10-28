# 🚜 HeavyHire

Rent JCBs, excavators, tippers, cranes and road rollers in Bengaluru, from verified owners, with an operator included.

```
apps/web         → website (Next.js 16 + Tailwind 4): renter, vendor and admin screens, English + Hindi
apps/api         → server (Express 5 + Prisma 6 + PostgreSQL)
packages/shared  → price calculation, statuses and form rules used by both
docs/            → product overview, database, API list, folder structure, setup & deploy
```

## Run it on your computer (10 minutes)

You need **Node.js 20+**, **pnpm** (`npm i -g pnpm`) and **PostgreSQL** (`brew install postgresql@18 && brew services start postgresql@18`).

```bash
# 1. Install everything
pnpm install

# 2. Create the database
createdb heavyhire

# 3. Settings for the API
cp apps/api/.env.example apps/api/.env
#    then open apps/api/.env and fill in:
#      DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/heavyhire
#      JWT_ACCESS_SECRET and FILE_URL_SECRET  → run `openssl rand -hex 32` twice
#      ADMIN_PHONE=your 10-digit mobile number

# 4. Settings for the website
cp apps/web/.env.example apps/web/.env.local

# 5. Create the tables and add starter data
pnpm db:migrate
pnpm db:seed

# 6. Start both (API on :4000, website on :3000)
pnpm dev
```

Open http://localhost:3000.

### Dev mode (no paid accounts needed)

While Razorpay, MSG91 and Cloudinary keys are empty, the app uses safe fakes:

| Service | In dev mode |
|---|---|
| OTP SMS (MSG91) | The OTP is shown on the login screen and printed in the API terminal |
| WhatsApp (MSG91) | Messages are printed in the API terminal |
| Payments (Razorpay) | Payment is simulated; refunds are simulated too |
| Photos (Cloudinary) | Files are saved in `apps/api/uploads/` |

Production refuses to start without the real keys, so fake mode can never go live by accident.

### Test accounts (created by the seed)

| Who | Phone | What to try |
|---|---|---|
| Admin | your `ADMIN_PHONE` | `/admin`: approve, refunds, payouts, settings |
| Demo vendor "Raju Earthmovers" | 8888888888 | `/vendor/bookings`: accept, then On the way → Working → Done |
| Renter | any other number | Search → book → pay |

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start API + website |
| `pnpm test` | Run the tests (price maths, refunds, time zones) |
| `pnpm typecheck` | Check TypeScript in all packages |
| `pnpm db:migrate` | Apply database changes after editing `schema.prisma` |
| `pnpm db:studio` | Open a spreadsheet-like view of the database |
| `pnpm build` | Production build |

## Going live

See [docs/05-setup-and-deploy.md](docs/05-setup-and-deploy.md): accounts to create, every environment variable, and step-by-step deployment to **Vercel** (website) + **Render** (API) + **Neon** (database).
