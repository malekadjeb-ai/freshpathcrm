import { sqliteTable, text, integer, real, index, uniqueIndex, AnySQLiteColumn } from "drizzle-orm/sqlite-core";

// ─── Auth ────────────────────────────────────────────────────────

export const users = sqliteTable("User", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("USER"),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailTenantIdx: uniqueIndex("User_email_tenantId_key").on(table.email, table.tenantId),
}));

export const tenants = sqliteTable("Tenant", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("FREE"),
  billingCustomerId: text("billing_customer_id"),
  billingSubscriptionId: text("billing_subscription_id"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Business Settings ───────────────────────────────────────────

export const businessSettings = sqliteTable("BusinessSettings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessName: text("business_name").notNull().default("Fresh Path Mobile Detailing"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  website: text("website").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default("TX"),
  zip: text("zip").notNull().default(""),
  logoPath: text("logo_path").notNull().default(""),
  taxRate: real("tax_rate").notNull().default(0),
  defaultPaymentTerms: text("default_payment_terms").notNull().default("Due on receipt"),
  invoiceFooter: text("invoice_footer").notNull().default("Thank you for choosing Fresh Path Mobile Detailing!"),
  googleReviewUrl: text("google_review_url"),
  autoRequestReviews: integer("auto_request_reviews", { mode: "boolean" }).notNull().default(true),
  reviewRequestDelay: integer("review_request_delay").notNull().default(24),
  communicationMode: text("communication_mode").notNull().default("dev"),
  emailProvider: text("email_provider"),
  senderEmail: text("sender_email"),
  emailFromName: text("email_from_name").notNull().default("Fresh Path Mobile Detailing"),
  enableEmailToSMS: integer("enable_email_to_sms", { mode: "boolean" }).notNull().default(false),
  stripePublishableKey: text("stripe_publishable_key"),
  depositRequired: integer("deposit_required", { mode: "boolean" }).notNull().default(false),
  depositPercentage: real("deposit_percentage").notNull().default(25),
  bookingEnabled: integer("booking_enabled", { mode: "boolean" }).notNull().default(false),
  bookingPageSlug: text("booking_page_slug").default("book"),
  bookingPageTitle: text("booking_page_title").default("Book Your Detail"),
  bookingPageDescription: text("booking_page_description"),
  workingHoursStart: text("working_hours_start").notNull().default("07:00"),
  workingHoursEnd: text("working_hours_end").notNull().default("19:00"),
  workingDays: text("working_days").notNull().default("[1,2,3,4,5,6]"),
  maxJobsPerDay: integer("max_jobs_per_day").notNull().default(8),
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(60),
  bufferMinutes: integer("buffer_minutes").notNull().default(30),
  autoConfirmBookings: integer("auto_confirm_bookings", { mode: "boolean" }).notNull().default(true),
  autoSendReminders: integer("auto_send_reminders", { mode: "boolean" }).notNull().default(true),
  rebookPromptDays: integer("rebook_prompt_days").notNull().default(30),
  dormantThresholdDays: integer("dormant_threshold_days").notNull().default(60),
  monthlyRevenueGoal: real("monthly_revenue_goal").notNull().default(10000),
  setupComplete: integer("setup_complete", { mode: "boolean" }).notNull().default(false),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: text("google_token_expiry"),
  googleEmail: text("google_email"),
  gvSyncEnabled: integer("gv_sync_enabled", { mode: "boolean" }).notNull().default(false),
  gvAutoSyncMinutes: integer("gv_auto_sync_minutes").notNull().default(5),
  gvLastSyncAt: text("gv_last_sync_at"),
  autoExpenseEnabled: integer("auto_expense_enabled", { mode: "boolean" }).notNull().default(true),
  mileageRate: real("mileage_rate").notNull().default(0.67),
  autoExpenseMileage: integer("auto_expense_mileage", { mode: "boolean" }).notNull().default(true),
  autoExpenseSupplies: integer("auto_expense_supplies", { mode: "boolean" }).notNull().default(true),
  tenantId: text("tenant_id").notNull().unique().references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Tags ────────────────────────────────────────────────────────

export const tags = sqliteTable("Tag", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#10b981"),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tenantIdIdx: index("Tag_tenantId_idx").on(table.tenantId),
}));

// ─── Customers ───────────────────────────────────────────────────

export const customers = sqliteTable("Customer", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  phoneCarrier: text("phone_carrier"),
  address: text("address"),
  city: text("city"),
  zip: text("zip"),
  neighborhood: text("neighborhood"),
  avatarUrl: text("avatar_url"),
  source: text("source"),
  sourceDetail: text("source_detail"),
  lifecycleStage: text("lifecycle_stage").notNull().default("new"),
  preferredContact: text("preferred_contact").notNull().default("text"),
  birthday: text("birthday"),
  lastContactedAt: text("last_contacted_at"),
  lastJobAt: text("last_job_at"),
  healthScore: integer("health_score"),
  gateCode: text("gate_code"),
  specialInstructions: text("special_instructions"),
  customFields: text("custom_fields"),
  isCommercial: integer("is_commercial", { mode: "boolean" }).notNull().default(false),
  companyName: text("company_name"),
  taxId: text("tax_id"),
  billingEmail: text("billing_email"),
  billingContact: text("billing_contact"),
  paymentTerms: text("payment_terms"),
  fleetSize: integer("fleet_size"),
  fleetDiscount: real("fleet_discount"),
  contractNotes: text("contract_notes"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  referredById: text("referred_by_id").references((): AnySQLiteColumn => customers.id),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  phoneIdx: index("Customer_phone_idx").on(table.phone),
  emailIdx: index("Customer_email_idx").on(table.email),
  cityIdx: index("Customer_city_idx").on(table.city),
  createdAtIdx: index("Customer_createdAt_idx").on(table.createdAt),
  lifecycleStageIdx: index("Customer_lifecycleStage_idx").on(table.lifecycleStage),
  sourceIdx: index("Customer_source_idx").on(table.source),
  isCommercialIdx: index("Customer_isCommercial_idx").on(table.isCommercial),
  lastJobAtIdx: index("Customer_lastJobAt_idx").on(table.lastJobAt),
  referredByIdIdx: index("Customer_referredById_idx").on(table.referredById),
  tenantIdIdx: index("Customer_tenantId_idx").on(table.tenantId),
}));

