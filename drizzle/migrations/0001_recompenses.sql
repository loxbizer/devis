CREATE TABLE `reward_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`ref_id` text,
	`label` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_transactions_unique_idx` ON `reward_transactions` (`organization_id`,`reason`,`ref_id`);--> statement-breakpoint
CREATE INDEX `reward_transactions_org_idx` ON `reward_transactions` (`organization_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `organizations` ADD `badge` text DEFAULT 'none' NOT NULL;