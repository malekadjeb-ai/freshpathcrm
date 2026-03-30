CREATE TABLE `Activity` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`lead_id` text,
	`type` text NOT NULL,
	`direction` text,
	`summary` text NOT NULL,
	`follow_up_date` text,
	`follow_up_done` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Activity_customerId_idx` ON `Activity` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Activity_leadId_idx` ON `Activity` (`lead_id`);--> statement-breakpoint
CREATE INDEX `Activity_followUpDate_idx` ON `Activity` (`follow_up_date`);--> statement-breakpoint
CREATE TABLE `AIConversation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`messages` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `AIConversation_userId_idx` ON `AIConversation` (`user_id`);--> statement-breakpoint
CREATE TABLE `AuditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`user_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `AuditLog_entity_entityId_idx` ON `AuditLog` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog` (`created_at`);--> statement-breakpoint
CREATE TABLE `AutomationExecution` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`customer_id` text,
	`lead_id` text,
	`current_step` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`next_action_at` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `Workflow`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `AutomationExecution_workflowId_idx` ON `AutomationExecution` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `AutomationExecution_status_idx` ON `AutomationExecution` (`status`);--> statement-breakpoint
CREATE INDEX `AutomationExecution_nextActionAt_idx` ON `AutomationExecution` (`next_action_at`);--> statement-breakpoint
CREATE TABLE `BusinessSettings` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'Fresh Path Mobile Detailing' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`state` text DEFAULT 'TX' NOT NULL,
	`zip` text DEFAULT '' NOT NULL,
	`logo_path` text DEFAULT '' NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`default_payment_terms` text DEFAULT 'Due on receipt' NOT NULL,
	`invoice_footer` text DEFAULT 'Thank you for choosing Fresh Path Mobile Detailing!' NOT NULL,
	`google_review_url` text,
	`auto_request_reviews` integer DEFAULT true NOT NULL,
	`review_request_delay` integer DEFAULT 24 NOT NULL,
	`communication_mode` text DEFAULT 'dev' NOT NULL,
	`email_provider` text,
	`resend_api_key` text,
	`sendgrid_api_key` text,
	`sender_email` text,
	`smtp_host` text,
	`smtp_port` integer DEFAULT 587 NOT NULL,
	`smtp_user` text,
	`smtp_password` text,
	`email_from_name` text DEFAULT 'Fresh Path Mobile Detailing' NOT NULL,
	`twilio_account_sid` text,
	`twilio_auth_token` text,
	`twilio_phone_number` text,
	`enable_email_to_sms` integer DEFAULT false NOT NULL,
	`stripe_secret_key` text,
	`stripe_publishable_key` text,
	`stripe_webhook_secret` text,
	`deposit_required` integer DEFAULT false NOT NULL,
	`deposit_percentage` real DEFAULT 25 NOT NULL,
	`booking_enabled` integer DEFAULT false NOT NULL,
	`booking_page_slug` text DEFAULT 'book',
	`booking_page_title` text DEFAULT 'Book Your Detail',
	`booking_page_description` text,
	`working_hours_start` text DEFAULT '07:00' NOT NULL,
	`working_hours_end` text DEFAULT '19:00' NOT NULL,
	`working_days` text DEFAULT '[1,2,3,4,5,6]' NOT NULL,
	`max_jobs_per_day` integer DEFAULT 8 NOT NULL,
	`slot_duration_minutes` integer DEFAULT 60 NOT NULL,
	`buffer_minutes` integer DEFAULT 30 NOT NULL,
	`auto_confirm_bookings` integer DEFAULT true NOT NULL,
	`auto_send_reminders` integer DEFAULT true NOT NULL,
	`rebook_prompt_days` integer DEFAULT 30 NOT NULL,
	`dormant_threshold_days` integer DEFAULT 60 NOT NULL,
	`monthly_revenue_goal` real DEFAULT 10000 NOT NULL,
	`setup_complete` integer DEFAULT false NOT NULL,
	`google_access_token` text,
	`google_refresh_token` text,
	`google_token_expiry` text,
	`google_email` text,
	`gv_sync_enabled` integer DEFAULT false NOT NULL,
	`gv_auto_sync_minutes` integer DEFAULT 5 NOT NULL,
	`gv_last_sync_at` text,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `BusinessSettings_tenant_id_unique` ON `BusinessSettings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `CampaignRecipient` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`channel` text NOT NULL,
	`to` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` text,
	`opened_at` text,
	`clicked_at` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `CampaignRecipient_campaignId_idx` ON `CampaignRecipient` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `CampaignRecipient_customerId_idx` ON `CampaignRecipient` (`customer_id`);--> statement-breakpoint
