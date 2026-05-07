# Banner ogłoszeń + biblioteka mediów — design

**Data:** 2026-05-06
**Status:** zatwierdzony, gotowy do planu implementacji
**Kontekst biznesowy:** konkurs społecznościowy do końca maja 2026 z trzema nagrodami rzeczowymi (puzzle, torba, kubek). Treść opisana zewnętrznie na https://www.leszczkow.pl/panopin-odkryj-leszczkow-na-nowo/. Aplikacja ma czasowo prezentować ogłoszenie z linkiem do opisu konkursu.

## Cel

Konfigurowalny z panelu admina banner ogłoszenia (tytuł, treść, opcjonalny obraz, opcjonalny CTA, toggle widoczności) wyświetlany na landing page (`/`) i stronie rankingu (`/leaderboard`).

Generyczna biblioteka mediów (`media_assets`) reużywalna do innych przyszłych obrazów w aplikacji.

## Decyzje produktowe

- **Gdzie pokazujemy:** landing (`/`) + leaderboard (`/leaderboard`). Bez globalnego banera, bez ekranu końcowego rundy.
- **Generyczność treści:** elastyczna sekcja ogłoszenia (tytuł + treść multiline + opcjonalny obraz + opcjonalny CTA + toggle), nie dedykowana struktura konkursowa. Można reużyć na kolejne kampanie.
- **Obraz:** upload bezpośrednio na R2 + alternatywnie wklejenie URL + alternatywnie wybór z biblioteki uploadowanych plików.
- **Pojedyncze ogłoszenie:** singleton (`announcement.id = 1`), jak `map_settings`. Brak listy ogłoszeń.
- **Biblioteka mediów:** osobna tabela `media_assets` + osobna strona `/admin/media`.

## Architektura danych

### Tabela `media_assets`

```ts
mediaAssets = {
  id: uuid PK,
  url: text NOT NULL,            // pełny public URL na R2
  storageKey: text NOT NULL,     // np. "media/{uuid}.jpg" — do DELETE z R2
  filename: text NULL,           // oryginalna nazwa pliku
  contentType: text NOT NULL,    // image/jpeg | image/png | image/webp
  sizeBytes: integer NOT NULL,
  uploadedBy: uuid FK → profiles.id,
  uploadedAt: timestamptz default now()
}
```

### Tabela `announcement` (singleton)

```ts
announcement = {
  id: integer PK = 1,
  title: text NOT NULL,
  body: text NOT NULL,           // multiline, render z whitespace-pre-line
  imageUrl: text NULL,           // public URL — z media_assets albo zewnętrzny
  ctaText: text NULL,
  ctaUrl: text NULL,
  visible: boolean NOT NULL default false,
  updatedAt: timestamptz default now()
}
```

### R2

Nowa ścieżka: `media/{uuid}.{ext}` z public read (analogicznie do `tiles/*`). CORS już dopuszcza PUT z domeny aplikacji — w ramach implementacji potwierdzić, że obejmuje `media/*` (i jeśli nie, dodać).

### Migracje

- Drizzle: `drizzle/migrations/0003_announcement_and_media.sql` (z `pnpm db:generate`, uruchamiany ręcznie w Supabase SQL Editor — workflow z `CLAUDE.md`).
- RLS: `supabase/migrations/002_announcement_media.sql`.

### Seed (wewnątrz migracji)

Singleton tworzony z `visible = false` i polskimi placeholderami pasującymi do konkursu majowego, żeby admin wszedł w panel i widział sensowny kontekst:

```
title:    'Konkurs majowy — wygraj nagrody!'
body:     '1. miejsce: Foto Puzzle 500 el. 47×33 cm w pudełku ze zdjęciem z drona z Leszczkowa\n2. miejsce: Bawełniana torba na zakupy z juty z nadrukiem tematycznym (Panopin)\n3. miejsce: Kubek Stacker 330 ml z panoramicznym zdjęciem z Leszczkowa'
ctaText:  'Zobacz regulamin'
ctaUrl:   'https://www.leszczkow.pl/panopin-odkryj-leszczkow-na-nowo/'
visible:  false
```

## API

### Publiczne

**`GET /api/announcement`**

- Bez autoryzacji.
- Zwraca `{ title, body, imageUrl, ctaText, ctaUrl }` **tylko gdy `visible = true`**, inaczej `null`.
- `revalidate = 60` (cache 1 min).

### Admin (wszystkie chronione przez `requireAdmin()`)

**`GET /api/admin/announcement`** — singleton CRUD readback (zwraca również niewidoczny).

**`PUT /api/admin/announcement`** — upsert na `id = 1`. Zod schema:

```ts
{
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  imageUrl: z.string().url().nullable(),
  ctaText: z.string().max(60).nullable(),
  ctaUrl: z.string().url().nullable(),
  visible: z.boolean()
}
```

**`GET /api/admin/media`** — lista wszystkich uploadów, `ORDER BY uploaded_at DESC`.

**`POST /api/admin/media/presign`** — body: `{ filename, contentType, sizeBytes }`. Walidacja:

- `contentType ∈ {image/jpeg, image/png, image/webp}`
- `sizeBytes ≤ 5 * 1024 * 1024` (5 MB)
- `filename` opcjonalny, sanityzowany

Zwraca: `{ uploadUrl, publicUrl, storageKey }`. **Nie tworzy wiersza** w `media_assets` — admin może anulować upload.

**`POST /api/admin/media`** — finalize. Body: `{ url, storageKey, filename, contentType, sizeBytes }`. Tworzy wiersz w `media_assets` z `uploadedBy = auth.uid()`.

**`DELETE /api/admin/media/[id]`**

- Czyta wiersz, usuwa plik z R2 (`DeleteObjectCommand` po `storageKey`).
- Jeśli `announcement.image_url` wskazuje na ten plik (porównanie po pełnym URL) → ustawia `image_url = null` w singletonie.
- Usuwa wiersz z `media_assets`.
- Idempotentne — jeśli plik R2 nie istnieje, ignoruje błąd „NoSuchKey".

### Czemu dwukrokowy upload (presign + finalize)

Spójność z istniejącym wzorcem `/api/photos/presign` + `/api/photos`. Jeśli upload się wywali albo admin zamknie kartę, zero śmieci w DB. Wiersz w `media_assets` powstaje dopiero po udanym PUT na R2.

## RLS

Plik `supabase/migrations/002_announcement_media.sql`:

