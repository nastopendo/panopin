CREATE TYPE "public"."tournament_status" AS ENUM('lobby', 'playing', 'finished');

CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"host_id" uuid NOT NULL,
	"status" "tournament_status" DEFAULT 'lobby' NOT NULL,
	"photo_ids" jsonb,
	"filter_tag_ids" jsonb,
	"filter_difficulty" "difficulty",
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_code_unique" UNIQUE("code")
);

CREATE TABLE "tournament_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"round_id" uuid,
	"display_name" text NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"current_score" integer DEFAULT 0 NOT NULL,
	"finished_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_players_tournament_user" UNIQUE("tournament_id", "user_id")
);

ALTER TABLE "tournaments"
	ADD CONSTRAINT "tournaments_host_id_profiles_id_fk"
	FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "tournament_players"
	ADD CONSTRAINT "tournament_players_tournament_id_tournaments_id_fk"
	FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "tournament_players"
	ADD CONSTRAINT "tournament_players_user_id_profiles_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "tournament_players"
	ADD CONSTRAINT "tournament_players_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "tournament_players_tournament_idx"
	ON "tournament_players" ("tournament_id");

CREATE INDEX "tournament_players_round_idx"
	ON "tournament_players" ("round_id");