export const customerTags = sqliteTable("_CustomerTags", {
  customerId: text("A").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tagId: text("B").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: uniqueIndex("_CustomerTags_AB_unique").on(table.customerId, table.tagId),
  tagIdx: index("_CustomerTags_B_index").on(table.tagId),
}));

export const customerNotes = sqliteTable("CustomerNote", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("CustomerNote_customerId_idx").on(table.customerId),
}));

// ─── Activity Log ────────────────────────────────────────────────

export const activities = sqliteTable("Activity", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  direction: text("direction"),
  summary: text("summary").notNull(),
  followUpDate: text("follow_up_date"),
  followUpDone: integer("follow_up_done", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("Activity_customerId_idx").on(table.customerId),
  leadIdIdx: index("Activity_leadId_idx").on(table.leadId),
  followUpDateIdx: index("Activity_followUpDate_idx").on(table.followUpDate),
}));

// ─── Vehicles ────────────────────────────────────────────────────

export const vehicles = sqliteTable("Vehicle", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  color: text("color"),
  licensePlate: text("license_plate"),
  vehicleType: text("vehicle_type").notNull().default("Sedan"),
  vin: text("vin"),
  mileage: integer("mileage"),
  conditionNotes: text("condition_notes"),
  lastServiceDate: text("last_service_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("Vehicle_customerId_idx").on(table.customerId),
}));

// ─── Service Catalog ─────────────────────────────────────────────