```sql
-- announcement
ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcement_select_visible ON announcement
  FOR SELECT USING (visible = true);
CREATE POLICY announcement_admin_all ON announcement
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- media_assets
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_select_public ON media_assets
  FOR SELECT USING (true);
CREATE POLICY media_admin_modify ON media_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

API admin używa `requireAdmin()` w handlerach (jak reszta `/api/admin/*`), więc RLS działa jako drugi szlaban.

## UI panelu admina

### Nawigacja `app/admin/layout.tsx`

Dodać dwa linki obok istniejących („Treści strony", „Ustawienia mapy", „Zdjęcia", „Tagi", „Punktacja", „Analityka"):

- **Ogłoszenie** → `/admin/announcement`
- **Biblioteka mediów** → `/admin/media`

### Strona `/admin/announcement`

Pojedynczy formularz, kolejność elementów:

1. **Switch widoczności** na górze. Etykieta: „Pokazuj ogłoszenie na stronie". Helper: „Ukryte ogłoszenie zachowuje treść, gracze go nie widzą".
2. **Tytuł** — `Input`, max 200 znaków.
3. **Treść** — `Textarea`, 6 wierszy, max 2000 znaków, helper „nowa linia = nowy akapit".
4. **Obraz** — komponent `<ImagePicker value={imageUrl} onChange={...} />`:
   - Preview obecnego obrazu (jeśli ustawiony) z buttonem „Usuń".
   - Trzy sposoby ustawienia obrazu (taby w dialogu albo button group):
     - **Wgraj nowy** — drag-drop lub file picker → presign → PUT na R2 → finalize → ustawia `imageUrl` na `publicUrl`.
     - **Wybierz z biblioteki** — Dialog z gridem miniatur z `GET /api/admin/media`, klik = wybór, ustawia `imageUrl` na `media.url`.
     - **Wklej URL** — pole tekstowe (zewnętrzny URL, walidacja `z.string().url()`).
5. **CTA** (zwijana sekcja, oba pola opcjonalne): `ctaText` + `ctaUrl`.
6. **Live preview** na dole — renderuje `<AnnouncementBanner>` z bieżącym draftem (z props zamiast fetch z DB).
7. **„Zapisz"** sticky w nagłówku z dirty-detect jak w `app/admin/map-settings/page.tsx`.

### Strona `/admin/media`

Prosty grid miniatur, drag-drop upload zone na górze.

Każdy item:

- Thumbnail 160×120 px, `object-fit: cover`.
- Filename (truncate).
- Content type + rozmiar w KB.
- Data uploadu (`Intl.RelativeTimeFormat('pl')`).
- Button **Kopiuj URL** (clipboard).
- Button **Usuń** (z `confirm` — „Czy na pewno usunąć ten plik? Ta operacja jest nieodwracalna").

Drag-drop zone u góry: drag/drop lub klik → file picker → presign + PUT + finalize → odśwież listę. Walidacja typu i rozmiaru po stronie klienta przed presign request (UX feedback), ale autorytatywnie po stronie serwera.

### Komponent `<ImagePicker>` (reużywalny)

`components/admin/ImagePicker.tsx`. Props:

```ts
{
  value: string | null
  onChange: (url: string | null) => void
}
```

Trzyma stan otwartego dialogu i aktywnego trybu (upload / library / url). Używany na razie tylko w `/admin/announcement`, ale projektowany jako reużywalny.

## Frontend (rendering banera)

### Komponent `<AnnouncementBanner />`

Plik: `components/AnnouncementBanner.tsx`. Server Component (RSC), fetchuje przez Drizzle bezpośrednio (nie HTTP) — szybszy SSR i mniej round-tripów.

```tsx
async function AnnouncementBanner() {
  const [row] = await db
    .select()
    .from(announcement)
    .where(and(eq(announcement.id, 1), eq(announcement.visible, true)))
    .limit(1);
  if (!row) return null;
  // render
}
```

### Layout (Tailwind + shadcn `Card`)

```
┌─────────────────────────────────────────┐
│  [obraz, jeśli jest]                    │
│  Tytuł (text-2xl font-bold)             │
│  Treść (whitespace-pre-line, text-base) │
│  [ Tekst CTA → ]  (Button variant=brand)│
└─────────────────────────────────────────┘
```

- **Bez `imageUrl`:** grid 1-kolumnowy (tylko tekst).
- **Z `imageUrl`:** grid 2-kolumnowy na `md:` (obraz lewo, tekst prawo, `aspect-video` na obrazie), 1-kolumnowy na mobile (obraz nad tekstem).
- **Bez CTA (`ctaText` lub `ctaUrl` puste):** button się nie renderuje.
- **`visible = false`** lub brak wiersza: komponent zwraca `null`.

CTA ma `target="_blank"` + `rel="noopener noreferrer"` (link zewnętrzny do leszczkow.pl).

Obraz: `<Image>` z `next/image`, `unoptimized` jeśli URL z R2 (już zoptymalizowane), albo standardowo z `width/height` + `sizes`.

### Punkty osadzenia

**`app/page.tsx`** — między hero a CTA „Zagraj teraz". Komponent bez propsów, sam pobiera dane z DB.

**`app/leaderboard/page.tsx`** — nad tabelą rankingu, pod nagłówkiem strony.

W obu miejscach `<AnnouncementBanner />` bez propsów. Jeśli niewidoczne, RSC zwraca `null` i nie zajmuje miejsca w DOM.

## Testy

- **Unit:** brak nowej pure logic do testowania (formularze, RSC, REST). Walidacja zod przy granicach pokrywa sprawdzanie wejścia.
- **Manual smoke (po implementacji):**
  - Admin → włącza ogłoszenie → widoczne na `/` i `/leaderboard`.
  - Admin → wyłącza → znika z obu miejsc.
  - Admin → upload obrazu → widoczny w preview i na froncie.
  - Admin → URL zewnętrzny → widoczny na froncie.
  - Admin → wybór z biblioteki → ustawia `image_url`.
  - Admin → usuwa obraz w bibliotece który jest aktywnym `image_url` → singleton ma `image_url = null`, banner renderuje wariant tekstowy.
  - Niezalogowany użytkownik → `GET /api/admin/announcement` → 403.
  - Niezalogowany → `GET /api/announcement` z `visible=false` → `null`.

## Co celowo pomijam (YAGNI)

- **Dismiss per-user** (cookie/localStorage) — toggle widoczności jest po stronie admina, jeśli okaże się potrzebne, dodamy później.
- **Markdown w `body`** — wystarczy `whitespace-pre-line`. Plain text + nowe linie pokrywa case'y opisu nagród.
- **Wiele ogłoszeń jednocześnie** — singleton zatwierdzony.
- **Daty start/end z auto-ukryciem** — toggle wystarcza, mniej kodu, mniej UI.
- **Wersjonowanie / historia ogłoszeń** — nadpisywanie wystarcza.
- **WebP konwersja po stronie serwera** — admin sam wgrywa odpowiedni format. Walidacja content-type.

## Zależności / ryzyka

- **R2 CORS dla `media/*`** — w ramach implementacji potwierdzić; jeśli aktualna konfiguracja jest globalna (`*`), nic nie trzeba zmieniać.
- **Drizzle migrations** — `pnpm db:generate` + ręczne uruchomienie SQL w Supabase SQL Editor (workflow z `CLAUDE.md`, gotcha: `db:push` zawiesza się).
- **Brak nowego sekretu env** — używamy istniejących R2 i Supabase credentials.
