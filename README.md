# Panopin

Open-source GeoGuessr-style game built around custom 360deg panoramas with GPS data.
Players guess each photo location on the map - the closer the guess, the more points they get.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase** — Postgres, Auth (anonymous sessions + Google OAuth), RLS
- **Drizzle ORM** — schema in `lib/db/schema.ts`
- **Cloudflare R2** — tile storage (S3-compatible, public read)
- **Vercel** — hosting

## Self-host: quick start

### 1. Requirements

- Node.js 20+, pnpm 9+
- A [Supabase](https://supabase.com) account (free tier is enough)
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) account (free tier: 10 GB / 10 M requests/month)

### 2. Clone and install

```bash
git clone https://github.com/your-username/panopin.git
cd panopin
pnpm install
```

### 3. Supabase setup

1. Create a new Supabase project
2. Run migrations in this order in **SQL Editor**:
   - `supabase/migrations/001_rls_policies.sql`
   - `drizzle/migrations/0000_amusing_gladiator.sql`
   - `drizzle/migrations/0001_natural_ultimo.sql`
   - `drizzle/migrations/0002_little_doomsday.sql`
3. Enable anonymous sign-in: **Authentication -> Providers -> Anonymous**
4. (Optional) Add Google OAuth: **Authentication -> Providers -> Google** - requires `Client ID` and `Client Secret`
5. Set your user as admin:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<your-auth-uid>';
   ```

### 4. Cloudflare R2 setup

1. Create bucket `panopin` (or any name you prefer)
2. Enable **Public access** for the `tiles/` folder
3. Configure CORS (allow `PUT` from your app domains):
   ```json
   [{"AllowedOrigins":["http://localhost:3000","https://your-domain.com"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["*"]}]
   ```
4. Generate an API token with `Object Read & Write` permissions

### 5. Environment variables

Create a `.env.local` file:

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

### 6. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Upload your first photo

1. Sign in as admin (Google or magic link)
2. Go to `/admin/upload`
3. Upload a 360deg photo with GPS metadata (EXIF lat/lng)
4. Wait for tile generation (~10-30s)
5. Play at `/play` 🎉

## Commands

```bash
pnpm dev          # development server (Turbopack)
pnpm build        # production build
pnpm test:run     # unit tests (vitest)
pnpm lint         # ESLint
pnpm db:generate  # generate SQL migration from current schema
pnpm db:studio    # Drizzle Studio - database browser
```

## License

MIT - see [LICENSE](./LICENSE) for details.