CREATE INDEX `CampaignRecipient_status_idx` ON `CampaignRecipient` (`status`);--> statement-breakpoint
CREATE TABLE `Campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'sms' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`target_criteria` text DEFAULT '{}' NOT NULL,
	`audience_count` integer DEFAULT 0 NOT NULL,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`opened_count` integer DEFAULT 0 NOT NULL,
	`clicked_count` integer DEFAULT 0 NOT NULL,
	`converted_count` integer DEFAULT 0 NOT NULL,
	`scheduled_at` text,
	`sent_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Campaign_status_idx` ON `Campaign` (`status`);--> statement-breakpoint
CREATE INDEX `Campaign_scheduledAt_idx` ON `Campaign` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `Checklist` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`service_item_id` text,
	`items` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Communication` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`lead_id` text,
	`type` text NOT NULL,
	`direction` text NOT NULL,
	`status` text NOT NULL,
	`summary` text,
	`body` text,
	`duration` integer,
	`outcome` text,
	`external_id` text,
	`channel` text,
	`source` text,
	`job_id` text,
	`campaign_id` text,
	`delivered_at` text,
	`opened_at` text,
	`clicked_at` text,
	`bounced_at` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Communication_customerId_idx` ON `Communication` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Communication_leadId_idx` ON `Communication` (`lead_id`);--> statement-breakpoint
CREATE INDEX `Communication_type_idx` ON `Communication` (`type`);--> statement-breakpoint
CREATE INDEX `Communication_externalId_idx` ON `Communication` (`external_id`);--> statement-breakpoint
CREATE INDEX `Communication_jobId_idx` ON `Communication` (`job_id`);--> statement-breakpoint
CREATE TABLE `ConsentRecord` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`channel` text NOT NULL,
	`consent_type` text NOT NULL,
	`consent_source` text NOT NULL,
	`consent_text` text,
	`ip_address` text,
	`user_agent` text,
	`consented_at` text NOT NULL,
	`revoked_at` text,
	`revoke_method` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ConsentRecord_customerId_channel_isActive_idx` ON `ConsentRecord` (`customer_id`,`channel`,`is_active`);--> statement-breakpoint
CREATE TABLE `CustomerNote` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `CustomerNote_customerId_idx` ON `CustomerNote` (`customer_id`);--> statement-breakpoint
CREATE TABLE `_CustomerTags` (
	`A` text NOT NULL,
	`B` text NOT NULL,
	FOREIGN KEY (`A`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`B`) REFERENCES `Tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `_CustomerTags_AB_unique` ON `_CustomerTags` (`A`,`B`);--> statement-breakpoint
CREATE INDEX `_CustomerTags_B_index` ON `_CustomerTags` (`B`);--> statement-breakpoint
CREATE TABLE `Customer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`phone_carrier` text,
	`address` text,
	`city` text,
	`zip` text,
	`neighborhood` text,
	`avatar_url` text,
	`source` text,
	`source_detail` text,
	`lifecycle_stage` text DEFAULT 'new' NOT NULL,
	`preferred_contact` text DEFAULT 'text' NOT NULL,
	`birthday` text,
	`last_contacted_at` text,
	`last_job_at` text,
	`health_score` integer,
	`gate_code` text,
	`special_instructions` text,
	`custom_fields` text,
	`is_commercial` integer DEFAULT false NOT NULL,
	`company_name` text,
	`tax_id` text,
	`billing_email` text,
	`billing_contact` text,
	`payment_terms` text,
	`fleet_size` integer,
	`fleet_discount` real,
	`contract_notes` text,
	`latitude` real,
	`longitude` real,
	`referred_by_id` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`referred_by_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `Customer_phone_idx` ON `Customer` (`phone`);--> statement-breakpoint