export const serviceItems = sqliteTable("ServiceItem", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  basePrice: real("base_price").notNull(),
  category: text("category").notNull().default("Service"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  estimatedMinutes: integer("estimated_minutes"),
  supplyCost: real("supply_cost").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  categoryIdx: index("ServiceItem_category_idx").on(table.category),
  isActiveIdx: index("ServiceItem_isActive_idx").on(table.isActive),
  tenantIdIdx: index("ServiceItem_tenantId_idx").on(table.tenantId),
}));

export const vehicleTypeModifiers = sqliteTable("VehicleTypeModifier", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceItemId: text("service_item_id").notNull().references(() => serviceItems.id, { onDelete: "cascade" }),
  vehicleType: text("vehicle_type").notNull(),
  priceAdjustment: real("price_adjustment").notNull().default(0),
}, (table) => ({
  serviceItemIdIdx: index("VehicleTypeModifier_serviceItemId_idx").on(table.serviceItemId),
}));

// ─── Jobs ────────────────────────────────────────────────────────

export const jobs = sqliteTable("Job", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  scheduledAt: text("scheduled_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  status: text("status").notNull().default("Scheduled"),
  address: text("address"),
  city: text("city"),
  location: text("location").notNull().default("Richmond"),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  discountType: text("discount_type").notNull().default("dollar"),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  photos: text("photos").notNull().default("[]"),
  assignedToId: text("assigned_to_id"),
  estimatedDuration: integer("estimated_duration"),
  actualDuration: integer("actual_duration"),
  tip: real("tip").notNull().default(0),
  travelTime: integer("travel_time"),
  mileage: real("mileage"),
  customerSignature: text("customer_signature"),
  checklistComplete: integer("checklist_complete", { mode: "boolean" }).notNull().default(false),
  showInGallery: integer("show_in_gallery", { mode: "boolean" }).notNull().default(false),
  promoCodeId: text("promo_code_id"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index("Job_status_idx").on(table.status),
  scheduledAtIdx: index("Job_scheduledAt_idx").on(table.scheduledAt),
  customerIdIdx: index("Job_customerId_idx").on(table.customerId),
  completedAtIdx: index("Job_completedAt_idx").on(table.completedAt),
  assignedToIdIdx: index("Job_assignedToId_idx").on(table.assignedToId),
}));

export const jobServices = sqliteTable("JobService", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  serviceItemId: text("service_item_id").references(() => serviceItems.id, { onDelete: "restrict" }),
  name: text("name"),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull().default(1),
}, (table) => ({
  jobIdIdx: index("JobService_jobId_idx").on(table.jobId),
  serviceItemIdIdx: index("JobService_serviceItemId_idx").on(table.serviceItemId),
}));

export const jobStatusHistory = sqliteTable("JobStatusHistory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  jobIdIdx: index("JobStatusHistory_jobId_idx").on(table.jobId),
}));

// ─── Invoices ────────────────────────────────────────────────────

export const invoices = sqliteTable("Invoice", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceNumber: text("invoice_number").notNull().unique(),
  jobId: text("job_id").notNull().unique().references(() => jobs.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("Draft"),
  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull(),
  dueDate: text("due_date"),
  paidAt: text("paid_at"),
  sentAt: text("sent_at"),
  sentVia: text("sent_via"),
  viewedAt: text("viewed_at"),
  paymentLink: text("payment_link"),
  tipAmount: real("tip_amount").notNull().default(0),
  depositAmount: real("deposit_amount").notNull().default(0),
  depositPaidAt: text("deposit_paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  notes: text("notes"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index("Invoice_status_idx").on(table.status),
  customerIdIdx: index("Invoice_customerId_idx").on(table.customerId),
  dueDateIdx: index("Invoice_dueDate_idx").on(table.dueDate),
}));

// ─── Communications ──────────────────────────────────────────────

