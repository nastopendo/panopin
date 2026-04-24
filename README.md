# Panopin

Open-source aplikacja w stylu GeoGuessr oparta o własne panoramy 360° z GPS.
Gracze odgadują lokalizacje zdjęć na mapie — im bliżej, tym więcej punktów.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase** — Postgres, Auth (anonimowe sesje + Google OAuth), RLS
- **Drizzle ORM** — schema w `lib/db/schema.ts`
- **Cloudflare R2** — storage kafelków (S3-compatible, public read)
- **Vercel** — hosting

## Self-host: szybki start

### 1. Wymagania

- Node.js 20+, pnpm 9+
- Konto [Supabase](https://supabase.com) (free tier wystarczy)
- Konto [Cloudflare R2](https://developers.cloudflare.com/r2/) (free tier: 10 GB / 10 M req/mies.)

### 2. Sklonuj i zainstaluj

```bash
git clone https://github.com/twoj-nick/panopin.git
cd panopin
pnpm install
```

### 3. Supabase — setup

1. Utwórz nowy projekt w Supabase
2. Uruchom migracje w kolejności w **SQL Editor**:
   - `supabase/migrations/001_rls_policies.sql`
   - `drizzle/migrations/0000_amusing_gladiator.sql`
   - `drizzle/migrations/0001_natural_ultimo.sql`
   - `drizzle/migrations/0002_little_doomsday.sql`
3. Włącz anonimowe logowanie: **Authentication → Providers → Anonymous**
4. (Opcjonalnie) Dodaj Google OAuth: **Authentication → Providers → Google** — wymagany `Client ID` i `Client Secret`
5. Ustaw swojego użytkownika jako admina:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<twoje-auth-uid>';
   ```

### 4. Cloudflare R2 — setup

1. Utwórz bucket `panopin` (lub inną nazwę)
2. Włącz **Public access** na folderze `tiles/`
3. Skonfiguruj CORS (dozwól `PUT` z domeny aplikacji):
   ```json
   [{"AllowedOrigins":["http://localhost:3000","https://twoja-domena.pl"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["*"]}]
   ```
4. Wygeneruj API token z uprawnieniami `Object Read & Write`

### 5. Zmienne środowiskowe

Utwórz plik `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=panopin
R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Uruchom lokalnie

```bash
pnpm dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

### 7. Dodaj pierwsze zdjęcie

1. Zaloguj się jako admin (Google lub magic link)
2. Wejdź na `/admin/upload`
3. Wrzuć zdjęcie 360° z GPS (EXIF z lat/lng)
4. Poczekaj na wygenerowanie kafelków (~10–30s)
5. Zagraj na `/play` 🎉

## Komendy

```bash
pnpm dev          # serwer deweloperski (Turbopack)
pnpm build        # build produkcyjny
pnpm test:run     # testy jednostkowe (vitest)
pnpm lint         # ESLint
pnpm db:generate  # generuj migrację SQL z aktualnego schema
pnpm db:studio    # Drizzle Studio — przeglądarka DB
```

## Licencja

MIT — szczegóły w [LICENSE](./LICENSE).
