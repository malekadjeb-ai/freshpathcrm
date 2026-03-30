
-- Seed: Fresh Path CRM
-- Generated: 2026-03-28T09:56:05.147Z

-- Tenant
INSERT OR IGNORE INTO Tenant (id, name, slug, plan, status, created_at, updated_at)
VALUES ('a7d35860-c418-4548-995c-6f28d6019857', 'Fresh Path Mobile Detailing', 'freshpath', 'PRO', 'ACTIVE', '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z');

-- Admin User (password: freshpath2025)
INSERT OR IGNORE INTO User (id, name, email, password, role, tenant_id, created_at, updated_at)
VALUES ('07b7b3a0-4895-4183-ae3f-60a4670ac0c8', 'Malek', 'admin@freshpath.com', '$2b$10$KkIWYytnJkDPb4RfPsg4xOYo7jTZ4yxV27nwOZ0XnV55O8pSr24i6', 'OWNER', 'a7d35860-c418-4548-995c-6f28d6019857', '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z');

-- Business Settings
INSERT OR IGNORE INTO BusinessSettings (id, business_name, phone, email, website, city, state, zip, tax_rate, tenant_id, created_at, updated_at, setup_complete)
VALUES ('d196a8ea-1328-4ab3-9e66-7ce57bcff369', 'Fresh Path Mobile Detailing', '', 'admin@freshpath.com', '', 'Richmond', 'TX', '77406', 0, 'a7d35860-c418-4548-995c-6f28d6019857', '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z', 1);

-- Service Items
INSERT OR IGNORE INTO ServiceItem (id, name, description, base_price, category, is_active, estimated_minutes, sort_order, created_at, updated_at)
VALUES
  ('c63c7594-8f66-40d7-825b-83d391ff552d', 'Interior Detail', 'Complete interior cleaning, vacuuming, dashboard/console wipe, window cleaning', 150, 'Service', 1, 90, 1, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('3b2a111a-2aa0-49d4-a0b7-808beecfd458', 'Exterior Detail', 'Hand wash, clay bar, polish, wax/sealant, tire dressing, trim restore', 175, 'Service', 1, 120, 2, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('5fd85b7d-a2d1-4313-8c74-dccced6960bd', 'Full Detail', 'Complete interior + exterior detail package', 299, 'Service', 1, 180, 3, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('b5d9aeda-81f1-459b-971f-336d7bceb74d', 'Ceramic Coating', 'Professional-grade ceramic coating application with paint correction prep', 599, 'Service', 1, 300, 4, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('48634d8c-a0a1-4b6a-8feb-c0226c2c047e', 'Paint Correction', 'Multi-stage paint correction to remove swirls, scratches, and oxidation', 450, 'Service', 1, 240, 5, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('bcbafda9-fb7a-48c9-beb8-6ae7221d204d', 'Engine Bay Detail', 'Engine bay degreasing and dressing', 75, 'AddOn', 1, 30, 6, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('51106102-19d6-4621-a9ef-029f2dd6c3fd', 'Headlight Restoration', 'UV headlight restoration and clear coat', 60, 'AddOn', 1, 30, 7, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('c95f0d5c-f085-426a-afb3-fad800d76e48', 'Pet Hair Removal', 'Thorough pet hair removal from all surfaces', 50, 'AddOn', 1, 45, 8, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z'),
  ('2db3f1f8-fabf-4588-9cba-92c502dc36ed', 'Odor Elimination', 'Ozone treatment and deep odor removal', 75, 'AddOn', 1, 60, 9, '2026-03-28T09:56:05.147Z', '2026-03-28T09:56:05.147Z');

