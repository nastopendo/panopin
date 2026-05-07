-- announcement
ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcement: read visible"
  ON announcement FOR SELECT USING (visible = true);

CREATE POLICY "announcement: admin all"
  ON announcement FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- media_assets — admin only (no public read; metadata not exposed)
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_assets: admin all"
  ON media_assets FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
