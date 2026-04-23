@AGENTS.md

# Panopin — guide for Claude

Open-source aplikacja typu GeoGuessr oparta o własne panoramy 360° z GPS. Misja: aktywizacja lokalnej społeczności.

> Komunikacja w tym projekcie: po polsku. Nazwy techniczne, identyfikatory, commity, komentarze w kodzie → po angielsku.

## Stack (zatwierdzony)

- **Next.js 16 + React 19** (App Router, Turbopack) — ⚠️ to Next 16, nie 15 jak w dokumentacji ogólnej. Przed pisaniem nowych API/konwencji sprawdź `node_modules/next/dist/docs/`.
- **TypeScript** (strict) — bez `any`, zod przy granicach I/O
- **Tailwind v4** + shadcn/ui (do zainstalowania)
- **Supabase** — Postgres + Auth (anonimowe sesje + OAuth Google) + RLS
- **Drizzle ORM** — schema w `lib/db/schema.ts`, migracje w `drizzle/`
- **Cloudflare R2** — storage (S3 API), public read na `tiles/*`, presigned PUT dla uploadu
- **Hosting**: Vercel
- **Licencja**: MIT
- **Package manager**: pnpm

## Architektura w skrócie

Upload (admin): klient wybiera JPG 360° → EXIF w przeglądarce (`exifr`) → Web Worker + WebGL rozkłada equirectangular na 6 ścian cube (~2048 px) → każda ściana cięta na kafelki 512 px na 3 poziomach (1×1, 2×2, 4×4) → równoległy PUT na R2 przez presigned URLs → backend zapisuje wiersz `photos` ze `status='published'`.

Gra: gracz na `/play` → backend losuje 5 zdjęć z filtrów → Photo Sphere Viewer serwuje kafelki z R2 → MapLibre przyjmuje guess → backend liczy punkty (`lib/scoring.ts`) → zapis do `rounds`/`guesses` → share OG image z `@vercel/og`.

## Zasady architektoniczne (nie łam ich)

1. **Punktacja liczona ZAWSZE na serwerze.** Klient wysyła tylko `{guess_lat, guess_lng, photo_id, elapsed_ms}`. Serwer zna `actual_lat/lng` i `difficulty` — liczy dystans (haversine) i score. Nigdy nie ufaj wartości score z klienta.
2. **RLS włączone na wszystkich tabelach.** Żaden endpoint nie wolny wyłączyć RLS przez `service_role` poza `/api/admin/*` i jobami CRON.
3. **Zero Vercel heavy-lifting.** Generacja kafelków dzieje się w przeglądarce admina. Route Handlery serwują tylko JSON + presigned URLs + OG image. Nic długotrwałego.
4. **Kafelki są publiczne, źródłowe panoramy nie.** `tiles/*` → public read na R2. `originals/*` → tylko presigned GET dla admina (kopia zapasowa).
5. **`lib/scoring.ts` jest pure.** Żadnych side-effektów, żadnego DB, żadnego `fetch`. Tylko matematyka. Obowiązkowo unit-tested.
6. **Admin = RLS + flaga `role='admin'` w `profiles`.** Nigdy hardkodowany email w kodzie.

## Model domeny (skrót — pełny schemat w `lib/db/schema.ts`)

- `profiles` — `display_name`, `role` (`player|admin`), `country_code`
- `photos` — panorama: `lat/lng`, `heading`, `altitude`, `captured_at`, `difficulty`, `status`, `tile_base_url`, `tile_manifest jsonb`, `original_url`, `thumbnail_url`
- `tags` / `photo_tags` — N:M tagowanie
- `rounds` — `user_id|anon_session_id`, `total_score`, filtry
- `guesses` — `round_id`, `photo_id`, `sequence 1..5`, `guess_lat/lng`, `distance_m`, `score`, `actual_lat/lng` (snapshot)
- `leaderboard_weekly` / `leaderboard_all_time` — materialized views, refresh nocnym cronem

## Punktacja (źródło prawdy: `lib/scoring.ts`)

```ts
const SCALE = { easy: 2000, medium: 1000, hard: 500 };     // metry
const MULT  = { easy: 1.0,  medium: 1.2,  hard: 1.5 };

// base = 5000 * exp(-dist_m / SCALE[difficulty])
// timeBonus = min(300, max(0, 30_000 - elapsed_ms) / 100)
// score = round(base * MULT[difficulty] + timeBonus)
```

Top X% liczony z `percentile_cont` na materialized view.

## Struktura katalogów (cel — budujemy stopniowo)

```
app/
  (marketing)/page.tsx
  play/page.tsx                        — start + filtry
  play/[roundId]/page.tsx              — gameplay 5-etapowy
  leaderboard/page.tsx
  admin/upload/page.tsx
  admin/photos/page.tsx
  admin/tags/page.tsx
  api/rounds/route.ts                  — POST start
  api/rounds/[id]/guesses/route.ts     — POST submit guess
  api/rounds/[id]/finish/route.ts      — POST finish + total
  api/photos/presign/route.ts          — presigned PUT dla R2
  api/photos/[id]/route.ts             — admin CRUD
  api/shares/[roundId]/route.ts        — @vercel/og
  api/leaderboard/route.ts
  auth/callback/route.ts
components/
  panorama/Viewer.tsx                  — PhotoSphereViewer wrapper
  panorama/TileGenerator.tsx           — UI orkiestrująca worker
  map/GuessMap.tsx                     — MapLibre
  game/RoundScreen.tsx, ResultScreen.tsx
  share/ShareButton.tsx
  admin/UploadForm.tsx
workers/
  tile-gen.worker.ts                   — WebGL equirect→cube→tiles
lib/
  db/schema.ts, db/client.ts
  r2.ts                                — S3 client + presign
  scoring.ts                           — pure, unit-tested
  geo.ts                               — haversine
  exif.ts                              — wrapper nad exifr
  auth/server.ts                       — Supabase SSR helpers
  auth/guest.ts                        — anon session
drizzle/migrations/
supabase/migrations/                   — RLS SQL
tests/                                 — vitest + playwright
```

