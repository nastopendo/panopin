-- ─── RLS for tournament tables ───────────────────────────────────────────────
-- Tournament code itself is the access control: anyone with the code can read.
-- Writes happen exclusively through API routes using service_role (bypasses RLS).

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments: public read"
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "tournament_players: public read"
  ON tournament_players FOR SELECT USING (true);

-- ─── Realtime publication ────────────────────────────────────────────────────
-- Required for postgres_changes subscriptions to fire on these tables.

ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_players;
