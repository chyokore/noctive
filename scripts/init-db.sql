-- PostgreSQL Schema Initialization for Noctive Paper Ledger Store
-- Run this script on your PostgreSQL database instance specified by DATABASE_URL

CREATE TABLE IF NOT EXISTS decision_receipts (
  receipt_id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decision_receipts_timestamp ON decision_receipts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decision_receipts_is_demo ON decision_receipts (is_demo);

CREATE TABLE IF NOT EXISTS live_run_audits (
  audit_id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_run_audits_timestamp ON live_run_audits (timestamp DESC);

CREATE TABLE IF NOT EXISTS reality_market_snapshots (
  snapshot_id VARCHAR(64) PRIMARY KEY,
  ticker VARCHAR(32) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reality_snapshots_ticker ON reality_market_snapshots (ticker, timestamp DESC);
