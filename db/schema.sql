CREATE TABLE IF NOT EXISTS arcanju_orders (
 store_id text NOT NULL,
 order_id text NOT NULL,
 source_updated_at timestamptz NOT NULL,
 data jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(store_id,order_id)
);
CREATE TABLE IF NOT EXISTS arcanju_jobs (
 store_id text NOT NULL, order_id text NOT NULL,
 generation bigint NOT NULL DEFAULT 1, processed_generation bigint NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
 claim_token text, attempts integer NOT NULL DEFAULT 0, last_error text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(store_id,order_id)
);
CREATE INDEX IF NOT EXISTS arcanju_jobs_pending ON arcanju_jobs(available_at) WHERE generation > processed_generation;
CREATE TABLE IF NOT EXISTS arcanju_sync (
 store_id text PRIMARY KEY, checked_until timestamptz, last_error text, updated_at timestamptz DEFAULT now()
);
