-- Extend the difficulty enum with a new 'extreme' tier
ALTER TYPE "public"."difficulty" ADD VALUE IF NOT EXISTS 'extreme';

-- Add extreme scoring parameters to the settings singleton
ALTER TABLE "scoring_settings"
  ADD COLUMN IF NOT EXISTS "scale_extreme_m" integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "mult_extreme" double precision NOT NULL DEFAULT 2.0;