CREATE INDEX `Customer_email_idx` ON `Customer` (`email`);--> statement-breakpoint
CREATE INDEX `Customer_city_idx` ON `Customer` (`city`);--> statement-breakpoint
CREATE INDEX `Customer_createdAt_idx` ON `Customer` (`created_at`);--> statement-breakpoint
CREATE INDEX `Customer_lifecycleStage_idx` ON `Customer` (`lifecycle_stage`);--> statement-breakpoint
CREATE INDEX `Customer_source_idx` ON `Customer` (`source`);--> statement-breakpoint
CREATE INDEX `Customer_isCommercial_idx` ON `Customer` (`is_commercial`);--> statement-breakpoint
CREATE INDEX `Customer_lastJobAt_idx` ON `Customer` (`last_job_at`);--> statement-breakpoint
CREATE INDEX `Customer_referredById_idx` ON `Customer` (`referred_by_id`);--> statement-breakpoint
CREATE TABLE `EstimateItem` (
	`id` text PRIMARY KEY NOT NULL,
	`estimate_id` text NOT NULL,
	`service_id` text,
	`name` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`estimate_id`) REFERENCES `Estimate`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `ServiceItem`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `EstimateItem_estimateId_idx` ON `EstimateItem` (`estimate_id`);--> statement-breakpoint
