CREATE TABLE IF NOT EXISTS "scoring_settings" (
  "id" integer PRIMARY KEY,
  "max_distance_m" integer NOT NULL DEFAULT 3000,
  "time_limit_s" integer NOT NULL DEFAULT 30,
  "max_base_score" integer NOT NULL DEFAULT 5000,
  "max_time_bonus" integer NOT NULL DEFAULT 300,
  "scale_easy_m" integer NOT NULL DEFAULT 800,
  "scale_medium_m" integer NOT NULL DEFAULT 500,
  "scale_hard_m" integer NOT NULL DEFAULT 300,
  "mult_easy" double precision NOT NULL DEFAULT 1.0,
  "mult_medium" double precision NOT NULL DEFAULT 1.2,
  "mult_hard" double precision NOT NULL DEFAULT 1.5,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Insert default singleton row
INSERT INTO "scoring_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
