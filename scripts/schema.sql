CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name VARCHAR(100) NOT NULL,
 email VARCHAR(255) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS accounts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL UNIQUE REFERENCES users(id),
 account_number VARCHAR(20) UNIQUE NOT NULL,
 balance_cents BIGINT NOT NULL DEFAULT 0 CHECK(balance_cents>=0)
);
CREATE TABLE IF NOT EXISTS transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id),
 type VARCHAR(10) NOT NULL CHECK(type IN ('credit','debit')),
 amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
 description VARCHAR(255) NOT NULL,
 reference VARCHAR(50) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_reference_idx ON transactions(reference);