CREATE TABLE `Estimate` (
	`id` text PRIMARY KEY NOT NULL,
	`estimate_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`lead_id` text,
	`vehicle_id` text,
	`status` text DEFAULT 'Draft' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`valid_until` text,
	`sent_at` text,
	`responded_at` text,
	`converted_job_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`converted_job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Estimate_estimate_number_unique` ON `Estimate` (`estimate_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `Estimate_converted_job_id_unique` ON `Estimate` (`converted_job_id`);--> statement-breakpoint
CREATE INDEX `Estimate_customerId_idx` ON `Estimate` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Estimate_status_idx` ON `Estimate` (`status`);--> statement-breakpoint
CREATE TABLE `Expense` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`vendor` text,
	`receipt_url` text,
	`is_recurring` integer DEFAULT false NOT NULL,
	`job_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Expense_date_idx` ON `Expense` (`date`);--> statement-breakpoint
CREATE INDEX `Expense_category_idx` ON `Expense` (`category`);--> statement-breakpoint
CREATE INDEX `Expense_jobId_idx` ON `Expense` (`job_id`);--> statement-breakpoint
CREATE TABLE `FleetContract` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`name` text NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`price_per_vehicle` real,
	`flat_rate` real,
	`vehicle_count` integer DEFAULT 0 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `FleetContract_customerId_idx` ON `FleetContract` (`customer_id`);--> statement-breakpoint
CREATE INDEX `FleetContract_isActive_idx` ON `FleetContract` (`is_active`);--> statement-breakpoint
CREATE TABLE `Inspection` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL,
	`condition` text,
	`odometer` integer,
	`signature` text,
	`signed_at` text,
	`signed_name` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Inspection_job_id_unique` ON `Inspection` (`job_id`);--> statement-breakpoint
CREATE TABLE `Invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`job_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`subtotal` real NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`due_date` text,
	`paid_at` text,
	`sent_at` text,
	`sent_via` text,
	`viewed_at` text,
	`payment_link` text,
	`tip_amount` real DEFAULT 0 NOT NULL,
	`deposit_amount` real DEFAULT 0 NOT NULL,
	`deposit_paid_at` text,
	`stripe_payment_intent_id` text,
	`notes` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Invoice_invoice_number_unique` ON `Invoice` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `Invoice_job_id_unique` ON `Invoice` (`job_id`);--> statement-breakpoint
CREATE INDEX `Invoice_status_idx` ON `Invoice` (`status`);--> statement-breakpoint
CREATE INDEX `Invoice_customerId_idx` ON `Invoice` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Invoice_dueDate_idx` ON `Invoice` (`due_date`);--> statement-breakpoint
CREATE TABLE `JobChecklist` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`checklist_id` text NOT NULL,
	`items` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `JobChecklist_jobId_idx` ON `JobChecklist` (`job_id`);--> statement-breakpoint
CREATE INDEX `JobChecklist_checklistId_idx` ON `JobChecklist` (`checklist_id`);--> statement-breakpoint
CREATE TABLE `JobService` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`service_item_id` text NOT NULL,
	`price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_item_id`) REFERENCES `ServiceItem`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `JobService_jobId_idx` ON `JobService` (`job_id`);--> statement-breakpoint
CREATE INDEX `JobService_serviceItemId_idx` ON `JobService` (`service_item_id`);--> statement-breakpoint
CREATE TABLE `JobStatusHistory` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `JobStatusHistory_jobId_idx` ON `JobStatusHistory` (`job_id`);--> statement-breakpoint
CREATE TABLE `Job` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`vehicle_id` text,
	`scheduled_at` text,
	`started_at` text,
	`completed_at` text,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`address` text,
	`city` text,
	`location` text DEFAULT 'Richmond' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`discount_type` text DEFAULT 'dollar' NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`internal_notes` text,
	`photos` text DEFAULT '[]' NOT NULL,
	`assigned_to_id` text,
	`estimated_duration` integer,
	`actual_duration` integer,
	`tip` real DEFAULT 0 NOT NULL,
	`travel_time` integer,
	`mileage` real,
	`customer_signature` text,
	`checklist_complete` integer DEFAULT false NOT NULL,
	`show_in_gallery` integer DEFAULT false NOT NULL,
	`promo_code_id` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Job_status_idx` ON `Job` (`status`);--> statement-breakpoint
CREATE INDEX `Job_scheduledAt_idx` ON `Job` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `Job_customerId_idx` ON `Job` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Job_completedAt_idx` ON `Job` (`completed_at`);--> statement-breakpoint
CREATE INDEX `Job_assignedToId_idx` ON `Job` (`assigned_to_id`);--> statement-breakpoint
CREATE TABLE `Lead` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`source` text NOT NULL,
	`source_detail` text,
	`status` text DEFAULT 'New' NOT NULL,
	`lost_reason` text,
	`lost_notes` text,
	`notes` text,
	`vehicle_info` text,
	`address` text,
	`city` text,
	`customer_id` text,
	`estimate_id` text,
	`assigned_to` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`estimated_value` real,
	`response_time` integer,
	`follow_up_count` integer DEFAULT 0 NOT NULL,
	`next_follow_up_date` text,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`contacted_at` text,
	`converted_at` text,
	`lost_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Lead_status_idx` ON `Lead` (`status`);--> statement-breakpoint
CREATE INDEX `Lead_source_idx` ON `Lead` (`source`);--> statement-breakpoint
CREATE INDEX `Lead_createdAt_idx` ON `Lead` (`created_at`);--> statement-breakpoint
CREATE INDEX `Lead_customerId_idx` ON `Lead` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Lead_nextFollowUpDate_idx` ON `Lead` (`next_follow_up_date`);--> statement-breakpoint
CREATE INDEX `Lead_tenantId_idx` ON `Lead` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `MessageTemplate` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`link` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Notification_userId_idx` ON `Notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `Notification_read_idx` ON `Notification` (`read`);--> statement-breakpoint
CREATE INDEX `Notification_createdAt_idx` ON `Notification` (`created_at`);--> statement-breakpoint
CREATE TABLE `PasswordReset` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PasswordReset_token_unique` ON `PasswordReset` (`token`);--> statement-breakpoint
CREATE TABLE `Payment` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text DEFAULT 'Cash' NOT NULL,
	`payment_date` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Payment_invoiceId_idx` ON `Payment` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `PortalSession` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`token` text NOT NULL,
	`otp_code` text,
	`otp_expiry` text,
	`expires_at` text NOT NULL,
	`last_active` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PortalSession_token_unique` ON `PortalSession` (`token`);--> statement-breakpoint
CREATE INDEX `PortalSession_token_idx` ON `PortalSession` (`token`);--> statement-breakpoint
CREATE INDEX `PortalSession_customerId_idx` ON `PortalSession` (`customer_id`);--> statement-breakpoint
CREATE TABLE `PricingRule` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`modifier` real NOT NULL,
	`conditions` text DEFAULT '{}' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `PromoCode` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`discount_type` text NOT NULL,
	`discount_value` real NOT NULL,
	`min_order_value` real,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PromoCode_code_unique` ON `PromoCode` (`code`);--> statement-breakpoint
CREATE INDEX `PromoCode_code_idx` ON `PromoCode` (`code`);--> statement-breakpoint
CREATE TABLE `Quote` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_number` text NOT NULL,
	`customer_id` text,
	`lead_id` text,
	`vehicle_id` text,
	`status` text DEFAULT 'Draft' NOT NULL,
	`good_name` text DEFAULT 'Essential Detail' NOT NULL,
	`good_price` real DEFAULT 0 NOT NULL,
	`good_items` text DEFAULT '[]' NOT NULL,
	`better_name` text DEFAULT 'Premium Detail' NOT NULL,
	`better_price` real DEFAULT 0 NOT NULL,
	`better_items` text DEFAULT '[]' NOT NULL,
	`best_name` text DEFAULT 'Ultimate Detail' NOT NULL,
	`best_price` real DEFAULT 0 NOT NULL,
	`best_items` text DEFAULT '[]' NOT NULL,
	`selected_tier` text,
	`add_ons` text DEFAULT '[]' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`sent_at` text,
	`viewed_at` text,
	`responded_at` text,
	`expires_at` text,
	`notes` text,
	`converted_to_job_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Quote_quote_number_unique` ON `Quote` (`quote_number`);--> statement-breakpoint
CREATE INDEX `Quote_customerId_idx` ON `Quote` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Quote_leadId_idx` ON `Quote` (`lead_id`);--> statement-breakpoint
CREATE INDEX `Quote_status_idx` ON `Quote` (`status`);--> statement-breakpoint
CREATE INDEX `Quote_createdAt_idx` ON `Quote` (`created_at`);--> statement-breakpoint
CREATE TABLE `RecurringJob` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`vehicle_id` text,
	`frequency` text NOT NULL,
	`day_of_week` integer,
	`time_of_day` text,
	`services` text NOT NULL,
	`add_ons` text,
	`location` text DEFAULT 'Richmond' NOT NULL,
	`address` text,
	`total_price` real,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`next_run_date` text,
	`last_run_date` text,
	`jobs_created` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `RecurringJob_customerId_idx` ON `RecurringJob` (`customer_id`);--> statement-breakpoint
CREATE INDEX `RecurringJob_isActive_nextRunDate_idx` ON `RecurringJob` (`is_active`,`next_run_date`);--> statement-breakpoint
CREATE TABLE `Referral` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text NOT NULL,
	`referred_customer_id` text,
	`referred_name` text NOT NULL,
	`referred_phone` text,
	`referred_email` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reward_type` text,
	`reward_value` real,
	`reward_fulfilled_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`referrer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referred_customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Referral_referrerId_idx` ON `Referral` (`referrer_id`);--> statement-breakpoint
CREATE INDEX `Referral_referredCustomerId_idx` ON `Referral` (`referred_customer_id`);--> statement-breakpoint
CREATE INDEX `Referral_status_idx` ON `Referral` (`status`);--> statement-breakpoint
CREATE TABLE `Review` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`job_id` text,
	`platform` text DEFAULT 'google' NOT NULL,
	`rating` integer,
	`content` text,
	`request_sent_at` text,
	`clicked_at` text,
	`reviewed_at` text,
	`review_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Review_customerId_idx` ON `Review` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Review_jobId_idx` ON `Review` (`job_id`);--> statement-breakpoint
CREATE INDEX `Review_status_idx` ON `Review` (`status`);--> statement-breakpoint
CREATE TABLE `ScheduledMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text,
	`customer_id` text NOT NULL,
	`job_id` text,
	`channel` text NOT NULL,
	`to` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_at` text NOT NULL,
	`sent_at` text,
	`error` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `MessageTemplate`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ScheduledMessage_status_scheduledAt_idx` ON `ScheduledMessage` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `ScheduledMessage_customerId_idx` ON `ScheduledMessage` (`customer_id`);--> statement-breakpoint
CREATE INDEX `ScheduledMessage_jobId_idx` ON `ScheduledMessage` (`job_id`);--> statement-breakpoint
CREATE INDEX `ScheduledMessage_templateId_idx` ON `ScheduledMessage` (`template_id`);--> statement-breakpoint
CREATE TABLE `ScheduledReport` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`frequency` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_sent_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ServiceItem` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_price` real NOT NULL,
	`category` text DEFAULT 'Service' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`estimated_minutes` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ServiceItem_name_unique` ON `ServiceItem` (`name`);--> statement-breakpoint
CREATE INDEX `ServiceItem_category_idx` ON `ServiceItem` (`category`);--> statement-breakpoint
CREATE INDEX `ServiceItem_isActive_idx` ON `ServiceItem` (`is_active`);--> statement-breakpoint
CREATE TABLE `ServicePlan` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`services` text DEFAULT '[]' NOT NULL,
	`add_ons` text,
	`monthly_price` real NOT NULL,
	`setup_fee` real DEFAULT 0 NOT NULL,
	`discount_percent` real,
	`max_vehicles` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#10b981' NOT NULL,
	`features` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `SocialPost` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`customer_id` text,
	`type` text DEFAULT 'before_after' NOT NULL,
	`platform` text DEFAULT 'instagram' NOT NULL,
	`caption` text NOT NULL,
	`image_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` text,
	`posted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `SocialPost_status_idx` ON `SocialPost` (`status`);--> statement-breakpoint
CREATE INDEX `SocialPost_scheduledAt_idx` ON `SocialPost` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `SocialPost_customerId_idx` ON `SocialPost` (`customer_id`);--> statement-breakpoint
CREATE TABLE `Staff` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`role` text DEFAULT 'technician' NOT NULL,
	`color` text DEFAULT '#10b981' NOT NULL,
	`avatar` text,
	`is_active` integer DEFAULT true NOT NULL,
	`hire_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Staff_user_id_unique` ON `Staff` (`user_id`);--> statement-breakpoint
CREATE TABLE `Subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`vehicle_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text NOT NULL,
	`next_billing_date` text NOT NULL,
	`next_service_date` text,
	`paused_at` text,
	`cancelled_at` text,
	`cancel_reason` text,
	`stripe_subscription_id` text,
	`total_billed` real DEFAULT 0 NOT NULL,
	`jobs_completed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `ServicePlan`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Subscription_customerId_idx` ON `Subscription` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Subscription_planId_idx` ON `Subscription` (`plan_id`);--> statement-breakpoint
CREATE INDEX `Subscription_vehicleId_idx` ON `Subscription` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `Subscription_status_idx` ON `Subscription` (`status`);--> statement-breakpoint
CREATE INDEX `Subscription_nextServiceDate_idx` ON `Subscription` (`next_service_date`);--> statement-breakpoint
CREATE TABLE `Tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#10b981' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_name_unique` ON `Tag` (`name`);--> statement-breakpoint
CREATE TABLE `Task` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'general' NOT NULL,
	`due_date` text,
	`due_time` text,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`customer_id` text,
	`job_id` text,
	`lead_id` text,
	`assigned_to` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`is_automated` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Task_dueDate_idx` ON `Task` (`due_date`);--> statement-breakpoint
CREATE INDEX `Task_customerId_idx` ON `Task` (`customer_id`);--> statement-breakpoint
CREATE INDEX `Task_jobId_idx` ON `Task` (`job_id`);--> statement-breakpoint
CREATE INDEX `Task_leadId_idx` ON `Task` (`lead_id`);--> statement-breakpoint
CREATE INDEX `Task_completed_idx` ON `Task` (`completed`);--> statement-breakpoint
CREATE INDEX `Task_priority_idx` ON `Task` (`priority`);--> statement-breakpoint
CREATE TABLE `Tenant` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`plan` text DEFAULT 'FREE' NOT NULL,
	`billing_customer_id` text,
	`billing_subscription_id` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tenant_slug_unique` ON `Tenant` (`slug`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'USER' NOT NULL,
	`tenant_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_tenantId_key` ON `User` (`email`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `VehicleTypeModifier` (
	`id` text PRIMARY KEY NOT NULL,
	`service_item_id` text NOT NULL,
	`vehicle_type` text NOT NULL,
	`price_adjustment` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`service_item_id`) REFERENCES `ServiceItem`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `VehicleTypeModifier_serviceItemId_idx` ON `VehicleTypeModifier` (`service_item_id`);--> statement-breakpoint
CREATE TABLE `Vehicle` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`year` integer NOT NULL,
	`color` text,
	`license_plate` text,
	`vehicle_type` text DEFAULT 'Sedan' NOT NULL,
	`vin` text,
	`mileage` integer,
	`condition_notes` text,
	`last_service_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Vehicle_customerId_idx` ON `Vehicle` (`customer_id`);--> statement-breakpoint
CREATE TABLE `VoiceNote` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`job_id` text,
	`transcription` text NOT NULL,
	`audio_url` text,
	`duration` integer,
	`tags` text DEFAULT '[]',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `VoiceNote_customerId_idx` ON `VoiceNote` (`customer_id`);--> statement-breakpoint
CREATE INDEX `VoiceNote_jobId_idx` ON `VoiceNote` (`job_id`);--> statement-breakpoint
CREATE TABLE `WeatherCache` (
	`id` text PRIMARY KEY NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `WeatherCache_lat_lng_idx` ON `WeatherCache` (`latitude`,`longitude`);--> statement-breakpoint
CREATE TABLE `WebhookEndpoint` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`events` text NOT NULL,
	`secret` text,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_fired` text,
	`fail_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `WebhookLog` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status_code` integer,
	`response` text,
	`success` integer DEFAULT false NOT NULL,
	`duration` integer,
	`error` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `WebhookEndpoint`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `WebhookLog_endpointId_idx` ON `WebhookLog` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `WebhookLog_event_idx` ON `WebhookLog` (`event`);--> statement-breakpoint
CREATE INDEX `WebhookLog_createdAt_idx` ON `WebhookLog` (`created_at`);--> statement-breakpoint
CREATE TABLE `WorkflowLog` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`triggered_by` text,
	`status` text NOT NULL,
	`actions` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `Workflow`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `WorkflowLog_workflowId_idx` ON `WorkflowLog` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `WorkflowLog_createdAt_idx` ON `WorkflowLog` (`created_at`);--> statement-breakpoint
CREATE TABLE `Workflow` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`trigger` text NOT NULL,
	`actions` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_template` integer DEFAULT false NOT NULL,
	`run_count` integer DEFAULT 0 NOT NULL,
	`last_run_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
