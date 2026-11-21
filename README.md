# AstraBank – Online Banking Full-Stack Demo

**Portfolio/demo application only.** This software does not connect to a bank, process real payments, or provide regulated financial services. It is **not production-ready for real money or real customer financial data**.

## Features
- Responsive customer and administrator dashboards
- Customer registration, sign-in, sign-out
- HTTP-only signed session cookie, bcrypt password hashing
- Customer account and transaction history
- Simulated peer-to-peer transfers using PostgreSQL transactions and row locks
- Administrator customer enable/disable and simulated balance credit
- Role checks on every protected API, prepared parameterized SQL
- Indian rupee display, mobile-friendly Tailwind UI

## Stack
Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Node.js serverless API routes, PostgreSQL (Neon or equivalent), `postgres`, `bcryptjs`, `jose`.

## Run locally in VS Code (Windows PowerShell)
1. Install Node.js 20+ and open this folder in VS Code.
2. Create a free PostgreSQL database at https://neon.tech/ (or run local PostgreSQL). Copy the **connection string**.
3. In PowerShell inside the project folder:
   ```powershell
   npm install
   Copy-Item .env.example .env.local
   ```
4. Edit `.env.local`: set `DATABASE_URL`, a random `JWT_SECRET` of 32+ characters, and change the demo passwords. To generate a secret:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Initialize database and seed two demo users:
   ```powershell
   node scripts/setup.mjs
   ```
6. Start the project:
   ```powershell
   npm run dev
   ```
7. Open http://localhost:3000
8. Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for admin or `SEED_CUSTOMER_EMAIL` / `SEED_CUSTOMER_PASSWORD` for customer.

New registered customers start with **₹0**. Sign in as admin to add demo funds. You can create a second customer and transfer simulated funds using their account number.

## Deploy to Vercel
1. Push this project to a **private GitHub repository**. Never commit `.env.local`.
2. In Vercel, choose **Add New Project → Import Git Repository**.
3. Framework: Next.js; Root Directory: the folder containing `package.json`.
4. Under **Environment Variables**, add `DATABASE_URL` and `JWT_SECRET`. Seed credentials are only needed locally for `scripts/setup.mjs`.
5. Run `node scripts/setup.mjs` **against the intended disposable database** before deploying. It creates tables and demo accounts if absent. Do not run the seed script on a real banking database.
6. Deploy. The admin and customer demo credentials will be those used during seeding.
7. Keep the site access-restricted when using predictable demo accounts, and change seed passwords before exposing any demo publicly.

**Important:** Vercel serverless storage is ephemeral; this project uses PostgreSQL so balances and transactions persist across deployments. It does not use SQLite or local JSON files.

## API endpoints
- `POST /api/register` – register customer
- `POST /api/login` – login
- `POST /api/logout` – logout
- `GET /api/me` – session profile
- `GET /api/overview` – customer dashboard
- `POST /api/transfer` – simulated transfer `{destination,amount}`
- `GET /api/admin/overview` – admin dashboard
- `POST /api/admin/status` – enable/disable customer `{userId,status}`
- `POST /api/admin/credit` – demo funding `{userId,amount}`
- `GET /api/health` – health check

## Important security limitations
This is a learning prototype. Do not store real financial or sensitive customer data. Before any production use, implement at least: MFA, email verification, rate limits, account lockout, CSRF defenses, secure audit logging, idempotency keys, transfer limits, robust ledger accounting, reconciliation, observability, fraud controls, full authorization testing, vulnerability assessment, backup/restore procedures, legal/compliance review, and a licensed payment/banking provider. The admin credit endpoint **mints demo funds** and must never exist in a real-money system.

The transaction log is a demonstration ledger, not a double-entry accounting system. Demo transfers are atomic, but the app is not certified or audited for financial operations.
