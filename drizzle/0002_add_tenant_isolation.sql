-- Add tenantId to campaigns and quotes for tenant isolation
ALTER TABLE "Campaign" ADD COLUMN "tenant_id" text NOT NULL DEFAULT 'default';
ALTER TABLE "Quote" ADD COLUMN "tenant_id" text NOT NULL DEFAULT 'default';

-- Create indexes for tenant queries
CREATE INDEX IF NOT EXISTS "Campaign_tenantId_idx" ON "Campaign" ("tenant_id");
CREATE INDEX IF NOT EXISTS "Quote_tenantId_idx" ON "Quote" ("tenant_id");
CREATE INDEX IF NOT EXISTS "Communication_createdAt_idx" ON "Communication" ("created_at");
