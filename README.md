# Ankan's Bank

**Track spending, set budgets, manage goals, and get AI-powered insights — all in one place.** 🏦

💳 **Banking:** Plaid linking + Razorpay transfers + CSV statement upload + Real-time balances + Multi-account
🤖 **AI (Gemini):** Transaction categorization + Spending insights + Financial chatbot + Health score + Monthly digest + Challenge suggestions + Financial plan generator
📊 **Analytics:** Spending trends + Income/Expense + Merchant insights + Recurring detection + Bill calendar  
💰 **Planning:** Budgets + Savings goals + Spending alerts + Split expenses + Net worth tracker  
🎮 **Gamification:** Spending challenges + Streaks + 8 badge types  
🔧 **Tools:** Notes & tags + Smart search + CSV/PDF export + Profile settings  
🔐 **Auth:** Passwordless OTP + Google OAuth + JWT sessions  

📈💹🚀✨

Built with **Next.js 14**, **Express.js**, **Prisma**, **PostgreSQL**, **Upstash Redis**, **Plaid**, **Razorpay**, **Google Gemini**, and **csv-parse**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Express.js, TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL (Local / Neon / Supabase — your choice) |
| **Cache** | Upstash Redis (free tier) with in-memory fallback via ioredis |
| **Auth** | Custom JWT + OTP (jose, Resend) + Google OAuth |
| **Bank Data** | Plaid API (sandbox) |
| **Payments** | Razorpay (test mode) |
| **Email** | Resend |
| **AI** | Google Gemini 2.0 Flash (free tier) |
| **Charts** | Chart.js (Bar, Doughnut, Line) |
| **Export** | PDFKit (PDF statements), csv-stringify (CSV) |
| **CSV Import** | csv-parse (multi-bank statement parser), multer (file upload) |

---

## Features

### Authentication
- **Passwordless OTP login** — Enter email, receive a 6-digit code, verify
- **Google Sign-In** — One-click Google OAuth
- **JWT sessions** with token versioning for instant logout/revocation
- **MASTER_OTP** — Use `123456` in development to skip email sending

### Banking Dashboard
- **Bank account linking** via Plaid (sandbox mode)
- **CSV statement upload** — Import transactions from Indian bank statements (SBI, HDFC, ICICI, Axis, Kotak + generic fallback). Auto-detects CSV format, normalizes dates, categorizes with Indian merchant regex. Creates a "manual bank" with no Plaid dependency.
- **DB-first architecture** — Balances and transactions are read from PostgreSQL on every page load. Plaid is only called during background sync (controlled by a 24-hour Redis TTL key). Zero Plaid API calls on normal page loads.
- **Re-sync button** — Manual "Resync with bank" button on the dashboard clears the Redis TTL key and triggers a fresh Plaid sync.
- **Transaction history** with pagination, category badges, and smart search/filters
- **Multi-account support** — Link multiple banks (Plaid or manual CSV), switch between tabs
- **Doughnut chart** — Visual breakdown of account balances
- **Recurring transactions card** — Auto-detected subscriptions and recurring charges on the dashboard

### AI Features (powered by Google Gemini)
- **Transaction categorization** — Automatically classifies every transaction (Plaid or CSV-imported) into 10 categories (Food & Dining, Transport, Shopping, Entertainment, Bills & Utilities, Health, Education, Income, Transfers, Other). Uses rule-based regex first (extended with Indian merchants like Swiggy, Zomato, Ola, Flipkart, IRCTC, UPI, NEFT, etc.), then falls back to Gemini for unrecognized merchants. Results are cached in PostgreSQL so repeat loads are instant and free.
- **Spending insights** — Dedicated `/insights` page with: AI-generated natural language summary, month-over-month category comparison, top spending categories with progress bars, anomaly detection, and personalized savings tips. Results cached for 5 minutes.
- **AI chatbot** — Floating chat panel (bottom-right) powered by Gemini. Has full context of your accounts, balances, and recent transactions. Supports quick-prompt shortcuts. Rate-limited to 10 messages/minute per user.
- **Category breakdown chart** — Doughnut chart on the dashboard visualizing spending by AI category with a color-coded legend.
- **Financial health score** — AI-generated 0-100 score based on budget adherence, savings rate, spending trends, and goal progress. Uses a 3-layer cache (Redis + DB persistence + local rule-based fallback). Gemini is only called when the user clicks "Generate with AI"; otherwise a formula-based score is computed locally.
- **AI financial plan generator** — Describe a financial goal in plain text (e.g., "Save $10,000 for a down payment in 2 years") and Gemini creates a step-by-step savings plan with milestones, monthly savings needed, feasibility rating, and actionable tips. Includes a "Create Goal from Plan" button to instantly convert the plan into a tracked savings goal.
- **On-demand AI generation** — All AI features (insights, health score, digest, challenges, net worth insight) follow a strict two-mode pattern:
  1. **Default (page load):** Cache hit → return cached data. Cache miss → formula-based fallback (predefined calculations), cached for 5 minutes. Gemini is **never** called.
  2. **"Generate with AI" button click:** Existing cache is cleared → Gemini is called → result cached with long TTL (100 hours). If Gemini fails, formula fallback is used.
  3. **Subsequent page loads:** Cached AI data is returned with the correct source badge until TTL expires, then reverts to formula fallback.

  Each feature displays a **source badge** ("AI-generated" or "Formula-based") so users always know what they're seeing. The `source` field is persisted through all cache layers (Redis + PostgreSQL) so the badge survives server restarts.

### Budget & Financial Planning
- **Budget tracker** — Set monthly spending limits per AI category. Real-time progress bars (green < 75%, amber 75-90%, red > 90%). Inline editing and management on the `/budgets` page.
- **Savings goals** — Create named goals with target amounts, target dates, emoji icons, and color coding. Log manual contributions with an SVG progress ring. Auto-completes when target is reached. Includes AI Financial Planner section to generate goals from natural language descriptions.
- **Spending alerts** — Set email alert rules with two types:
  - **Category monthly limit** — e.g., "Alert me if Food & Dining exceeds $500 this month." Aggregates debit transactions by AI category for the current month and fires an email when the threshold is crossed. 28-day cooldown prevents repeat alerts.
  - **Single transaction alert** — e.g., "Alert me if any transaction exceeds $1,000." Monitors recent transactions and emails when a large charge is detected. 1-hour cooldown.
  - Alerts are evaluated in the background when transactions are fetched, using the same debit detection logic as the spending chart (`type === 'debit'` for CSV banks, `amount < 0` for Plaid). Emails sent via Resend. Toggle alerts on/off, edit thresholds inline. Trigger logs stored in DB for deduplication and audit.

### Analytics & Reports
- **Spending trends** — Multi-month stacked bar chart (Chart.js) showing spending per AI category over the last 3/6/12 months. Category toggle pills to show/hide individual categories.
- **Income vs expenses** — Monthly P&L report with grouped bar chart (green income, red expenses), net savings line, and summary cards (total income, total expenses, net savings, avg monthly).
- **Merchant insights** — Top 50 merchants ranked by total spend. Shows transaction count, average amount, category badge, month-over-month trend arrows, and a client-side search filter.
- **Recurring transaction detection** — Algorithm detects subscriptions by grouping transactions with similar names/amounts at regular intervals (weekly, monthly, quarterly). Shows on dashboard with next expected date.
- **Bill calendar** — Visual monthly calendar grid showing projected recurring charges on their expected dates. Color-coded by AI category, click-to-expand daily details, monthly committed total. Zero new API calls — reuses existing recurring detection data.
- **AI monthly digest** — Comprehensive monthly report page aggregating health score, budget adherence, goal progress, top merchants, and income vs expenses into one view. Narrative summary defaults to a formula-based local narrative; Gemini is only called when the user clicks "Generate with AI". Cached in both Redis and DB with source tracking. One-click PDF export.
- **Transaction export** — Export any date range to CSV (for spreadsheets/accountants) or a formatted PDF bank statement with account info, transaction table, and debit/credit totals.