export const communications = sqliteTable("Communication", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  direction: text("direction").notNull(),
  status: text("status").notNull(),
  summary: text("summary"),
  body: text("body"),
  duration: integer("duration"),
  outcome: text("outcome"),
  externalId: text("external_id"),
  channel: text("channel"),
  source: text("source"),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  campaignId: text("campaign_id"),
  deliveredAt: text("delivered_at"),
  openedAt: text("opened_at"),
  clickedAt: text("clicked_at"),
  bouncedAt: text("bounced_at"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("Communication_customerId_idx").on(table.customerId),
  leadIdIdx: index("Communication_leadId_idx").on(table.leadId),
  typeIdx: index("Communication_type_idx").on(table.type),
  externalIdIdx: index("Communication_externalId_idx").on(table.externalId),
  jobIdIdx: index("Communication_jobId_idx").on(table.jobId),
}));

// ─── Payments ────────────────────────────────────────────────────

export const payments = sqliteTable("Payment", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  method: text("method").notNull().default("Cash"),
  paymentDate: text("payment_date").notNull().$defaultFn(() => new Date().toISOString()),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  invoiceIdIdx: index("Payment_invoiceId_idx").on(table.invoiceId),
}));

// ─── Estimates ───────────────────────────────────────────────────

export const estimates = sqliteTable("Estimate", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  estimateNumber: text("estimate_number").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  vehicleId: text("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  status: text("status").notNull().default("Draft"),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  validUntil: text("valid_until"),
  sentAt: text("sent_at"),
  respondedAt: text("responded_at"),
  convertedJobId: text("converted_job_id").unique().references(() => jobs.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  deletedAt: text("deleted_at"),
}, (table) => ({
  customerIdIdx: index("Estimate_customerId_idx").on(table.customerId),
  statusIdx: index("Estimate_status_idx").on(table.status),
}));

export const estimateItems = sqliteTable("EstimateItem", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  estimateId: text("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  serviceId: text("service_id").references(() => serviceItems.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  estimateIdIdx: index("EstimateItem_estimateId_idx").on(table.estimateId),
}));

// ─── Notifications ───────────────────────────────────────────────

export const notifications = sqliteTable("Notification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index("Notification_userId_idx").on(table.userId),
  readIdx: index("Notification_read_idx").on(table.read),
  createdAtIdx: index("Notification_createdAt_idx").on(table.createdAt),
}));

// ─── Audit Log ───────────────────────────────────────────────────

export const auditLogs = sqliteTable("AuditLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details"),
  userId: text("user_id"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  entityIdx: index("AuditLog_entity_entityId_idx").on(table.entity, table.entityId),
  createdAtIdx: index("AuditLog_createdAt_idx").on(table.createdAt),
}));

// ─── Leads ───────────────────────────────────────────────────────

export const leads = sqliteTable("Lead", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  source: text("source").notNull(),
  sourceDetail: text("source_detail"),
  status: text("status").notNull().default("New"),
  lostReason: text("lost_reason"),
  lostNotes: text("lost_notes"),
  notes: text("notes"),
  vehicleInfo: text("vehicle_info"),
  address: text("address"),
  city: text("city"),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  estimateId: text("estimate_id"),
  assignedTo: text("assigned_to"),
  priority: text("priority").notNull().default("medium"),
  estimatedValue: real("estimated_value"),
  responseTime: integer("response_time"),
  followUpCount: integer("follow_up_count").notNull().default(0),
  nextFollowUpDate: text("next_follow_up_date"),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  contactedAt: text("contacted_at"),
  convertedAt: text("converted_at"),
  lostAt: text("lost_at"),
}, (table) => ({
  statusIdx: index("Lead_status_idx").on(table.status),
  sourceIdx: index("Lead_source_idx").on(table.source),
  createdAtIdx: index("Lead_createdAt_idx").on(table.createdAt),
  customerIdIdx: index("Lead_customerId_idx").on(table.customerId),
  nextFollowUpDateIdx: index("Lead_nextFollowUpDate_idx").on(table.nextFollowUpDate),
  tenantIdIdx: index("Lead_tenantId_idx").on(table.tenantId),
}));

