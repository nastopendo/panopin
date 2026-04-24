CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."photo_status" AS ENUM('draft', 'processing', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('player', 'admin');--> statement-breakpoint
CREATE TABLE "guesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"photo_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"guess_lat" double precision,
	"guess_lng" double precision,
	"distance_m" integer,
	"time_spent_ms" integer,
	"score" integer,
	"actual_lat" double precision NOT NULL,
	"actual_lng" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_tags" (
	"photo_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "photo_tags_photo_id_tag_id_pk" PRIMARY KEY("photo_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploader_id" uuid,
	"title" text,
	"description" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"heading" double precision DEFAULT 0 NOT NULL,
	"altitude" double precision,
	"captured_at" timestamp with time zone,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"status" "photo_status" DEFAULT 'draft' NOT NULL,
	"tile_base_url" text,
	"tile_manifest" jsonb,
	"original_url" text,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"role" "role" DEFAULT 'player' NOT NULL,
	"country_code" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anon_session_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"total_score" integer,
	"share_image_url" text,
	"filter_tag_ids" jsonb,
	"filter_difficulty" "difficulty",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploader_id_profiles_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;