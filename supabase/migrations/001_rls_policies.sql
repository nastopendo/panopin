-- Enable RLS on all application tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── photos ───────────────────────────────────────────────────────────────────
CREATE POLICY "photos: read published"
  ON photos FOR SELECT USING (status = 'published');

CREATE POLICY "photos: admin all"
  ON photos FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── tags ────────────────────────────────────────────────────────────────────
CREATE POLICY "tags: public read"
  ON tags FOR SELECT USING (true);

CREATE POLICY "tags: admin write"
  ON tags FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── photo_tags ───────────────────────────────────────────────────────────────
CREATE POLICY "photo_tags: public read"
  ON photo_tags FOR SELECT USING (true);

CREATE POLICY "photo_tags: admin write"
  ON photo_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── rounds ──────────────────────────────────────────────────────────────────
CREATE POLICY "rounds: own read/write"
  ON rounds FOR ALL USING (
    auth.uid() = user_id
    OR anon_session_id = (current_setting('request.cookies', true)::json->>'panopin-anon-id')
  );

-- ─── guesses ─────────────────────────────────────────────────────────────────
CREATE POLICY "guesses: own read/write"
  ON guesses FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = guesses.round_id
        AND (
          r.user_id = auth.uid()
          OR r.anon_session_id = (current_setting('request.cookies', true)::json->>'panopin-anon-id')
        )
    )
  );