// ─── Tasks ───────────────────────────────────────────────────────

export const tasks = sqliteTable("Task", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("general"),
  dueDate: text("due_date"),
  dueTime: text("due_time"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  assignedTo: text("assigned_to"),
  priority: text("priority").notNull().default("medium"),
  isAutomated: integer("is_automated", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  dueDateIdx: index("Task_dueDate_idx").on(table.dueDate),
  customerIdIdx: index("Task_customerId_idx").on(table.customerId),
  jobIdIdx: index("Task_jobId_idx").on(table.jobId),
  leadIdIdx: index("Task_leadId_idx").on(table.leadId),
  completedIdx: index("Task_completed_idx").on(table.completed),
  priorityIdx: index("Task_priority_idx").on(table.priority),
}));

// ─── Message Templates ───────────────────────────────────────────

export const messageTemplates = sqliteTable("MessageTemplate", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  category: text("category").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tenantIdIdx: index("MessageTemplate_tenantId_idx").on(table.tenantId),
}));

// ─── Scheduled Messages ──────────────────────────────────────────

export const scheduledMessages = sqliteTable("ScheduledMessage", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: text("template_id").references(() => messageTemplates.id, { onDelete: "set null" }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  channel: text("channel").notNull(),
  to: text("to").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: text("scheduled_at").notNull(),
  sentAt: text("sent_at"),
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusScheduledAtIdx: index("ScheduledMessage_status_scheduledAt_idx").on(table.status, table.scheduledAt),
  customerIdIdx: index("ScheduledMessage_customerId_idx").on(table.customerId),
  jobIdIdx: index("ScheduledMessage_jobId_idx").on(table.jobId),
  templateIdIdx: index("ScheduledMessage_templateId_idx").on(table.templateId),
}));

// ─── Reviews ─────────────────────────────────────────────────────

export const reviews = sqliteTable("Review", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  platform: text("platform").notNull().default("google"),
  rating: integer("rating"),
  content: text("content"),
  requestSentAt: text("request_sent_at"),
  clickedAt: text("clicked_at"),
  reviewedAt: text("reviewed_at"),
  reviewUrl: text("review_url"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("Review_customerId_idx").on(table.customerId),
  jobIdIdx: index("Review_jobId_idx").on(table.jobId),
  statusIdx: index("Review_status_idx").on(table.status),
}));

// ─── Expenses ────────────────────────────────────────────────────

export const expenses = sqliteTable("Expense", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  vendor: text("vendor"),
  receiptUrl: text("receipt_url"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  dateIdx: index("Expense_date_idx").on(table.date),
  categoryIdx: index("Expense_category_idx").on(table.category),
  jobIdIdx: index("Expense_jobId_idx").on(table.jobId),
  tenantIdIdx: index("Expense_tenantId_idx").on(table.tenantId),
}));

// ─── Recurring Jobs ──────────────────────────────────────────────

export const recurringJobs = sqliteTable("RecurringJob", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  frequency: text("frequency").notNull(),
  dayOfWeek: integer("day_of_week"),
  timeOfDay: text("time_of_day"),
  services: text("services").notNull(),
  addOns: text("add_ons"),
  location: text("location").notNull().default("Richmond"),
  address: text("address"),
  totalPrice: real("total_price"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  nextRunDate: text("next_run_date"),
  lastRunDate: text("last_run_date"),
  jobsCreated: integer("jobs_created").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("RecurringJob_customerId_idx").on(table.customerId),
  isActiveNextRunIdx: index("RecurringJob_isActive_nextRunDate_idx").on(table.isActive, table.nextRunDate),
}));

// ─── Staff ───────────────────────────────────────────────────────

export const staff = sqliteTable("Staff", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").unique().references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  role: text("role").notNull().default("technician"),
  color: text("color").notNull().default("#10b981"),
  avatar: text("avatar"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  hireDate: text("hire_date"),
  notes: text("notes"),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tenantIdIdx: index("Staff_tenantId_idx").on(table.tenantId),
}));

