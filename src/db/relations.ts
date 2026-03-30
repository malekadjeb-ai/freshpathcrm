import { relations } from "drizzle-orm";
import {
  users, tenants, businessSettings, tags, customerTags, customers, customerNotes,
  activities, vehicles, serviceItems, vehicleTypeModifiers, jobs, jobServices,
  jobStatusHistory, invoices, communications, payments, estimates, estimateItems,
  notifications, leads, tasks, messageTemplates, scheduledMessages, reviews,
  expenses, recurringJobs, staff, jobChecklists,
  fleetContracts, webhookEndpoints, webhookLogs,
  workflows, workflowLogs, consentRecords, servicePlans,
  subscriptions, inspections, portalSessions,
  quotes, referrals, automationExecutions, passwordResets,
} from "./schema";

// ─── Auth Relations ──────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  notifications: many(notifications),
  staff: one(staff, { fields: [users.id], references: [staff.userId] }),
  passwordResets: many(passwordResets),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  users: many(users),
  businessSettings: one(businessSettings, { fields: [tenants.id], references: [businessSettings.tenantId] }),
  leads: many(leads),
}));

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [businessSettings.tenantId], references: [tenants.id] }),
}));

// ─── Customer Relations ──────────────────────────────────────────

export const customersRelations = relations(customers, ({ one, many }) => ({
  vehicles: many(vehicles),
  jobs: many(jobs),
  notes: many(customerNotes),
  communications: many(communications),
  invoices: many(invoices),
  estimates: many(estimates),
  leads: many(leads),
  tasks: many(tasks),
  scheduledMessages: many(scheduledMessages),
  reviews: many(reviews),
  recurringJobs: many(recurringJobs),
  quotes: many(quotes),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  activities: many(activities),
  fleetContracts: many(fleetContracts),
  consentRecords: many(consentRecords),
  subscriptions: many(subscriptions),
  portalSessions: many(portalSessions),
  referredBy: one(customers, { fields: [customers.referredById], references: [customers.id], relationName: "selfReferrals" }),
  referrals: many(customers, { relationName: "selfReferrals" }),
  customerTags: many(customerTags),
}));

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  customer: one(customers, { fields: [customerNotes.customerId], references: [customers.id] }),
}));

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, { fields: [customerTags.customerId], references: [customers.id] }),
  tag: one(tags, { fields: [customerTags.tagId], references: [tags.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  customerTags: many(customerTags),
}));

// ─── Activity Relations ──────────────────────────────────────────

export const activitiesRelations = relations(activities, ({ one }) => ({
  customer: one(customers, { fields: [activities.customerId], references: [customers.id] }),
  lead: one(leads, { fields: [activities.leadId], references: [leads.id] }),
}));

// ─── Vehicle Relations ───────────────────────────────────────────

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  customer: one(customers, { fields: [vehicles.customerId], references: [customers.id] }),
  jobs: many(jobs),
  estimates: many(estimates),
  recurringJobs: many(recurringJobs),
  subscriptions: many(subscriptions),
}));

// ─── Service Relations ───────────────────────────────────────────

export const serviceItemsRelations = relations(serviceItems, ({ many }) => ({
  modifiers: many(vehicleTypeModifiers),
  jobServices: many(jobServices),
  estimateItems: many(estimateItems),
}));

export const vehicleTypeModifiersRelations = relations(vehicleTypeModifiers, ({ one }) => ({
  serviceItem: one(serviceItems, { fields: [vehicleTypeModifiers.serviceItemId], references: [serviceItems.id] }),
}));

// ─── Job Relations ───────────────────────────────────────────────

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, { fields: [jobs.customerId], references: [customers.id] }),
  vehicle: one(vehicles, { fields: [jobs.vehicleId], references: [vehicles.id] }),
  services: many(jobServices),
  invoice: one(invoices, { fields: [jobs.id], references: [invoices.jobId] }),
  estimate: one(estimates, { fields: [jobs.id], references: [estimates.convertedJobId] }),
  statusHistory: many(jobStatusHistory),
  communications: many(communications),
  tasks: many(tasks),
  scheduledMessages: many(scheduledMessages),
  reviews: many(reviews),
  expenses: many(expenses),
  checklists: many(jobChecklists),
  inspection: one(inspections, { fields: [jobs.id], references: [inspections.jobId] }),
}));

export const jobServicesRelations = relations(jobServices, ({ one }) => ({
  job: one(jobs, { fields: [jobServices.jobId], references: [jobs.id] }),
  serviceItem: one(serviceItems, { fields: [jobServices.serviceItemId], references: [serviceItems.id] }),
}));

export const jobStatusHistoryRelations = relations(jobStatusHistory, ({ one }) => ({
  job: one(jobs, { fields: [jobStatusHistory.jobId], references: [jobs.id] }),
}));

// ─── Invoice Relations ───────────────────────────────────────────

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  job: one(jobs, { fields: [invoices.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  payments: many(payments),
}));

// ─── Communication Relations ─────────────────────────────────────

export const communicationsRelations = relations(communications, ({ one }) => ({
  customer: one(customers, { fields: [communications.customerId], references: [customers.id] }),
  lead: one(leads, { fields: [communications.leadId], references: [leads.id] }),
  job: one(jobs, { fields: [communications.jobId], references: [jobs.id] }),
}));

// ─── Payment Relations ───────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

// ─── Estimate Relations ──────────────────────────────────────────

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  customer: one(customers, { fields: [estimates.customerId], references: [customers.id] }),
  lead: one(leads, { fields: [estimates.leadId], references: [leads.id] }),
  vehicle: one(vehicles, { fields: [estimates.vehicleId], references: [vehicles.id] }),
  convertedJob: one(jobs, { fields: [estimates.convertedJobId], references: [jobs.id] }),
  lineItems: many(estimateItems),
}));