### Profile & Settings
- **Profile management** — View and edit personal info (name, address, city, state, zip). Email shown as read-only.
- **Connected banks management** — View all linked banks with account mask, disconnect banks (revokes Plaid access token).
- **Account actions** — Logout all devices (invalidates all JWTs via tokenVersion increment), delete account with safety confirmation (type "DELETE"). Cascade deletes all user data.

### Smart Search & Filters
- **Full-text search** across transaction names and merchant names
- **Filter by** AI category, amount range (min/max), and date range
- **Paginated results** with debounced 300ms search
- Integrated into the transaction history page

### Transaction Notes & Tags
- **Custom notes** — Attach notes (up to 500 characters) to any transaction
- **Color-coded tags** — Add up to 10 custom tags per transaction for personal organization (e.g., "business expense", "reimbursable", "gift")
- **Tag autocomplete** — Fetches your existing tags for quick reuse
- Stored by transaction hash (SHA-256) for consistency across Plaid syncs

### Split Expenses
- **Bill splitting** — Create splits from any transaction or a manual amount. Add participants by name and email (they don't need accounts in the app). Completely independent of bank transaction data — purely manual entry.
- **Equal or custom splits** — Split equally among all participants, or assign custom amounts per person.
- **Payment tracking** — Toggle each participant as paid/unpaid with one click. Splits auto-settle when all participants have paid.
- **Summary dashboard** — See total owed to you, pending count, and settled count at a glance. Filter splits by status (all/pending/settled).
- **Backend** — Full CRUD via `/api/splits` with per-user isolation. Summary endpoint aggregates totals across all splits.

### Net Worth Tracker
- **Aggregate net worth** — Automatically pulls balances from all linked Plaid accounts and combines with manually added assets and liabilities.
- **Manual assets & liabilities** — Add property, vehicles, investments, cash, mortgages, auto loans, student loans, credit cards, and personal loans with full CRUD.
- **Monthly snapshots** — Current month's net worth is auto-saved to the database. Historical snapshots power the trends chart.
- **Line chart** — Track total assets, total liabilities, and net worth over 6/12/24 months with Chart.js Line chart (emerald/rose/violet).
- **Summary cards** — Total assets, total liabilities, net worth, and monthly change (with percent).
- **AI insight** — Gemini-generated 2-sentence trend analysis and actionable tip, only when the user clicks "Generate with AI". Default view shows a formula-based trend summary. Source badge indicates whether the insight is AI or formula-generated.

### Spending Challenges / Gamification
- **AI-powered suggestions** — Gemini analyzes your top spending categories and suggests 3 personalized challenges when the user clicks "Generate with AI". Default view shows formula-based suggestions. Accept with one click. 30-day cache for AI suggestions, 5 min for formula.
- **Custom challenges** — Create your own with 3 types: category spending limit, no-spend days, or savings target. Set weekly or monthly duration.
- **Real-time progress** — Progress bars tracked against live transaction data. Category limit shows spent vs budget. No-spend shows days hit vs target. Savings shows amount saved vs goal.
- **Auto-completion** — Challenges automatically complete or fail when their end date passes, based on actual performance.
- **Streak tracking** — Consecutive completed challenges build your streak. Failures reset it. Longest streak is recorded.
- **8 badge types** — Earn achievements: First Challenge, 3/7/30 Streak, 5/10 Completed, Perfect Month (4+ weekly in a month), Savings Hero (>120% of savings target).
- **Challenge history** — View all past challenges with completed/failed/abandoned status.

### Payments & Transfers
- **Fund transfers** between linked bank accounts (Razorpay integration, demo/test mode)
- **Unified transaction format** — Internal Razorpay transfers are mapped to the same shape as Plaid transactions (`merchantName`, `aiCategory: 'Transfers'`, `accountId`, `pending`, `image`). Both types are indistinguishable in the UI — the app tells one seamless financial story.
- **Instant cache invalidation** — After a transfer, the account cache is cleared for both sender and receiver so the transaction appears on the dashboard immediately (no 5-min wait).
- **Transaction recording** — All transfers stored in PostgreSQL
- **Recipient lookup** by sharable ID

### Caching & Rate Limiting
All external API calls are aggressively cached via **Upstash Redis** (primary) with an automatic **in-memory fallback** to stay within free tier limits. Cache persists across server restarts and Render spin-downs.

| Cache | TTL | Storage | Impact |
|-------|-----|---------|--------|
| Plaid sync gate (`plaid-sync:{bankId}`) | 24 hr | Redis + in-memory | **0 Plaid API calls on page load.** Plaid is only called when: (1) user clicks "Resync with bank" button, (2) a fund transfer clears the key, or (3) the 24-hour TTL expires and the next page load triggers a background sync. |
| Bank balances & transactions | Permanent (until next sync) | PostgreSQL | DB-first reads — all page loads read from DB, never from Plaid directly |
| `getInstitution()` (Plaid) | 100 hr | In-memory | Static bank info cached long-term |
| Chat financial context | 100 hr | Redis | 0 Plaid calls per chat message |
| AI transaction categories | Permanent | DB | Never re-categorize the same transaction |
| Spending insights | 100 hr (AI) / 5 min (formula) | Redis | Gemini only on explicit user request |
| Analytics (trends, recurring, income/expense, merchants) | 100 hr | Redis | Pure aggregation on cached data |
| Financial health score | 100 hr (AI) / 5 min (formula) | Redis + DB | Gemini only on explicit user request |
| Monthly digest | 100 hr (AI) / 5 min (formula) | Redis + DB | Gemini only on explicit user request |
| Net worth AI insight | 100 hr (AI) / 5 min (formula) | Redis | Gemini only on explicit user request |
| Challenge AI suggestions | 30 days (AI) / 5 min (formula) | Redis + DB | Gemini only on explicit user request |
| Budget status | 24 hr | Redis | Aggregation cached per user/month |
| Challenge progress | 24 hr | Redis | Progress calculation cached per user |
| Transaction notes & tags | 100 hr | Redis | Batch notes cached, invalidated on write |
| Net worth snapshots | Permanent | DB | Monthly snapshots stored for historical charts |

**Resilience:** If Redis is unavailable (quota exceeded or connection error), all cache operations silently fall back to an in-memory Map. The app never breaks — it just degrades to pre-Redis behavior.

Rate limits per user per minute:

| Endpoint Group | Limit | Reason |
|---------------|-------|--------|
| Accounts | 30/min | Triggers Plaid API calls |
| AI Insights | 5/min | Dedicated Gemini insights endpoint |
| Chat | 10/min | Triggers Gemini API calls |
| Export (CSV/PDF) | 5/min | Triggers Plaid API calls |
| Analytics | 15/min | Triggers Plaid via getAccount |
| Health Score | 15/min | Formula by default, Gemini only on explicit AI request |
| Reports/Digest | 15/min | Formula by default, Gemini only on explicit AI request |
| Challenges | 15/min | Formula by default, Gemini only on explicit AI request |
| Net Worth | 30/min | Triggers Plaid via getAccounts |

### Design
- **Glassmorphic dark theme** — Frosted glass cards, animated gradients
- **Collapsible sidebar** — 72px icon rail, expands to 240px on hover
- **3D bank cards** — Perspective tilt + shimmer shine on hover
- **Bottom tab bar** on mobile (Revolut-style)
- **Animated gradient blobs** on auth pages
- **6-digit OTP input boxes** with auto-focus and auto-submit

---

## Project Structure

```
bank/
├── frontend/                         # Next.js 14 (port 3003)
│   ├── app/
│   │   ├── (auth)/                   # Sign-in / Sign-up pages
│   │   └── (root)/                   # Protected dashboard pages
│   │       ├── upload-statement/      # CSV Statement Upload page
│   │       ├── insights/             # AI Insights page
│   │       ├── budgets/              # Budget Tracker page
│   │       ├── goals/                # Savings Goals page
│   │       ├── trends/               # Spending Trends chart
│   │       ├── alerts/               # Spending Alerts page
│   │       ├── health-score/         # Financial Health Score page
│   │       ├── income-expense/       # Income vs Expense report
│   │       ├── merchants/            # Merchant Insights page
│   │       ├── splits/               # Split Expenses page
│   │       ├── net-worth/            # Net Worth Tracker page
│   │       └── challenges/           # Spending Challenges page
│   ├── components/                   # React components (45+)
│   │   ├── AIChatbot.tsx             # Floating AI chat panel
│   │   ├── CategoryBreakdownChart.tsx  # Spending doughnut chart
│   │   ├── SpendingInsightsCard.tsx  # AI insights display
│   │   ├── BudgetProgressCard.tsx    # Budget progress bars
│   │   ├── StatementUpload.tsx       # CSV bank statement upload form
│   │   ├── ResyncButton.tsx         # Manual Plaid re-sync trigger
│   │   ├── GoalCard.tsx              # Savings goal progress ring
│   │   ├── GoalsManager.tsx          # Goals CRUD + AI financial planner (text → plan → goal)
│   │   ├── SpendingTrendsChart.tsx   # Multi-month trends chart
│   │   ├── RecurringTransactionsCard.tsx  # Subscriptions card
│   │   ├── AlertsManager.tsx         # Alert rules manager
│   │   ├── ExportModal.tsx           # CSV/PDF export dialog
│   │   ├── HealthScoreCard.tsx       # AI health score gauge
│   │   ├── IncomeExpenseChart.tsx    # Income vs expense chart
│   │   ├── MerchantInsightsCard.tsx  # Top merchants ranked
│   │   ├── TransactionSearchView.tsx # Search + filter bar
│   │   ├── SplitsManager.tsx         # Split expenses CRUD + summary
│   │   ├── SplitCard.tsx             # Split participant checkboxes + progress
│   │   ├── NetWorthManager.tsx       # Net worth overview + asset/liability CRUD
│   │   ├── NetWorthChart.tsx         # Line chart (assets/liabilities/net worth)
│   │   ├── AssetLiabilityRow.tsx     # Inline edit row for assets/liabilities
│   │   ├── ChallengesManager.tsx     # Challenges overview + AI suggestions + form
│   │   ├── ChallengeProgressCard.tsx # Challenge progress bar + stats
│   │   └── BadgeIcon.tsx             # Badge display with colors/labels
│   ├── lib/api/                      # API client (fetch wrappers)
│   │   ├── ai.api.ts                 # Insights (useAi) + Financial Plan API
│   │   ├── chat.api.ts               # Chat API
│   │   ├── budgets.api.ts            # Budgets + Export API
│   │   ├── goals.api.ts              # Goals API
│   │   ├── analytics.api.ts          # Trends + Recurring + Income/Expense + Merchants
│   │   ├── alerts.api.ts             # Alerts API
│   │   ├── health-score.api.ts       # Health Score API
│   │   ├── search.api.ts             # Transaction search API
│   │   ├── notes.api.ts              # Transaction notes/tags API
│   │   ├── splits.api.ts             # Split expenses API
│   │   ├── net-worth.api.ts          # Net worth + assets/liabilities API
│   │   └── challenges.api.ts         # Spending challenges API
│   └── constants/                    # Style configs (AI category colors, sidebar links)
│
├── backend/                          # Express API (port 8787)
│   ├── src/
│   │   ├── routes/                   # 20 route files
│   │   │   ├── ai.routes.ts          # POST /api/ai/insights, POST /api/ai/financial-plan
│   │   │   ├── chat.routes.ts        # POST /api/chat
│   │   │   ├── budgets.routes.ts     # CRUD /api/budgets + status
│   │   │   ├── goals.routes.ts       # CRUD /api/goals + contribute
│   │   │   ├── export.routes.ts      # GET /api/export/csv, /api/export/pdf
│   │   │   ├── analytics.routes.ts   # trends, recurring, income-expense, merchants
│   │   │   ├── alerts.routes.ts      # CRUD /api/alerts
│   │   │   ├── health-score.routes.ts  # GET /api/health-score
│   │   │   ├── search.routes.ts      # GET /api/search
│   │   │   ├── notes.routes.ts       # CRUD /api/notes + batch + tags
│   │   │   ├── splits.routes.ts     # CRUD /api/splits + summary
│   │   │   ├── net-worth.routes.ts  # /api/net-worth + assets + liabilities
│   │   │   ├── challenges.routes.ts # /api/challenges + overview + suggestions
│   │   │   └── statement-upload.routes.ts # POST /api/statements/upload (new + append)
│   │   ├── services/                 # 14 service files
│   │   │   ├── gemini.service.ts     # categorize, insights (useAi), financial plan, chat
│   │   │   ├── bank.service.ts       # DB-first reads + Redis TTL Plaid sync
│   │   │   ├── budget.service.ts     # Budget CRUD + status
│   │   │   ├── goals.service.ts      # Goals CRUD + contributions
│   │   │   ├── analytics.service.ts  # trends, recurring, income/expense, merchants
│   │   │   ├── alerts.service.ts     # Alert evaluation + email
│   │   │   ├── export.service.ts     # CSV/PDF generation
│   │   │   ├── health-score.service.ts  # 3-layer cache + useAi + source tracking
│   │   │   ├── search.service.ts     # Transaction search/filter
│   │   │   ├── notes.service.ts      # Transaction notes/tags CRUD
│   │   │   ├── splits.service.ts    # Split expenses CRUD + auto-settle
│   │   │   ├── net-worth.service.ts # Assets/liabilities + net worth + insight (useAi)
│   │   │   ├── challenges.service.ts # Challenges + progress + suggestions (useAi) + streaks
│   │   │   └── statement-parser.service.ts # CSV parser with multi-bank format auto-detection
│   │   ├── middleware/               # JWT auth + rate limiter factory
│   │   └── lib/                      # Prisma, Plaid, Gemini, Redis clients
│   └── prisma/
│       └── schema.prisma             # Database schema (23 tables, Bank model supports plaid + manual sources)
│
├── shared/                           # Shared between frontend & backend
│   ├── types.ts                      # TypeScript types (35+ types)
│   └── validators.ts                 # Zod schemas, utilities
│
└── package.json                      # Root scripts (dev:frontend, dev:backend)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Local install, [Neon](https://neon.tech), or [Supabase](https://supabase.com) — all three work, see below)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Set up your database

All three options below are fully supported — pick whichever suits you.

#### Option A: Local PostgreSQL
1. Install PostgreSQL ([Homebrew](https://formulae.brew.sh/formula/postgresql@16): `brew install postgresql@16`, or [Postgres.app](https://postgresapp.com) for macOS)
2. Create a database: `createdb horizon_bank`
3. Connection string: `postgresql://your_user:your_password@localhost:5432/horizon_bank`

> No `sslmode` needed for local. If your local user has no password, you can omit it: `postgresql://localhost:5432/horizon_bank`

#### Option B: Neon (Recommended for cloud)
1. Sign up at [neon.tech](https://neon.tech) (free tier: 512MB)
2. Create a project
3. Copy the connection string

#### Option C: Supabase
1. Sign up at [supabase.com](https://supabase.com) (free tier: 500MB)
2. Create a project
3. Go to Settings > Database > Connection string (URI)

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
# DATABASE (paste your Local/Neon/Supabase connection string — all three work)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

# AUTH
JWT_SECRET=generate-a-random-64-character-hex-string-here
MASTER_OTP=123456
OTP_EXPIRY_MINUTES=5

# EMAIL (optional — MASTER_OTP skips email in dev)
RESEND_API_KEY=
EMAIL_FROM=Ankan's Bank <noreply@yourdomain.com>

# PLAID (get from https://dashboard.plaid.com)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# RAZORPAY (get from https://dashboard.razorpay.com — use Test Mode keys)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# GOOGLE OAUTH (optional — get from Google Cloud Console)
GOOGLE_CLIENT_ID=

# GEMINI AI (get from https://aistudio.google.com/app/apikey — free tier)
GEMINI_API_KEY=

# UPSTASH REDIS (optional — get from https://console.upstash.com — free tier)
REDIS_URL=

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

This creates 23 tables: `users`, `banks`, `transactions`, `otp_codes`, `cached_categories`, `budgets`, `savings_goals`, `goal_contributions`, `alert_rules`, `alert_trigger_logs`, `transaction_notes`, `financial_health_scores`, `monthly_digests`, `split_groups`, `split_participants`, `spending_challenges`, `challenge_streaks`, `badges`, `manual_assets`, `manual_liabilities`, `net_worth_snapshots`, `challenge_suggestion_cache`, `plaid_transactions`.

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
4. View your dashboard — transactions are auto-categorized by Gemini, a spending chart and recurring subscriptions card appear
5. Click **AI Insights** in the sidebar for a full spending analysis
6. Click the sparkle button (bottom-right) to open the AI chatbot
7. Try a fund transfer from the Payment Transfer page
8. Go to **Budgets** — set monthly spending limits per category and watch progress bars
9. Go to **Savings Goals** — create a goal, add contributions, watch the progress ring fill
10. Go to **Trends** — see multi-month spending trends by category
11. Go to **Income/Expense** — see your monthly P&L with income vs expense bars
12. Go to **Merchants** — see your top merchants ranked by spending
13. Go to **Health Score** — get your AI-generated financial health score (0-100)
14. Go to **Alerts** — set email notifications for spending thresholds
15. On **Transaction History** — use the search bar to filter by text, category, amount, or date range
16. On **Transaction History** — click Export to download transactions as CSV or PDF
17. Go to **Split Expenses** — create a split, add participants, toggle paid/unpaid, see auto-settle
18. Go to **Net Worth** — view linked account balances, add manual assets/liabilities, see the line chart
19. Go to **Challenges** — accept an AI suggestion or create a custom challenge, track progress, earn badges
20. Go to **Upload Statement** — select your Indian bank (SBI, HDFC, ICICI, etc.), upload a CSV statement, see transactions imported and categorized

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

### AI (Protected)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/insights` | Generate spending insights for an account + month (supports `useAi` flag) |
| POST | `/api/ai/financial-plan` | Generate a step-by-step financial plan from a text description |
| POST | `/api/chat` | Send a message to the AI financial assistant |

### Budgets (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets?month=YYYY-MM` | Get all budgets for a month |
| GET | `/api/budgets/status?bankRecordId=x&month=YYYY-MM` | Get budget status with spending |
| POST | `/api/budgets` | Create or update a budget |
| DELETE | `/api/budgets/:id` | Delete a budget |

### Savings Goals (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals` | List all savings goals |
| POST | `/api/goals` | Create a new goal |
| PATCH | `/api/goals/:id` | Update a goal |
| DELETE | `/api/goals/:id` | Delete a goal |
| POST | `/api/goals/:id/contribute` | Add a contribution |
| GET | `/api/goals/:id/contributions` | Get contribution history |

### Analytics (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/trends?bankRecordId=x&months=6` | Spending trends by category |
| GET | `/api/analytics/recurring?bankRecordId=x` | Detected recurring transactions |
| GET | `/api/analytics/income-expense?bankRecordId=x&months=6` | Income vs expense report |
| GET | `/api/analytics/merchants?bankRecordId=x&months=6` | Top merchants by spend |

### Alerts (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alerts` | List all alert rules |
| POST | `/api/alerts` | Create an alert rule |
| PATCH | `/api/alerts/:id` | Enable/disable or update threshold |
| DELETE | `/api/alerts/:id` | Delete an alert rule |

### Export (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/csv?bankRecordId=x&from=YYYY-MM-DD&to=YYYY-MM-DD` | Download CSV |
| GET | `/api/export/pdf?bankRecordId=x&from=YYYY-MM-DD&to=YYYY-MM-DD` | Download PDF statement |

### Search (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?bankRecordId=x&q=coffee&category=...` | Search + filter transactions |

### Notes & Tags (Protected)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notes` | Upsert a note on a transaction |
| DELETE | `/api/notes/:hash` | Delete a note |
| GET | `/api/notes/batch?hashes=h1,h2,...` | Batch fetch notes |
| GET | `/api/notes/tags` | Get all user tags (autocomplete) |

### Health Score (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-score?bankRecordId=x&month=YYYY-MM&ai=true` | Financial health score (formula by default, AI with `ai=true`) |

### Reports (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/digest?bankRecordId=x&month=YYYY-MM&ai=true` | Monthly digest (formula narrative by default, AI with `ai=true`) |
| GET | `/api/reports/digest/pdf?bankRecordId=x&month=YYYY-MM` | PDF export of monthly digest (uses cached data) |

### Split Expenses (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/splits` | List all splits (optional `?status=pending\|settled`) |
| GET | `/api/splits/summary` | Get split summary (owed to you, pending, settled counts) |
| GET | `/api/splits/:id` | Get a single split with participants |
| POST | `/api/splits` | Create a new split (equal or custom) |
| PATCH | `/api/splits/:id/participants/:pid` | Toggle participant paid/unpaid |
| DELETE | `/api/splits/:id` | Delete a split |

### Net Worth (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/net-worth?months=12&ai=true` | Get net worth data with history and insight (formula by default, AI with `ai=true`) |
| GET | `/api/net-worth/assets` | List manual assets |
| POST | `/api/net-worth/assets` | Add a manual asset |
| PATCH | `/api/net-worth/assets/:id` | Update a manual asset |
| DELETE | `/api/net-worth/assets/:id` | Delete a manual asset |
| GET | `/api/net-worth/liabilities` | List manual liabilities |
| POST | `/api/net-worth/liabilities` | Add a manual liability |
| PATCH | `/api/net-worth/liabilities/:id` | Update a manual liability |
| DELETE | `/api/net-worth/liabilities/:id` | Delete a manual liability |

### Spending Challenges (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/challenges` | List all challenges (optional `?status=active\|completed\|failed`) |
| GET | `/api/challenges/overview?bankRecordId=x` | Bundled progress + streak + badges |
| GET | `/api/challenges/suggestions?bankRecordId=x&ai=true` | Challenge suggestions (formula by default, AI with `ai=true`) |
| POST | `/api/challenges` | Create a new challenge |
| PATCH | `/api/challenges/:id/abandon` | Abandon an active challenge |

### Statement Upload (Protected)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/statements/upload` | Upload CSV statement to create a new manual bank + import transactions |
| POST | `/api/statements/upload/:bankRecordId` | Append transactions from a new CSV to an existing manual bank |

### Accounts (Protected) — Additional
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/accounts/:bankRecordId/sync` | Force re-sync with Plaid (clears Redis TTL key) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API health check |

---

## Database Schema (20 Tables)

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User profiles with auth fields |
| `banks` | Linked bank accounts (Plaid access tokens) or manual CSV-imported banks (`source: 'plaid' \| 'manual'`) |
| `transactions` | In-app transfer records |
| `otp_codes` | Passwordless auth OTP codes |

### AI & Caching Tables
| Table | Purpose |
|-------|---------|
| `cached_categories` | Gemini category decisions keyed by SHA-256 hash of `(name, amount, date)` |
| `financial_health_scores` | Health score cache per user/month with `source` column ('ai' or 'formula') |
| `monthly_digests` | Monthly report cache per user/month with `narrativeSource` column ('ai' or 'formula') |

### Financial Planning Tables
| Table | Purpose |
|-------|---------|
| `budgets` | Monthly spending limits per category. Unique on `(userId, category, month)` |
| `savings_goals` | Named savings goals with target amounts, dates, progress |
| `goal_contributions` | Audit trail of contributions to savings goals |

### Alerts & Notes Tables
| Table | Purpose |
|-------|---------|
| `alert_rules` | User-defined spending alert rules (category limit, single txn, balance) |
| `alert_trigger_logs` | Deduplication log preventing duplicate alert emails |
| `transaction_notes` | User notes and tags on transactions, keyed by transaction hash |

### Split Expenses Tables
| Table | Purpose |
|-------|---------|
| `split_groups` | Split expense groups with title, total amount, split type, status |
| `split_participants` | Participants in a split with email, name, amount, paid status |

### Spending Challenges Tables
| Table | Purpose |
|-------|---------|
| `spending_challenges` | User challenges with type, category, target, duration, dates, status |
| `challenge_streaks` | Per-user streak tracking (current, longest, total completed) |
| `badges` | Earned achievement badges. Unique on `(userId, badgeType)` |

### Net Worth Tables
| Table | Purpose |
|-------|---------|
| `manual_assets` | User-added assets (property, vehicle, investment, cash) |
| `manual_liabilities` | User-added liabilities (mortgage, auto loan, student loan, credit card) |
| `net_worth_snapshots` | Monthly net worth snapshots with breakdown. Unique on `(userId, month)` |

### Plaid Tables
| Table | Purpose |
|-------|---------|
| `plaid_transactions` | Synced Plaid transactions and CSV-imported transactions linked to bank records |
| `challenge_suggestion_cache` | AI/formula challenge suggestions cache per user/bank/month with source tracking |

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
| **Aiven** | `postgresql://user:pass@host.aivencloud.com:port/defaultdb?sslmode=require` |
| **Render** | `postgresql://user:pass@host.render.com/dbname` |
| **Local** | `postgresql://postgres:postgres@localhost:5432/ankans_bank` |

No code changes needed. Just swap the URL.

---

## Deployment (Render)

### Backend
- **Type**: Web Service
- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`
- **Environment**: Set all backend env vars (including `GEMINI_API_KEY`)

### Frontend
- **Type**: Web Service
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Set all frontend env vars (point `API_URL` to backend service URL)

### Database
- Use **local PostgreSQL**, **Neon**, or **Supabase** free tier — all three work out of the box (no need to host PostgreSQL on Render)

---

## Test Mode / Sandbox

This project runs entirely in test/sandbox mode — perfect for portfolio demos:

| Service | Mode | What it means |
|---------|------|--------------|
| **Plaid** | Sandbox | Fake test banks, no real bank data. Credentials: `user_good` / `pass_good` |
| **Razorpay** | Test | No real money moves. Use test API keys from dashboard |
| **Resend** | Free tier | 100 emails/day. Or use `MASTER_OTP=123456` to skip emails |
| **Local/Neon/Supabase** | Free tier (or local) | Real database, fully functional — all three supported |
| **Gemini** | Free tier | 15 RPM, 1M TPM. Categorization results cached in DB to minimize calls |

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

## Prisma vs Drizzle ORM — A Pragmatic, Example-Driven Comparison

This project uses **Prisma** as its ORM. Below is a detailed comparison with **Drizzle ORM** using concrete examples from this codebase's actual schema (users, banks, transactions, budgets, goals) — so you can understand the tradeoffs and make an informed choice for your own projects.

### TL;DR (Quick Decision Guide)

| | **Prisma** | **Drizzle** |
|---|---|---|
| **Philosophy** | Describe **what** you want — hide the SQL | Describe **how** to query — you *are* the SQL |
| **Best for** | CRUD-heavy apps, fast dev velocity, nested writes | Analytics, complex joins, serverless cold starts |
| **DX** | Schema-first codegen, Studio, integrated migrations | Everything-in-TypeScript, no codegen step |
| **Perf** | Slight runtime overhead (engine layer) | Thin wrapper, lower overhead, predictable SQL |
| **Verbosity** | Less code for CRUD | More code, but more control |

---

### 1) Schema & Relations — Single File vs Many Small Files

**Prisma** (single `schema.prisma`)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  firstName String
  lastName  String
  banks     Bank[]
  budgets   Budget[]
}

model Bank {
  id          String @id @default(uuid())
  userId      String
  bankId      String
  accountId   String
  accessToken String
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Budget {
  id           String  @id @default(uuid())
  userId       String
  category     String
  monthlyLimit Decimal @db.Decimal(12, 2)
  month        String
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, category, month])
}
```

Relation + FK + reverse relation all declared together in one file. Easy mental model for teams.

**Drizzle** (table + FK + optional relation files)

```typescript
// db/tables/users.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// db/tables/banks.ts
import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import { users } from './users';

export const banks = pgTable('banks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bankId: text('bank_id').notNull(),
  accountId: text('account_id').notNull(),
  accessToken: text('access_token').notNull(),
});

// db/tables/budgets.ts
import { pgTable, uuid, text, decimal, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: text('category').notNull(),
  monthlyLimit: decimal('monthly_limit', { precision: 12, scale: 2 }).notNull(),
  month: text('month').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserCategoryMonth: unique().on(table.userId, table.category, table.month),
}));

// db/relations/index.ts (optional sugar for relational queries)
import { relations } from 'drizzle-orm';
import { users } from '../tables/users';
import { banks } from '../tables/banks';
import { budgets } from '../tables/budgets';

export const userRelations = relations(users, ({ many }) => ({
  banks: many(banks),
  budgets: many(budgets),
}));

export const bankRelations = relations(banks, ({ one }) => ({
  user: one(users, {
    fields: [banks.userId],
    references: [users.id],
  }),
}));

export const budgetRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
}));
```

Drizzle separates: (1) table definitions, (2) FK constraints, (3) relation helpers (which are optional sugar). That split makes things explicit but verbose — roughly 3x the lines for the same schema.

---

### 2) Nested Reads & Writes — Why Prisma Looks Magical

**Creating a savings goal with an initial contribution:**

**Prisma** (nested create — single call, auto-transactional)

```typescript
const goal = await prisma.savingsGoal.create({
  data: {
    name: 'Emergency Fund',
    targetAmount: 5000,
    savedAmount: 100,
    emoji: '🎯',
    color: '#8b5cf6',
    user: { connect: { id: userId } },
    contributions: {
      create: {
        amount: 100,
        note: 'Initial deposit',
      },
    },
  },
  include: {
    contributions: true,
  },
});
```

One call. Prisma creates the goal, inserts the contribution, connects the user, and returns everything — all inside an implicit transaction.

**Drizzle** (explicit inserts + transaction)

```typescript
const goal = await db.transaction(async (tx) => {
  const [newGoal] = await tx.insert(savingsGoals).values({
    userId: userId,
    name: 'Emergency Fund',
    targetAmount: '5000',
    savedAmount: '100',
    emoji: '🎯',
    color: '#8b5cf6',
  }).returning();

  const [contribution] = await tx.insert(goalContributions).values({
    goalId: newGoal.id,
    amount: '100',
    note: 'Initial deposit',
  }).returning();

  return { ...newGoal, contributions: [contribution] };
});
```

More code, but you control the transaction boundary, the exact SQL, and the return shape. No hidden queries.

---

**Many-to-many: Connecting alert rules to trigger logs**

**Prisma**

```typescript
const alert = await prisma.alertRule.create({
  data: {
    userId: userId,
    type: 'category_monthly_limit',
    category: 'Food & Dining',
    threshold: 500,
    triggerLogs: {
      create: [
        { details: JSON.stringify({ subject: 'Budget Alert', body: 'You exceeded $500' }) },
        { details: JSON.stringify({ subject: 'Budget Alert', body: 'Still over budget' }) },
      ],
    },
  },
  include: { triggerLogs: true },
});
```

**Drizzle**

```typescript
const alert = await db.transaction(async (tx) => {
  const [newRule] = await tx.insert(alertRules).values({
    userId: userId,
    type: 'category_monthly_limit',
    category: 'Food & Dining',
    threshold: '500',
  }).returning();

  const logs = await tx.insert(alertTriggerLogs).values([
    { ruleId: newRule.id, details: JSON.stringify({ subject: 'Budget Alert', body: 'You exceeded $500' }) },
    { ruleId: newRule.id, details: JSON.stringify({ subject: 'Budget Alert', body: 'Still over budget' }) },
  ]).returning();

  return { ...newRule, triggerLogs: logs };
});
```

Key difference: Drizzle requires you to perform the join-table/child inserts yourself. Use `insert().values([...])` to batch multiple rows in one SQL call rather than `Promise.all` with individual inserts — safer and faster.

---

### 3) Aggregations & Analytics — Where Drizzle Shows Its Teeth

**Budget status: aggregate spending per category for a month**

**Prisma** (using `groupBy`)

```typescript
const spending = await prisma.transaction.groupBy({
  by: ['category'],
  where: {
    senderBankId: bankId,
    createdAt: {
      gte: new Date('2026-03-01'),
      lt: new Date('2026-04-01'),
    },
    amount: { gt: 0 },
  },
  _sum: { amount: true },
  _count: true,
});
// Returns: [{ category: 'Food & Dining', _sum: { amount: 320.50 }, _count: 12 }, ...]
```

Convenient for simple sums. But try adding `COUNT(DISTINCT ...)`, window functions, or joining 3 tables — and you'll quickly reach for `prisma.$queryRaw`.

**Drizzle** (explicit SQL expressions)

```typescript
import { eq, gte, lt, gt, sql } from 'drizzle-orm';

const spending = await db
  .select({
    category: transactions.category,
    totalAmount: sql<number>`sum(${transactions.amount})`.as('total_amount'),
    transactionCount: sql<number>`count(*)`.as('transaction_count'),
  })
  .from(transactions)
  .where(
    and(
      eq(transactions.senderBankId, bankId),
      gte(transactions.createdAt, new Date('2026-03-01')),
      lt(transactions.createdAt, new Date('2026-04-01')),
      gt(transactions.amount, 0)
    )
  )
  .groupBy(transactions.category);
// Returns: [{ category: 'Food & Dining', totalAmount: 320.50, transactionCount: 12 }, ...]
```

Same result, but Drizzle makes it natural to add complex expressions without escaping to raw SQL.

---

**5-table JOIN: Users + Banks + Transactions + Budgets + Goals (analytics dashboard)**

**Drizzle** (clear mapping from JS → SQL)

```typescript
const dashboardData = await db
  .select({
    userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('user_name'),
    bankName: banks.bankId,
    accountId: banks.accountId,
    totalSpent: sql<number>`coalesce(sum(${transactions.amount}), 0)`.as('total_spent'),
    transactionCount: sql<number>`count(distinct ${transactions.id})`.as('txn_count'),
    activeBudgets: sql<number>`count(distinct ${budgets.id})`.as('budget_count'),
    activeGoals: sql<number>`count(distinct ${savingsGoals.id})`.as('goal_count'),
    totalSaved: sql<number>`coalesce(sum(distinct ${savingsGoals.savedAmount}), 0)`.as('total_saved'),
  })
  .from(users)
  .leftJoin(banks, eq(users.id, banks.userId))
  .leftJoin(transactions, eq(banks.id, transactions.senderBankId))
  .leftJoin(budgets, eq(users.id, budgets.userId))
  .leftJoin(savingsGoals, eq(users.id, savingsGoals.userId))
  .where(eq(users.id, userId))
  .groupBy(users.id, banks.id);
```

**Prisma** (separate queries — no multi-table GROUP BY)

```typescript
// Prisma can't do a 5-table LEFT JOIN with GROUP BY in one call.
// You'd use multiple queries or raw SQL:

const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    banks: {
      include: {
        sentTransactions: { where: { amount: { gt: 0 } } },
      },
    },
    budgets: { where: { month: '2026-03' } },
    savingsGoals: { where: { status: 'active' } },
  },
});

// Then aggregate in JavaScript:
const totalSpent = user.banks.flatMap(b => b.sentTransactions)
  .reduce((sum, t) => sum + Number(t.amount), 0);
const activeBudgets = user.budgets.length;
const activeGoals = user.savingsGoals.length;
const totalSaved = user.savingsGoals.reduce((sum, g) => sum + Number(g.savedAmount), 0);
```

Prisma fetches all rows and aggregates in JS. Drizzle pushes the aggregation to the database (where it belongs for large datasets). For small datasets, Prisma's approach is fine. For analytics at scale, Drizzle wins.

---

### 4) CRUD Operations — Side-by-Side

**Upsert a budget (this project's actual pattern)**

**Prisma**

```typescript
const budget = await prisma.budget.upsert({
  where: {
    userId_category_month: { userId, category: 'Food & Dining', month: '2026-03' },
  },
  update: { monthlyLimit: 400 },
  create: {
    userId,
    category: 'Food & Dining',
    monthlyLimit: 400,
    month: '2026-03',
  },
});
```

**Drizzle**

```typescript
const [budget] = await db
  .insert(budgets)
  .values({
    userId,
    category: 'Food & Dining',
    monthlyLimit: '400',
    month: '2026-03',
  })
  .onConflictDoUpdate({
    target: [budgets.userId, budgets.category, budgets.month],
    set: { monthlyLimit: '400', updatedAt: new Date() },
  })
  .returning();
```

Both clean. Drizzle maps directly to PostgreSQL's `ON CONFLICT DO UPDATE` — you see the exact SQL behavior.

---

**Find with filtering and ordering (get user's active goals)**

**Prisma**

```typescript
const goals = await prisma.savingsGoal.findMany({
  where: { userId, status: 'active' },
  orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
  include: { contributions: { orderBy: { createdAt: 'desc' }, take: 5 } },
});
```

**Drizzle**

```typescript
// Step 1: fetch goals
const goals = await db
  .select()
  .from(savingsGoals)
  .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.status, 'active')))
  .orderBy(asc(savingsGoals.targetDate), desc(savingsGoals.createdAt));

// Step 2: fetch recent contributions for each (batched)
const goalIds = goals.map(g => g.id);
const contributions = await db
  .select()
  .from(goalContributions)
  .where(inArray(goalContributions.goalId, goalIds))
  .orderBy(desc(goalContributions.createdAt));

// Step 3: merge in JS
const goalsWithContribs = goals.map(g => ({
  ...g,
  contributions: contributions.filter(c => c.goalId === g.id).slice(0, 5),
}));
```

Prisma handles the join + limit per relation in one call. Drizzle requires manual batching — but gives you full control over the exact queries hitting the database (no N+1 surprises).

---

**Transactional contribution + auto-complete goal**

**Prisma** (using `$transaction`)

```typescript
const [contribution, updatedGoal] = await prisma.$transaction([
  prisma.goalContribution.create({
    data: { goalId, amount: 250, note: 'March savings' },
  }),
  prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      savedAmount: { increment: 250 },
      status: newSaved >= targetAmount ? 'completed' : undefined,
    },
  }),
]);
```

**Drizzle**

```typescript
const result = await db.transaction(async (tx) => {
  const [contribution] = await tx.insert(goalContributions).values({
    goalId,
    amount: '250',
    note: 'March savings',
  }).returning();

  const [updatedGoal] = await tx
    .update(savingsGoals)
    .set({
      savedAmount: sql`${savingsGoals.savedAmount} + 250`,
      ...(newSaved >= targetAmount ? { status: 'completed' } : {}),
      updatedAt: new Date(),
    })
    .where(eq(savingsGoals.id, goalId))
    .returning();

  return { contribution, goal: updatedGoal };
});
```

Both work cleanly. Drizzle uses `sql` template for atomic increment — no read-modify-write race condition.

---

### 5) Performance & Benchmarks

| Factor | Prisma | Drizzle |
|--------|--------|---------|
| **Query generation** | Passes through Rust engine, adds ~1-3ms overhead | Direct SQL string building, near-zero overhead |
| **Cold start (serverless)** | Heavier — engine binary + WASM init | Lighter — pure JS/TS, faster Lambda/Edge cold starts |
| **Steady-state throughput** | "Fast enough" for most CRUD apps | Measurably faster for high-throughput pipelines |
| **Bundle size** | Larger (engine + generated client) | Smaller (no engine, no codegen artifacts) |
| **Connection pooling** | Built-in via engine | Relies on external poolers (pgBouncer, Neon pooler) |

> **Rule of thumb**: If raw request/response latency matters (serverless cold starts, ultra-high-throughput), Drizzle gives an edge. For standard CRUD in monoliths, Prisma is "fast enough" and better DX.

---

### 6) TypeScript DX & Compile-Time Tradeoffs

| Factor | Prisma | Drizzle |
|--------|--------|---------|
| **Type generation** | Codegen from schema → fast type-checking | TypeScript inference from table defs → heavier TS compiler work |
| **Editor autocomplete** | Excellent — generated client is narrow and specific | Good, but deeper inference can slow large schemas |
| **Schema definition** | Separate `.prisma` DSL (not TypeScript) | Pure TypeScript (no context switching) |
| **CI type-check speed** | Faster for large schemas (codegen'd types are flat) | Slower for large schemas (inference chains) |
| **Refactoring** | Rename in schema → regenerate → find all usages | Rename in TS → standard TS refactoring tools work |

Prisma's codegen approach means you run `prisma generate` after schema changes. Drizzle's pure-TS approach means no extra step, but heavier compiler load.

---

### 7) Migrations, Ecosystem, and Stability

| Factor | Prisma | Drizzle |
|--------|--------|---------|
| **Migrations** | `prisma migrate dev` — automatic diff from schema, battle-tested | `drizzle-kit generate` — newer, improving rapidly |
| **Studio/GUI** | Prisma Studio (built-in data browser) | Drizzle Studio (newer, web-based) |
| **Community** | Larger, more Stack Overflow answers, more tutorials | Rapidly growing, strong Discord community |
| **Maturity** | Production-proven since 2020 | Newer (2023+), but stable for most use cases |
| **Edge/Serverless** | Requires engine WASM for Edge, improving | Native Edge support, smaller footprint |
| **Multi-database** | PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB | PostgreSQL, MySQL, SQLite (relational only) |

---

### 8) The "More Code in Drizzle" Complaint — Why It's Actually Useful

From this project's codebase: Drizzle files have explicit `pgTable()` + `.relations()` files and explicit join-handling. It looks repetitive — but the repetition gives you:

1. **Explicit FK and join table control** — no magic, no hidden queries
2. **Easier debugging** — you see the exact SQL that runs, log it, explain it
3. **Flexible batching/transactions** — wire them precisely where needed
4. **No N+1 surprises** — Prisma's `include` can generate multiple queries under the hood; Drizzle makes you write them, so you know what's happening

**Practical pattern to reduce Drizzle friction:**

```
/db/
  tables/
    users.ts
    banks.ts
    transactions.ts
    budgets.ts
    savingsGoals.ts
    goalContributions.ts
  relations/
    index.ts          # import and combine all relations in one place
  queries/
    analytics.ts      # complex joins/aggregations
    budgets.ts        # budget CRUD helpers
    goals.ts          # goal CRUD helpers
```

Keeping relations in a single `relations/index.ts` and query patterns in `queries/` reduces scatter and keeps the codebase readable.

---

### 9) How to Make Drizzle Less Verbose (Practical Tips)

1. **Batch join inserts** — Use `insert().values([row1, row2, row3])` for multiple child rows in a single SQL call. Avoid `Promise.all` with individual inserts.

2. **Wrap multi-step ops in transactions** — `db.transaction(async (tx) => { ... })` gives you atomicity matching Prisma's nested writes.

3. **Create small helpers for common patterns:**

```typescript
// helpers/connectMany.ts
async function connectMany(
  tx: Transaction,
  joinTable: PgTable,
  parentField: string,
  parentId: string,
  childField: string,
  childIds: string[]
) {
  if (!childIds.length) return;
  const rows = childIds.map(childId => ({
    [parentField]: parentId,
    [childField]: childId,
  }));
  await tx.insert(joinTable).values(rows);
}
```

4. **Use relation helpers sparingly** — Only for developer-facing CRUD endpoints. Keep analytics queries as explicit joins.

5. **Materialized views** for expensive aggregation queries (compute once, read many) — both ORMs benefit from this, but Drizzle makes it easier to query views directly since they're just another table definition.

---

### 10) Complete Production Examples (From This Project's Schema)

#### A) Monthly Digest Report — Aggregating Across 5 Tables

**Drizzle** (single query, database does the work)

```typescript
const digestData = await db
  .select({
    totalSpent: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`.as('total_spent'),
    totalIncome: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end), 0)`.as('total_income'),
    transactionCount: sql<number>`count(distinct ${transactions.id})`.as('txn_count'),
    activeBudgets: sql<number>`count(distinct ${budgets.id})`.as('budget_count'),
    budgetsOverLimit: sql<number>`count(distinct case when ${budgets.monthlyLimit} < (
      select coalesce(sum(t2.amount), 0) from transactions t2
      where t2.category = ${budgets.category}
    ) then ${budgets.id} end)`.as('over_budget'),
    activeGoals: sql<number>`count(distinct ${savingsGoals.id})`.as('goal_count'),
    totalSaved: sql<number>`coalesce(sum(distinct ${savingsGoals.savedAmount}), 0)`.as('total_saved'),
  })
  .from(users)
  .leftJoin(banks, eq(users.id, banks.userId))
  .leftJoin(transactions, eq(banks.id, transactions.senderBankId))
  .leftJoin(budgets, and(eq(users.id, budgets.userId), eq(budgets.month, '2026-03')))
  .leftJoin(savingsGoals, and(eq(users.id, savingsGoals.userId), eq(savingsGoals.status, 'active')))
  .where(eq(users.id, userId))
  .groupBy(users.id);
```

**Prisma** (multiple queries + JS aggregation)

```typescript
const [user, txns, userBudgets, goals] = await Promise.all([
  prisma.user.findUnique({ where: { id: userId } }),
  prisma.transaction.findMany({
    where: { sender: { id: userId } },
    select: { amount: true, category: true },
  }),
  prisma.budget.findMany({
    where: { userId, month: '2026-03' },
  }),
  prisma.savingsGoal.findMany({
    where: { userId, status: 'active' },
    select: { savedAmount: true, id: true },
  }),
]);

const totalSpent = txns
  .filter(t => Number(t.amount) > 0)
  .reduce((sum, t) => sum + Number(t.amount), 0);
const totalIncome = txns
  .filter(t => Number(t.amount) < 0)
  .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
const categorySpend: Record<string, number> = {};
for (const t of txns) {
  if (Number(t.amount) > 0) {
    categorySpend[t.category] = (categorySpend[t.category] || 0) + Number(t.amount);
  }
}
const budgetsOverLimit = userBudgets.filter(
  b => (categorySpend[b.category] || 0) > Number(b.monthlyLimit)
).length;
const totalSaved = goals.reduce((sum, g) => sum + Number(g.savedAmount), 0);
```

Prisma fetches raw rows and aggregates in JavaScript. Drizzle pushes computation to PostgreSQL — important when datasets grow beyond trivial size.

#### B) Budget Upsert With Conflict Resolution

**Prisma**

```typescript
const budget = await prisma.budget.upsert({
  where: {
    userId_category_month: {
      userId: 'user-abc-123',
      category: 'Food & Dining',
      month: '2026-03',
    },
  },
  update: {
    monthlyLimit: 450,
  },
  create: {
    userId: 'user-abc-123',
    category: 'Food & Dining',
    monthlyLimit: 450,
    month: '2026-03',
  },
});
```

**Drizzle**

```typescript
const [budget] = await db
  .insert(budgets)
  .values({
    userId: 'user-abc-123',
    category: 'Food & Dining',
    monthlyLimit: '450',
    month: '2026-03',
  })
  .onConflictDoUpdate({
    target: [budgets.userId, budgets.category, budgets.month],
    set: {
      monthlyLimit: '450',
      updatedAt: new Date(),
    },
  })
  .returning();
```

#### C) Goal Contribution With Atomic Increment + Auto-Complete

**Prisma**

```typescript
const [contribution, updatedGoal] = await prisma.$transaction([
  prisma.goalContribution.create({
    data: {
      goalId: 'goal-xyz-789',
      amount: 250,
      note: 'March savings',
    },
  }),
  prisma.savingsGoal.update({
    where: { id: 'goal-xyz-789' },
    data: {
      savedAmount: { increment: 250 },
      status: newTotal >= targetAmount ? 'completed' : undefined,
    },
  }),
]);
```

**Drizzle**

```typescript
const result = await db.transaction(async (tx) => {
  const [contribution] = await tx.insert(goalContributions).values({
    goalId: 'goal-xyz-789',
    amount: '250',
    note: 'March savings',
  }).returning();

  const [updatedGoal] = await tx
    .update(savingsGoals)
    .set({
      savedAmount: sql`${savingsGoals.savedAmount} + 250`,
      status: newTotal >= targetAmount ? 'completed' : 'active',
      updatedAt: new Date(),
    })
    .where(eq(savingsGoals.id, 'goal-xyz-789'))
    .returning();

  return { contribution, goal: updatedGoal };
});
```

Both use transactions. Drizzle's `sql` template for atomic increment avoids read-modify-write race conditions at the database level.

---

### 11) When to Pick Which (Practical Checklist)

#### Pick Prisma if:

- You want nested writes and reads with minimal code
- Your team values quick onboarding and strong tooling (Studio, migrations)
- You have CRUD-heavy endpoints and don't need complex SQL every day
- You want a larger community with more tutorials and Stack Overflow answers
- You need MongoDB support (Drizzle is relational only)
- You prioritize developer experience over raw performance

#### Pick Drizzle if:

- You build analytics, complex joins, or need predictable SQL output
- You're optimizing for serverless cold start latency or want minimal runtime overhead
- You prefer the "everything in TypeScript" approach and want to avoid an external codegen step
- You need window functions, CTEs, or complex aggregations without falling back to raw SQL
- You want to see and control the exact SQL hitting your database
- You're building for Edge runtimes where bundle size matters

---

### 12) Summary Table — Feature-by-Feature

| Feature | Prisma | Drizzle |
|---------|--------|---------|
| **Schema definition** | `.prisma` DSL (separate language) | Pure TypeScript |
| **Relations** | Implicit from schema | Explicit `relations()` helpers |
| **Nested creates** | Built-in (`create: { ... }`) | Manual transaction + inserts |
| **Nested reads** | `include: { ... }` | Manual joins or separate queries |
| **Upsert** | `prisma.model.upsert()` | `onConflictDoUpdate()` |
| **Aggregations** | `.aggregate()`, `.groupBy()` | `sql` template + `.groupBy()` |
| **Complex joins** | Limited — often needs `$queryRaw` | Native — mirrors SQL directly |
| **Window functions** | `$queryRaw` only | `sql` template, first-class |
| **Migrations** | `prisma migrate dev` (mature) | `drizzle-kit generate` (newer) |
| **Studio/GUI** | Prisma Studio (built-in) | Drizzle Studio (web-based) |
| **Codegen required** | Yes (`prisma generate`) | No |
| **Bundle size** | Larger (Rust engine) | Smaller (pure JS) |
| **Cold start** | Slower (engine init) | Faster |
| **Edge runtime** | Requires WASM adapter | Native support |
| **Type safety** | Codegen'd (fast checks) | Inferred (heavier checks) |
| **Raw SQL escape hatch** | `$queryRaw`, `$executeRaw` | `sql` template (inline) |
| **Transaction API** | `$transaction([...])` or interactive | `db.transaction(async (tx) => { ... })` |
| **Learning curve** | Lower (more abstracted) | Higher (closer to SQL) |
| **Maturity** | 5+ years, battle-tested | 2+ years, rapidly maturing |

> **This project uses Prisma** because it's a CRUD-heavy banking app where nested writes (goals + contributions, alerts + trigger logs) happen frequently, the team benefits from Studio for debugging, and the runtime overhead is negligible given the 5-minute caching layer on all Plaid/Gemini calls. If this were a high-throughput analytics pipeline or a serverless Edge function, Drizzle would be the better choice.

---

## License

This project is for educational and portfolio purposes.