// ─── Promo Codes ─────────────────────────────────────────────────

export const promoCodes = sqliteTable("PromoCode", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull(),
  discountValue: real("discount_value").notNull(),
  minOrderValue: real("min_order_value"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: text("valid_from").notNull().$defaultFn(() => new Date().toISOString()),
  validUntil: text("valid_until"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  codeIdx: index("PromoCode_code_idx").on(table.code),
}));

// ─── Checklists ──────────────────────────────────────────────────

export const checklists = sqliteTable("Checklist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  serviceItemId: text("service_item_id"),
  items: text("items").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const jobChecklists = sqliteTable("JobChecklist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  checklistId: text("checklist_id").notNull(),
  items: text("items").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  jobIdIdx: index("JobChecklist_jobId_idx").on(table.jobId),
  checklistIdIdx: index("JobChecklist_checklistId_idx").on(table.checklistId),
}));

// ─── Fleet Contracts ────────────────────────────────────────────

export const fleetContracts = sqliteTable("FleetContract", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  pricePerVehicle: real("price_per_vehicle"),
  flatRate: real("flat_rate"),
  vehicleCount: integer("vehicle_count").notNull().default(0),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("FleetContract_customerId_idx").on(table.customerId),
  isActiveIdx: index("FleetContract_isActive_idx").on(table.isActive),
}));

// ─── Campaigns ──────────────────────────────────────────────────

export const campaigns = sqliteTable("Campaign", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("sms"),
  status: text("status").notNull().default("Draft"),
  subject: text("subject"),
  body: text("body").notNull(),
  targetCriteria: text("target_criteria").notNull().default("{}"),
  audienceCount: integer("audience_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  convertedCount: integer("converted_count").notNull().default(0),
  scheduledAt: text("scheduled_at"),
  sentAt: text("sent_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index("Campaign_status_idx").on(table.status),
  scheduledAtIdx: index("Campaign_scheduledAt_idx").on(table.scheduledAt),
}));

export const campaignRecipients = sqliteTable("CampaignRecipient", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text("campaign_id").notNull(),
  customerId: text("customer_id").notNull(),
  channel: text("channel").notNull(),
  to: text("to").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: text("sent_at"),
  openedAt: text("opened_at"),
  clickedAt: text("clicked_at"),
  error: text("error"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  campaignIdIdx: index("CampaignRecipient_campaignId_idx").on(table.campaignId),
  customerIdIdx: index("CampaignRecipient_customerId_idx").on(table.customerId),
  statusIdx: index("CampaignRecipient_status_idx").on(table.status),
}));

// ─── Webhooks ────────────────────────────────────────────────────

export const webhookEndpoints = sqliteTable("WebhookEndpoint", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text("url").notNull(),
  events: text("events").notNull(),
  secret: text("secret"),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastFired: text("last_fired"),
  failCount: integer("fail_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const webhookLogs = sqliteTable("WebhookLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  endpointId: text("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: text("payload").notNull(),
  statusCode: integer("status_code"),
  response: text("response"),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  duration: integer("duration"),
  error: text("error"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  endpointIdIdx: index("WebhookLog_endpointId_idx").on(table.endpointId),
  eventIdx: index("WebhookLog_event_idx").on(table.event),
  createdAtIdx: index("WebhookLog_createdAt_idx").on(table.createdAt),
}));

// ─── Workflows ───────────────────────────────────────────────────

export const workflows = sqliteTable("Workflow", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(),
  actions: text("actions").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isTemplate: integer("is_template", { mode: "boolean" }).notNull().default(false),
  runCount: integer("run_count").notNull().default(0),
  lastRunAt: text("last_run_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const workflowLogs = sqliteTable("WorkflowLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  triggeredBy: text("triggered_by"),
  status: text("status").notNull(),
  actions: text("actions").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workflowIdIdx: index("WorkflowLog_workflowId_idx").on(table.workflowId),
  createdAtIdx: index("WorkflowLog_createdAt_idx").on(table.createdAt),
}));

