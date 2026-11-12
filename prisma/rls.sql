-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant-isolation row-level security (defence in depth).
--
-- Apply this AFTER the schema migration and ONLY once the application sets the
-- per-request tenant on each connection, e.g.:
--
--     SET app.current_org = '<organizationId>';
--
-- in a transaction before issuing queries (Prisma: $executeRaw at the start of
-- an interactive transaction, or a connection middleware). Until the app sets
-- that variable, do NOT enable these policies or inserts/selects will be blocked.
--
-- This file is intentionally NOT an auto-run migration. See docs/DATABASE.md and
-- docs/DEPLOYMENT.md § Row-level security.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: current tenant from the session (NULL when unset).
CREATE OR REPLACE FUNCTION current_org() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.current_org', true) $$;

-- Enable + force RLS and add an org-scoped policy on every org-scoped table.
-- Adjust the table list to match the @@map names in schema.prisma if you change them.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients', 'employees', 'client_assignments',
    'marketplace_accounts', 'advertising_accounts', 'sync_logs',
    'products', 'orders', 'order_items', 'sales_metrics', 'inventory',
    'campaigns', 'ad_sets', 'ads', 'campaign_metrics',
    'ai_recommendations',
    'creative_templates', 'creative_projects', 'creative_versions', 'creative_assets',
    'leads', 'reports', 'notifications', 'audit_logs'
  ]
  LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format($p$
        CREATE POLICY org_isolation ON %I
          USING ("organizationId" = current_org())
          WITH CHECK ("organizationId" = current_org())
      $p$, t);
    END IF;
  END LOOP;
END $$;
