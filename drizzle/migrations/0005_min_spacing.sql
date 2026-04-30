ALTER TABLE "scoring_settings"
  ADD COLUMN IF NOT EXISTS "min_spacing_m" integer NOT NULL DEFAULT 0;
