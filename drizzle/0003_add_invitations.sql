-- Team invitations table for multi-user invite system
CREATE TABLE IF NOT EXISTS "Invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'TECH',
  "invited_by" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" text NOT NULL,
  "accepted_at" text,
  "created_at" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "Invitation_tenantId_idx" ON "Invitation" ("tenant_id");
CREATE INDEX IF NOT EXISTS "Invitation_token_idx" ON "Invitation" ("token");
CREATE INDEX IF NOT EXISTS "Invitation_status_idx" ON "Invitation" ("status");
