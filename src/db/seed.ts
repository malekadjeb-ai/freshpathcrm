/**
 * Seed script for Fresh Path CRM on Cloudflare D1.
 *
 * For local: npx wrangler d1 execute fresh-path-crm --local --file=src/db/seed.sql
 * For remote: npx wrangler d1 execute fresh-path-crm --remote --file=src/db/seed.sql
 *
 * This TypeScript file generates the SQL — run `npx tsx src/db/seed.ts > src/db/seed.sql`
 * Or use it directly with wrangler d1 execute.
 */

import { randomUUID } from "crypto";
import { hashSync } from "bcryptjs";

const tenantId = randomUUID();
const userId = randomUUID();
const settingsId = randomUUID();
const now = new Date().toISOString();

const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) {
  console.error("ERROR: Set SEED_ADMIN_PASSWORD environment variable before running seed.");
  process.exit(1);
}
const passwordHash = hashSync(password, 12);

const sql = `
-- Seed: Fresh Path CRM
-- Generated: ${now}

-- Tenant
INSERT OR IGNORE INTO Tenant (id, name, slug, plan, status, created_at, updated_at)
VALUES ('${tenantId}', 'Fresh Path Mobile Detailing', 'freshpath', 'PRO', 'ACTIVE', '${now}', '${now}');

-- Admin User (password: freshpath2025)
INSERT OR IGNORE INTO User (id, name, email, password, role, tenant_id, created_at, updated_at)
VALUES ('${userId}', 'Malek', 'admin@freshpath.com', '${passwordHash}', 'OWNER', '${tenantId}', '${now}', '${now}');

-- Business Settings
INSERT OR IGNORE INTO BusinessSettings (id, business_name, phone, email, website, city, state, zip, tax_rate, tenant_id, created_at, updated_at, setup_complete)
VALUES ('${settingsId}', 'Fresh Path Mobile Detailing', '', 'admin@freshpath.com', '', 'Richmond', 'TX', '77406', 0, '${tenantId}', '${now}', '${now}', 1);

-- Service Items
INSERT OR IGNORE INTO ServiceItem (id, name, description, base_price, category, is_active, estimated_minutes, sort_order, created_at, updated_at)
VALUES
  ('${randomUUID()}', 'Interior Detail', 'Complete interior cleaning, vacuuming, dashboard/console wipe, window cleaning', 150, 'Service', 1, 90, 1, '${now}', '${now}'),
  ('${randomUUID()}', 'Exterior Detail', 'Hand wash, clay bar, polish, wax/sealant, tire dressing, trim restore', 175, 'Service', 1, 120, 2, '${now}', '${now}'),
  ('${randomUUID()}', 'Full Detail', 'Complete interior + exterior detail package', 299, 'Service', 1, 180, 3, '${now}', '${now}'),
  ('${randomUUID()}', 'Ceramic Coating', 'Professional-grade ceramic coating application with paint correction prep', 599, 'Service', 1, 300, 4, '${now}', '${now}'),
  ('${randomUUID()}', 'Paint Correction', 'Multi-stage paint correction to remove swirls, scratches, and oxidation', 450, 'Service', 1, 240, 5, '${now}', '${now}'),
  ('${randomUUID()}', 'Engine Bay Detail', 'Engine bay degreasing and dressing', 75, 'AddOn', 1, 30, 6, '${now}', '${now}'),
  ('${randomUUID()}', 'Headlight Restoration', 'UV headlight restoration and clear coat', 60, 'AddOn', 1, 30, 7, '${now}', '${now}'),
  ('${randomUUID()}', 'Pet Hair Removal', 'Thorough pet hair removal from all surfaces', 50, 'AddOn', 1, 45, 8, '${now}', '${now}'),
  ('${randomUUID()}', 'Odor Elimination', 'Ozone treatment and deep odor removal', 75, 'AddOn', 1, 60, 9, '${now}', '${now}');
`;

console.log(sql);