export const estimateItemsRelations = relations(estimateItems, ({ one }) => ({
  estimate: one(estimates, { fields: [estimateItems.estimateId], references: [estimates.id] }),
  service: one(serviceItems, { fields: [estimateItems.serviceId], references: [serviceItems.id] }),
}));

// ─── Notification Relations ──────────────────────────────────────

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ─── Lead Relations ──────────────────────────────────────────────

export const leadsRelations = relations(leads, ({ one, many }) => ({
  customer: one(customers, { fields: [leads.customerId], references: [customers.id] }),
  tenant: one(tenants, { fields: [leads.tenantId], references: [tenants.id] }),
  communications: many(communications),
  tasks: many(tasks),
  estimates: many(estimates),
  activities: many(activities),
  quotes: many(quotes),
}));

// ─── Task Relations ──────────────────────────────────────────────

export const tasksRelations = relations(tasks, ({ one }) => ({
  customer: one(customers, { fields: [tasks.customerId], references: [customers.id] }),
  job: one(jobs, { fields: [tasks.jobId], references: [jobs.id] }),
  lead: one(leads, { fields: [tasks.leadId], references: [leads.id] }),
}));

// ─── Message Template Relations ──────────────────────────────────

export const messageTemplatesRelations = relations(messageTemplates, ({ many }) => ({
  scheduledMessages: many(scheduledMessages),
}));

// ─── Scheduled Message Relations ─────────────────────────────────

export const scheduledMessagesRelations = relations(scheduledMessages, ({ one }) => ({
  template: one(messageTemplates, { fields: [scheduledMessages.templateId], references: [messageTemplates.id] }),
  customer: one(customers, { fields: [scheduledMessages.customerId], references: [customers.id] }),
  job: one(jobs, { fields: [scheduledMessages.jobId], references: [jobs.id] }),
}));

// ─── Review Relations ────────────────────────────────────────────

export const reviewsRelations = relations(reviews, ({ one }) => ({
  customer: one(customers, { fields: [reviews.customerId], references: [customers.id] }),
  job: one(jobs, { fields: [reviews.jobId], references: [jobs.id] }),
}));

// ─── Expense Relations ───────────────────────────────────────────

export const expensesRelations = relations(expenses, ({ one }) => ({
  job: one(jobs, { fields: [expenses.jobId], references: [jobs.id] }),
}));

// ─── Recurring Job Relations ─────────────────────────────────────

export const recurringJobsRelations = relations(recurringJobs, ({ one }) => ({
  customer: one(customers, { fields: [recurringJobs.customerId], references: [customers.id] }),
  vehicle: one(vehicles, { fields: [recurringJobs.vehicleId], references: [vehicles.id] }),
}));

// ─── Staff Relations ─────────────────────────────────────────────

export const staffRelations = relations(staff, ({ one }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
}));

// ─── Fleet Contract Relations ────────────────────────────────────

export const fleetContractsRelations = relations(fleetContracts, ({ one }) => ({
  customer: one(customers, { fields: [fleetContracts.customerId], references: [customers.id] }),
}));

// ─── Webhook Relations ───────────────────────────────────────────

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ many }) => ({
  logs: many(webhookLogs),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  endpoint: one(webhookEndpoints, { fields: [webhookLogs.endpointId], references: [webhookEndpoints.id] }),
}));

// ─── Workflow Relations ──────────────────────────────────────────

export const workflowsRelations = relations(workflows, ({ many }) => ({
  logs: many(workflowLogs),
  executions: many(automationExecutions),
}));

export const workflowLogsRelations = relations(workflowLogs, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowLogs.workflowId], references: [workflows.id] }),
}));

// ─── Automation Execution Relations ──────────────────────────────

export const automationExecutionsRelations = relations(automationExecutions, ({ one }) => ({
  workflow: one(workflows, { fields: [automationExecutions.workflowId], references: [workflows.id] }),
}));

// ─── Consent Record Relations ────────────────────────────────────

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  customer: one(customers, { fields: [consentRecords.customerId], references: [customers.id] }),
}));

// ─── Subscription Relations ──────────────────────────────────────

export const servicePlansRelations = relations(servicePlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  customer: one(customers, { fields: [subscriptions.customerId], references: [customers.id] }),
  plan: one(servicePlans, { fields: [subscriptions.planId], references: [servicePlans.id] }),
  vehicle: one(vehicles, { fields: [subscriptions.vehicleId], references: [vehicles.id] }),
}));

// ─── Portal Session Relations ────────────────────────────────────

export const portalSessionsRelations = relations(portalSessions, ({ one }) => ({
  customer: one(customers, { fields: [portalSessions.customerId], references: [customers.id] }),
}));

// ─── Quote Relations ─────────────────────────────────────────────

export const quotesRelations = relations(quotes, ({ one }) => ({
  customer: one(customers, { fields: [quotes.customerId], references: [customers.id] }),
  lead: one(leads, { fields: [quotes.leadId], references: [leads.id] }),
}));

// ─── Referral Relations ──────────────────────────────────────────

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(customers, { fields: [referrals.referrerId], references: [customers.id], relationName: "referrer" }),
  referredCustomer: one(customers, { fields: [referrals.referredCustomerId], references: [customers.id], relationName: "referred" }),
}));

// ─── Password Reset Relations ────────────────────────────────────

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, { fields: [passwordResets.userId], references: [users.id] }),
}));
