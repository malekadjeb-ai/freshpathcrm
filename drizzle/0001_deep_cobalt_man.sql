PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_JobService` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`service_item_id` text,
	`name` text,
	`price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_item_id`) REFERENCES `ServiceItem`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_JobService`("id", "job_id", "service_item_id", "price", "quantity") SELECT "id", "job_id", "service_item_id", "price", "quantity" FROM `JobService`;--> statement-breakpoint
DROP TABLE `JobService`;--> statement-breakpoint
ALTER TABLE `__new_JobService` RENAME TO `JobService`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `JobService_jobId_idx` ON `JobService` (`job_id`);--> statement-breakpoint
CREATE INDEX `JobService_serviceItemId_idx` ON `JobService` (`service_item_id`);