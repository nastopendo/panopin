-- Defense-in-depth: media_assets metadata should not be enumerable by anon
-- users via direct Supabase client calls. Our /api/admin/media endpoint goes
-- through Drizzle (service role) and is gated by requireAdmin(), so dropping
-- the public read policy does not affect application functionality.
DROP POLICY IF EXISTS "media_assets: public read" ON media_assets;
