# Horizon Bank

A modern, full-stack fintech banking application with a glassmorphic dark UI, passwordless authentication, bank account linking, and fund transfers.

Built with **Next.js 14**, **Express.js**, **Prisma**, **PostgreSQL**, **Plaid**, and **Razorpay**.

---

## Features

### Authentication
- **Passwordless OTP login** — Enter email, receive a 6-digit code, verify
- **Google Sign-In** — One-click Google OAuth
- **JWT sessions** with token versioning for instant logout/revocation
- **MASTER_OTP** — Use `123456` in development to skip email sending

### Banking Dashboard
- **Bank account linking** via Plaid (sandbox mode)
- **Real-time balances** fetched from Plaid on each page load
- **Transaction history** with pagination and category badges
- **Multi-account support** — Link multiple banks, switch between tabs
- **Doughnut chart** — Visual breakdown of account balances

### Payments & Transfers
- **Fund transfers** between linked bank accounts (Razorpay integration)
- **Transaction recording** — All transfers stored in PostgreSQL
- **Recipient lookup** by sharable ID

### Design
- **Glassmorphic dark theme** — Frosted glass cards, animated gradients
- **Collapsible sidebar** — 72px icon rail, expands to 240px on hover
- **3D bank cards** — Perspective tilt + shimmer shine on hover
- **Bottom tab bar** on mobile (Revolut-style)
- **Animated gradient blobs** on auth pages
- **6-digit OTP input boxes** with auto-focus and auto-submit

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Express.js, TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL (Neon / Supabase — your choice) |
| **Auth** | Custom JWT + OTP (jose, Resend) + Google OAuth |
| **Bank Data** | Plaid API (sandbox) |
| **Payments** | Razorpay (test mode) |
| **Email** | Resend |

---

## Project Structure

```
bank/
├── frontend/                    # Next.js 14 (port 3003)
│   ├── app/
│   │   ├── (auth)/              # Sign-in / Sign-up pages
│   │   └── (root)/              # Protected dashboard pages
│   ├── components/              # 24 React components
│   ├── lib/
│   │   └── api/                 # API client (fetch wrappers)
│   └── constants/               # Style configs
│
├── backend/                     # Express API (port 8787)
│   ├── src/
│   │   ├── routes/              # 6 route files
│   │   ├── services/            # 8 service files
│   │   ├── middleware/          # JWT auth middleware
│   │   └── lib/                 # Prisma client, Plaid client
│   └── prisma/
│       └── schema.prisma        # Database schema
│
├── shared/                      # Shared between frontend & backend
│   ├── types.ts                 # TypeScript types
│   └── validators.ts            # Zod schemas, utilities
│
└── package.json                 # Root scripts (dev:frontend, dev:backend)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) or [Supabase](https://supabase.com) — see below)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Set up your database

#### Option A: Neon (Recommended)
1. Sign up at [neon.tech](https://neon.tech) (free tier: 512MB)
2. Create a project
3. Copy the connection string

#### Option B: Supabase
1. Sign up at [supabase.com](https://supabase.com) (free tier: 500MB)
2. Create a project
3. Go to Settings > Database > Connection string (URI)

#### Option C: Local PostgreSQL
```bash
brew install postgresql@16
brew services start postgresql@16
createdb horizon_bank
```

> **Why Neon is recommended over Supabase (for this project)**
>
> Both are hosted PostgreSQL, and this project supports either — but **Neon is the better fit** when you only need a database:
>
> | | Neon | Supabase |
> |---|------|---------|
> | **Philosophy** | Database-first | Backend platform with DB inside |
> | **What you get** | Pure PostgreSQL, nothing else | DB + Auth + Storage + APIs + RLS policies (unused overhead) |
> | **Connection** | Direct to Postgres, built-in pooling | Often routed through PostgREST/API layers, adds latency |
> | **ORM freedom** | Use Prisma, Drizzle, raw SQL — zero constraints | Encourages its own SDK and patterns (subtle vendor lock-in) |
> | **DB branching** | Git-like branches for testing/preview/experiments | No true DB branching |
> | **Free tier projects** | ~100 projects | 2 projects |
> | **Mental model** | "I have a database" | "I have a backend platform" |
>
> Since this project already has its own auth, backend, and API layer — Supabase's extra features (Auth, Storage, Edge Functions) go completely unused. Using Supabase only for its database is like using Firebase but ignoring everything except Firestore.
>
> **Bottom line**: If you only need PostgreSQL, Neon is cleaner, more flexible, and gives you more room to grow. But if you prefer Supabase, it works too — just swap the connection string.

### 3. Configure environment variables

**Backend** — Create `backend/.env`:
```env
# DATABASE (paste your Neon/Supabase/local connection string)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