// ─── AI Conversations ────────────────────────────────────────────

export const aiConversations = sqliteTable("AIConversation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  title: text("title"),
  messages: text("messages").notNull().default("[]"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index("AIConversation_userId_idx").on(table.userId),
}));

// ─── TCPA Consent Records ───────────────────────────────────────

export const consentRecords = sqliteTable("ConsentRecord", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  consentType: text("consent_type").notNull(),
  consentSource: text("consent_source").notNull(),
  consentText: text("consent_text"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentedAt: text("consented_at").notNull().$defaultFn(() => new Date().toISOString()),
  revokedAt: text("revoked_at"),
  revokeMethod: text("revoke_method"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerChannelActiveIdx: index("ConsentRecord_customerId_channel_isActive_idx").on(table.customerId, table.channel, table.isActive),
}));

// ─── Service Plans & Subscriptions ──────────────────────────────

export const servicePlans = sqliteTable("ServicePlan", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("monthly"),
  services: text("services").notNull().default("[]"),
  addOns: text("add_ons"),
  monthlyPrice: real("monthly_price").notNull(),
  setupFee: real("setup_fee").notNull().default(0),
  discountPercent: real("discount_percent"),
  maxVehicles: integer("max_vehicles").notNull().default(1),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color").notNull().default("#10b981"),
  features: text("features"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const subscriptions = sqliteTable("Subscription", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => servicePlans.id, { onDelete: "restrict" }),
  vehicleId: text("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"),
  startDate: text("start_date").notNull().$defaultFn(() => new Date().toISOString()),
  nextBillingDate: text("next_billing_date").notNull(),
  nextServiceDate: text("next_service_date"),
  pausedAt: text("paused_at"),
  cancelledAt: text("cancelled_at"),
  cancelReason: text("cancel_reason"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  totalBilled: real("total_billed").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("Subscription_customerId_idx").on(table.customerId),
  planIdIdx: index("Subscription_planId_idx").on(table.planId),
  vehicleIdIdx: index("Subscription_vehicleId_idx").on(table.vehicleId),
  statusIdx: index("Subscription_status_idx").on(table.status),
  nextServiceDateIdx: index("Subscription_nextServiceDate_idx").on(table.nextServiceDate),
}));

// ─── Dynamic Pricing ────────────────────────────────────────────

export const pricingRules = sqliteTable("PricingRule", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  modifier: real("modifier").notNull(),
  conditions: text("conditions").notNull().default("{}"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Inspections / Waivers ──────────────────────────────────────

export const inspections = sqliteTable("Inspection", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().unique().references(() => jobs.id, { onDelete: "cascade" }),
  photos: text("photos").notNull().default("[]"),
  condition: text("condition"),
  odometer: integer("odometer"),
  signature: text("signature"),
  signedAt: text("signed_at"),
  signedName: text("signed_name"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Customer Portal Sessions ───────────────────────────────────

export const portalSessions = sqliteTable("PortalSession", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  otpCode: text("otp_code"),
  otpExpiry: text("otp_expiry"),
  expiresAt: text("expires_at").notNull(),
  lastActive: text("last_active").notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tokenIdx: index("PortalSession_token_idx").on(table.token),
  customerIdIdx: index("PortalSession_customerId_idx").on(table.customerId),
}));

// ─── Social Content ─────────────────────────────────────────────

export const socialPosts = sqliteTable("SocialPost", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id"),
  customerId: text("customer_id"),
  type: text("type").notNull().default("before_after"),
  platform: text("platform").notNull().default("instagram"),
  caption: text("caption").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("draft"),
  scheduledAt: text("scheduled_at"),
  postedAt: text("posted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index("SocialPost_status_idx").on(table.status),
  scheduledAtIdx: index("SocialPost_scheduledAt_idx").on(table.scheduledAt),
  customerIdIdx: index("SocialPost_customerId_idx").on(table.customerId),
}));

// ─── Weather Cache ──────────────────────────────────────────────

export const weatherCache = sqliteTable("WeatherCache", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  data: text("data").notNull(),
  fetchedAt: text("fetched_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  latLngIdx: index("WeatherCache_lat_lng_idx").on(table.latitude, table.longitude),
}));

