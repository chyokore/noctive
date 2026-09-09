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