# AUTH
JWT_SECRET=generate-a-random-64-character-hex-string-here
MASTER_OTP=123456
OTP_EXPIRY_MINUTES=5

# EMAIL (optional — MASTER_OTP skips email in dev)
RESEND_API_KEY=
EMAIL_FROM=Horizon Bank <noreply@yourdomain.com>

# PLAID (get from https://dashboard.plaid.com)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# RAZORPAY (get from https://dashboard.razorpay.com — use Test Mode keys)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# GOOGLE OAUTH (optional — get from Google Cloud Console)
GOOGLE_CLIENT_ID=

# APP
FRONTEND_URL=http://localhost:3003
COOKIE_DOMAIN=localhost
PORT=8787
```

**Frontend** — Create `frontend/.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
API_URL=http://localhost:8787
NEXT_PUBLIC_SITE_URL=http://localhost:3003
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

### 4. Run database migration

```bash
cd backend
npx prisma migrate dev --name init
```

This creates 4 tables: `users`, `banks`, `transactions`, `otp_codes`.

### 5. Start the app

```bash
# Terminal 1 — Backend (port 8787)
npm run dev:backend

# Terminal 2 — Frontend (port 3003)
npm run dev:frontend
```

Open [http://localhost:3003](http://localhost:3003).

### 6. Test the app

1. Go to `/sign-up` and fill in the form, click "Send Verification Code"
2. Enter `123456` (MASTER_OTP) as the verification code
3. Link a sandbox bank via Plaid (use credentials: `user_good` / `pass_good`)
4. View your dashboard with balances and transactions
5. Try a fund transfer from the Payment Transfer page

---

## API Endpoints

### Auth (Public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/request-signin-otp` | Send OTP to email |
| POST | `/api/auth/verify-signin-otp` | Verify OTP and sign in |
| POST | `/api/auth/request-signup-otp` | Send OTP for new account |
| POST | `/api/auth/verify-signup-otp` | Verify OTP and create account |
| POST | `/api/auth/google` | Sign in with Google ID token |

### Auth (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout (revokes all sessions) |

### Accounts (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts` | Get all accounts with Plaid balances |
| GET | `/api/accounts/:bankRecordId` | Get account details + transactions |

### Banks (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/banks` | List connected banks |
| GET | `/api/banks/:id` | Get bank by ID |
| GET | `/api/banks/by-account/:accountId` | Get bank by Plaid account ID |

### Transactions (Protected)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions` | Create a transaction |
| GET | `/api/transactions/by-bank/:bankId` | Get transactions by bank |

### Plaid (Protected)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/plaid/create-link-token` | Create Plaid Link token |
| POST | `/api/plaid/exchange-token` | Exchange Plaid public token |

### Transfers (Protected)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transfers` | Create a fund transfer |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API health check |

---

## Database Schema

```
+--------------+     +--------------+     +------------------+
|    users     |     |    banks     |     |  transactions    |
+--------------+     +--------------+     +------------------+
| id (PK)      |<----| userId (FK)  |     | id (PK)          |
| email        |     | bankId       |     | name             |
| firstName    |     | accountId    |     | amount           |
| lastName     |     | accessToken  |     | senderId (FK)    |
| address1     |     | shareableId  |     | senderBankId(FK) |
| city/state   |     | razorpay...  |     | receiverId (FK)  |
| postalCode   |     | createdAt    |     | receiverBank(FK) |
| dateOfBirth  |     +--------------+     | email            |
| ssn          |                          | channel          |
| razorpay...  |     +--------------+     | category         |
| googleId     |     |  otp_codes   |     | createdAt        |
| tokenVersion |     +--------------+     +------------------+
| createdAt    |     | id (PK)      |
| updatedAt    |     | email        |
+--------------+     | otpHash      |
                     | expiresAt    |
                     | used         |
                     | createdAt    |
                     +--------------+
```

---

## Authentication Flow

```
  User (React)              Backend (Express)              Database (Neon)
      |                           |                              |
      |--- enter email ---------->|                              |
      |                           |--- generate OTP hash ------->|
      |                           |--- send email via Resend     |
      |                           |                              |
      |--- enter OTP ------------>|                              |
      |                           |--- verify hash ------------->|
      |                           |--- create JWT                |
      |<-- set httpOnly cookie ---|                              |
      |                           |                              |
      |--- every request -------->|                              |
      |   (cookie auto-sent)      |--- verify JWT                |
      |                           |--- check tokenVersion ------>|
      |                           |                              |
      |--- logout --------------->|                              |
      |                           |--- increment tokenVersion -->|
      |<-- clear cookie ----------|   (all JWTs now invalid)     |
```

**Logout** increments `tokenVersion` in the database, instantly invalidating all existing JWTs for that user — even ones on other devices.

---

## Switching Database Providers

This project uses **Prisma ORM**, which works with any PostgreSQL provider. To switch:

1. Get a connection string from your preferred provider
2. Update `DATABASE_URL` and `DIRECT_URL` in `backend/.env`
3. Run `npx prisma migrate dev`

| Provider | Connection String Format |
|----------|------------------------|
| **Neon** | `postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require` |
| **Supabase** | `postgresql://postgres.ref:pass@aws-0-region.pooler.supabase.com:6543/postgres` |
| **Local** | `postgresql://postgres:postgres@localhost:5432/horizon_bank` |
| **Render** | `postgresql://user:pass@host.render.com/dbname` |

No code changes needed. Just swap the URL.

---

## Deployment (Render)

### Backend
- **Type**: Web Service
- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`
- **Environment**: Set all backend env vars

### Frontend
- **Type**: Web Service
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Set all frontend env vars (point `API_URL` to backend service URL)

### Database
- Use **Neon** or **Supabase** free tier (no need to host PostgreSQL on Render)

---

## Test Mode / Sandbox

This project runs entirely in test/sandbox mode — perfect for portfolio demos:

| Service | Mode | What it means |
|---------|------|--------------|
| **Plaid** | Sandbox | Fake test banks, no real bank data. Credentials: `user_good` / `pass_good` |
| **Razorpay** | Test | No real money moves. Use test API keys from dashboard |
| **Resend** | Free tier | 100 emails/day. Or use `MASTER_OTP=123456` to skip emails |
| **Neon/Supabase** | Free tier | Real database, fully functional |

---

## Neon vs Aiven — Full Comparison

If you're evaluating managed PostgreSQL providers beyond Neon and Supabase, here's how **Neon** (serverless) stacks up against **Aiven** (traditional managed infrastructure):

| Factor | Neon (Serverless) | Aiven (Managed Infra) |
|--------|-------------------|----------------------|
| **Core Type** | Serverless PostgreSQL | Managed PostgreSQL (RDS-style) |
| **Architecture** | Separation of compute + storage | Dedicated VM / instance |
| **Provision Time** | ~200ms | Minutes (VM setup) |
| **Scaling** | Auto-scale (up & down) | Manual scaling |
| **Scale to Zero** | Yes (idle = no compute cost) | Free tier may pause, but always-on otherwise |
| **Cold Start** | ~0.5-1 sec | 2-10 sec (resume VM) |
| **Connection Handling** | Built-in pooling (~10k connections) | Limited (~20-100) |
| **Failure Handling** | Auto-recover (stateless compute) | Failover via replicas |
| **Storage Model** | Distributed (S3 + SSD cache) | Local disk (VM-based) |
| **Latency (steady)** | Slightly higher (network hops) | Lower (direct disk) |
| **Latency (cold)** | ~500ms extra | Several seconds |
| **DB Branching** | Instant (copy-on-write, like Git) | Not available |
| **Dev Experience** | Extremely fast & modern | Traditional |
| **DB Tuning Control** | Limited | Full control |
| **Extensions / Configs** | Some limits | Full flexibility |
| **Pricing Model** | Usage-based (pay per compute) | Fixed (pay for instance) |
| **Idle Cost** | $0 | Still paying (always-on infra) |
| **Cost Predictability** | Variable | Predictable |
| **Free Tier Storage** | 500 MB | 1 GB |
| **Free Tier Projects** | ~100 | Typically 1 |
| **Best for Traffic** | Spiky / unpredictable | Stable / constant |
| **Ops Responsibility** | Minimal | Moderate |
| **Multi-AZ / HA** | Built-in via architecture | Configurable replicas |
| **Use Case Fit** | Modern apps, AI, SaaS, side projects | Enterprise, stable workloads |

### When to pick Neon
- Auto-scaling + scale-to-zero (pay nothing when idle)
- Built-in connection pooling (handles thousands of connections)
- DB branching for testing and previews
- Cost efficiency for low/medium usage
- Best for: **modern apps, side projects, SaaS, AI apps**

### When to pick Aiven
- Predictable performance (no cold starts)
- Full control over database internals
- Stable under constant heavy load
- Traditional infrastructure (industry standard)
- Best for: **production enterprise workloads, long-running systems**

> **This project uses Neon** because it's a modern app with spiky traffic, benefits from scale-to-zero (free when idle), and the developer experience (instant branching, fast provisioning) is unmatched for portfolio and SaaS projects.

---

## License

This project is for educational and portfolio purposes.

Original template by [Adrian Hajdin](https://github.com/adrianhajdin/banking) — heavily modified with custom auth, separate frontend/backend architecture, Razorpay integration, and glassmorphic redesign.
# banking-system
