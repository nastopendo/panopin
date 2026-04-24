CREATE TABLE "map_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"center_lat" double precision DEFAULT 52 NOT NULL,
	"center_lng" double precision DEFAULT 19.5 NOT NULL,
	"default_zoom" double precision DEFAULT 5 NOT NULL,
	"map_style" text DEFAULT 'street' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