// ─── Quotes (Good/Better/Best Tiers) ────────────────────────────

export const quotes = sqliteTable("Quote", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteNumber: text("quote_number").notNull().unique(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  vehicleId: text("vehicle_id"),
  status: text("status").notNull().default("Draft"),
  goodName: text("good_name").notNull().default("Essential Detail"),
  goodPrice: real("good_price").notNull().default(0),
  goodItems: text("good_items").notNull().default("[]"),
  betterName: text("better_name").notNull().default("Premium Detail"),
  betterPrice: real("better_price").notNull().default(0),
  betterItems: text("better_items").notNull().default("[]"),
  bestName: text("best_name").notNull().default("Ultimate Detail"),
  bestPrice: real("best_price").notNull().default(0),
  bestItems: text("best_items").notNull().default("[]"),
  selectedTier: text("selected_tier"),
  addOns: text("add_ons").notNull().default("[]"),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull().default(0),
  sentAt: text("sent_at"),
  viewedAt: text("viewed_at"),
  respondedAt: text("responded_at"),
  expiresAt: text("expires_at"),
  notes: text("notes"),
  convertedToJobId: text("converted_to_job_id"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("Quote_customerId_idx").on(table.customerId),
  leadIdIdx: index("Quote_leadId_idx").on(table.leadId),
  statusIdx: index("Quote_status_idx").on(table.status),
  createdAtIdx: index("Quote_createdAt_idx").on(table.createdAt),
}));

// ─── Referrals ──────────────────────────────────────────────────

export const referrals = sqliteTable("Referral", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: text("referrer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  referredCustomerId: text("referred_customer_id").references(() => customers.id, { onDelete: "set null" }),
  referredName: text("referred_name").notNull(),
  referredPhone: text("referred_phone"),
  referredEmail: text("referred_email"),
  status: text("status").notNull().default("pending"),
  rewardType: text("reward_type"),
  rewardValue: real("reward_value"),
  rewardFulfilledAt: text("reward_fulfilled_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  referrerIdIdx: index("Referral_referrerId_idx").on(table.referrerId),
  referredCustomerIdIdx: index("Referral_referredCustomerId_idx").on(table.referredCustomerId),
  statusIdx: index("Referral_status_idx").on(table.status),
}));

// ─── Automation Executions ──────────────────────────────────────

export const automationExecutions = sqliteTable("AutomationExecution", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  customerId: text("customer_id"),
  leadId: text("lead_id"),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("running"),
  nextActionAt: text("next_action_at"),
  startedAt: text("started_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workflowIdIdx: index("AutomationExecution_workflowId_idx").on(table.workflowId),
  statusIdx: index("AutomationExecution_status_idx").on(table.status),
  nextActionAtIdx: index("AutomationExecution_nextActionAt_idx").on(table.nextActionAt),
}));

// ─── Scheduled Reports ──────────────────────────────────────────

export const scheduledReports = sqliteTable("ScheduledReport", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  frequency: text("frequency").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSentAt: text("last_sent_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Voice Notes ────────────────────────────────────────────────

export const voiceNotes = sqliteTable("VoiceNote", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id"),
  jobId: text("job_id"),
  transcription: text("transcription").notNull(),
  audioUrl: text("audio_url"),
  duration: integer("duration"),
  tags: text("tags").default("[]"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdIdx: index("VoiceNote_customerId_idx").on(table.customerId),
  jobIdIdx: index("VoiceNote_jobId_idx").on(table.jobId),
}));

// ─── Password Resets ──────────────────────────────────────────

export const passwordResets = sqliteTable("PasswordReset", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