## Tile generation — największe ryzyko techniczne

Rekomendacja: **WebGL shader w Web Worker z OffscreenCanvas.**

1. `ArrayBuffer` JPEG → `createImageBitmap` → OffscreenCanvas w workerze
2. WebGL shader (GLSL ~40 linii) renderuje 6 ścian cube (front/right/back/left/top/bottom), każda np. 2048 px
3. Dla każdej ściany: 3 poziomy mip (2048/1024/512), każdy cięty canvasem na kafelki 512 px → `convertToBlob({ type: 'image/jpeg', quality: 0.85 })`
4. `postMessage({face, level, x, y, blob})` → main thread
5. Main thread: concurrency 6 równoległych PUT na R2 przez presigned URLs

Format ścieżek (zgodny z Photo Sphere Viewer `cubemap-tiles-adapter`):
```
/tiles/{photoId}/{face}/{level}/{y}_{x}.jpg
face ∈ {front,right,back,left,top,bottom}
level ∈ {0,1,2}  (0 = najmniejszy = 1×1)
```

Fallback (brak WebGL): Canvas2D pixel-by-pixel, ~30s na 8K.

**Nie używaj wasm-vips** — +10 MB bundle i 2-3× wolniej niż WebGL.

Referencyjny shader do skopiowania: three.js `CubemapFromEquirect` (MIT).

## Milestone'y MVP

- [ ] **M0** — fundamenty: Next.js init (✅), Supabase + RLS, R2 bucket + CORS, Drizzle schema, `/api/photos/presign`
- [ ] **M1** — viewer + mapa: `<PanoramaViewer>` na zaszytej panoramie, `<GuessMap>`, `/play/demo`
- [ ] **M2** — upload + generacja kafelków (3-5 dni, najwięcej ryzyka): `/admin/upload`, EXIF, WebGL worker, progress, PUT na R2, zapis DB
- [ ] **M3** — rozgrywka + scoring: `rounds/*`, `lib/scoring.ts` + testy, `/play/[roundId]` state-machine
- [ ] **M4** — ranking + konta: anonimowe Supabase Auth, upgrade do Google (`linkIdentity`), `/leaderboard`, top X%
- [ ] **M5** — share image: `@vercel/og` layout, Web Share API, OG meta tags
- [ ] **M6** — tagi + difficulty + filtry: admin edytor tagów, filtry przed startem rundy
- [ ] **M7** — polish + release: README (self-host), LICENSE, E2E Playwright, deploy preview, domena

## Fazy po MVP

- **Faza 2** — turnieje real-time (Supabase Realtime channels, lobby, synchroniczny start, live ranking w pokoju)
- **Faza 3** — moderacja społecznościowa (userzy zgłaszają panoramy → admin approval)
- **Faza 4** — daily challenge, streaki, achievementy, statystyki regionalne
- **Faza 5** — PWA offline mode (cache kafelków), i18n PL/EN

## Komendy

```bash
pnpm dev           # dev server (Turbopack)
pnpm build         # production build
pnpm start         # production server
pnpm lint          # ESLint

# będzie dodane:
pnpm test          # vitest unit
pnpm test:e2e      # playwright
pnpm db:push       # drizzle migrate
pnpm db:studio     # drizzle-kit studio
```

## Sekrety (env)

Do dodania w `.env.local` (nigdy w repo):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # tylko backend
DATABASE_URL=                         # Drizzle → Supabase pooler
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=panopin
R2_PUBLIC_BASE_URL=                   # np. https://cdn.panopin.app
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Gotchas / rzeczy do pilnowania

- **Next 16 ≠ Next 15.** App Router działa, ale API mogą być inne. Zawsze sprawdź `node_modules/next/dist/docs/` przed wprowadzaniem nietypowych wzorców (server actions, streaming, route segments).
- **Tailwind v4** używa nowej konfiguracji przez `@theme` w CSS — nie szukaj `tailwind.config.ts`.
- **@photo-sphere-viewer/core** — React 19 wrapper (`react-photo-sphere-viewer`) bywa opóźniony; jak nie działa, użyj vanilla `useEffect` + `Viewer.setPanorama()`.
- **R2 CORS** — musi pozwalać `PUT` z domeny aplikacji (localhost + prod) na `/tiles/*` i `/originals/*`.
- **Supabase anonymous sessions** — trzeba włączyć jawnie w Auth settings (Sign-in providers → Anonymous).
- **materialized view refresh** — `CONCURRENTLY` wymaga unikalnego indeksu; nie zapomnij go dodać.
- **Drizzle + Supabase** — używaj pooler connection string (`6543`), nie bezpośredniego (`5432`), dla serverless.

## Linki do planu źródłowego

Pełny plan z uzasadnieniami decyzji: `/Users/grzegorz/.claude/plans/chc-samodzielnie-zrobi-aplikacj-elegant-muffin.md`
