ALTER TABLE "announcement" ADD COLUMN "show_on_home" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "announcement" ADD COLUMN "show_on_leaderboard" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "announcement" ADD COLUMN "show_as_popup" boolean DEFAULT false NOT NULL;
