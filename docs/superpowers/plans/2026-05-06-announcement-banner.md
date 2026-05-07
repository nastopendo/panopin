# Banner ogłoszeń + biblioteka mediów — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⛔ ZAKAZ AUTO-COMMITÓW.** W tym repo user kontroluje commity. **Wykonujący NIE wykonuje `git add` ani `git commit`.** W każdym tasku zamiast committować zatrzymaj się na "**Checkpoint**" i poczekaj, aż user sam zacommituje (albo poprosi cię konkretnie). Ta zasada nadpisuje sugestie z `superpowers:executing-plans` i `superpowers:subagent-driven-development`.

**Goal:** Dodać konfigurowalny z panelu admina banner ogłoszeń (singleton) wyświetlany na `/` i `/leaderboard`, plus generyczną bibliotekę mediów (`media_assets`) z uploadami na R2 reużywalną w przyszłości.

**Architecture:** Singleton `announcement` (id=1, jak `map_settings`) + osobna tabela `media_assets` z metadanymi uploadów. Public read na obu z RLS. R2 nowa ścieżka `media/{uuid}.{ext}` z public read. Dwukrokowy upload (presign + finalize) zgodny z istniejącym wzorcem `/api/photos/presign`. Frontend banner to RSC fetchujące przez Drizzle.

**Tech Stack:** Next 16 + React 19 (App Router, RSC), TypeScript strict, Drizzle ORM, Supabase (Auth + RLS), Cloudflare R2 (S3 API + presigned URLs), shadcn/ui, Tailwind v4, Zod.

**Spec:** `docs/superpowers/specs/2026-05-06-announcement-banner-design.md`

---

## File Structure

### Pliki do utworzenia
- `drizzle/migrations/0010_announcement_and_media.sql` — DDL nowych tabel
- `supabase/migrations/003_announcement_media_rls.sql` — RLS policies
- `app/api/announcement/route.ts` — public GET
- `app/api/admin/announcement/route.ts` — admin GET + PUT
- `app/api/admin/media/presign/route.ts` — admin POST (presign)
- `app/api/admin/media/route.ts` — admin GET (list) + POST (finalize)
- `app/api/admin/media/[id]/route.ts` — admin DELETE
- `app/admin/announcement/page.tsx` — admin form
- `app/admin/media/page.tsx` — admin media library
- `components/admin/ImagePicker.tsx` — reusable image picker
- `components/AnnouncementBanner.tsx` — frontend banner RSC
- `components/ui/switch.tsx` — shadcn Switch (instalacja przez CLI)

### Pliki do modyfikacji
- `lib/db/schema.ts` — dodaj `mediaAssets` + `announcement` tabele i typy
- `lib/r2.ts` — rozszerz `r2Keys` o `media(uuid, ext)`
- `components/admin/AdminNav.tsx` — dodaj linki Ogłoszenie + Biblioteka mediów
- `app/page.tsx` — osadź `<AnnouncementBanner />`
- `app/leaderboard/page.tsx` — osadź `<AnnouncementBanner />`
- `package.json` (pośrednio) — `pnpm dlx shadcn@latest add switch` doda dependency

---

## Task 1 — Schema bazy + migracja Drizzle + RLS

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/migrations/0010_announcement_and_media.sql`
- Create: `supabase/migrations/003_announcement_media_rls.sql`

- [ ] **Step 1: Dodaj tabele i typy do schematu Drizzle**

W `lib/db/schema.ts`, **przed sekcją `// ─── Types`**, dodaj:

```ts
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  storageKey: text("storage_key").notNull(),
  filename: text("filename"),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id),
  uploadedAt: timestamptz("uploaded_at").defaultNow().notNull(),
});

export const announcement = pgTable("announcement", {
  id: integer("id").primaryKey(), // singleton — always id=1
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  visible: boolean("visible").notNull().default(false),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});
```

W sekcji `// ─── Types` dopisz:

```ts
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type AnnouncementRow = typeof announcement.$inferSelect;
```

- [ ] **Step 2: Wygeneruj migrację Drizzle**

Run: `pnpm db:generate`

Drizzle utworzy plik z hashem nazwy w `drizzle/migrations/`. **Przemianuj go na `0010_announcement_and_media.sql`** (kontynuując konwencję sekwencyjną z `0009_tournament_rematch.sql`).

Plik powinien zawierać DDL podobny do:

```sql
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "announcement" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"cta_text" text,
	"cta_url" text,
	"visible" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_profiles_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
```

Następnie **dopisz na końcu pliku migracji** SEED singletona (żeby admin po wejściu w panel widział sensowny kontekst):

```sql
INSERT INTO "announcement" ("id", "title", "body", "cta_text", "cta_url", "visible") VALUES (
  1,
  'Konkurs majowy — wygraj nagrody!',
  E'1. miejsce: Foto Puzzle 500 el. 47×33 cm w pudełku ze zdjęciem z drona z Leszczkowa\n2. miejsce: Bawełniana torba na zakupy z juty z nadrukiem tematycznym (Panopin)\n3. miejsce: Kubek Stacker 330 ml z panoramicznym zdjęciem z Leszczkowa',
  'Zobacz regulamin',
  'https://www.leszczkow.pl/panopin-odkryj-leszczkow-na-nowo/',
  false
) ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3: Utwórz plik RLS policies**

Create `supabase/migrations/003_announcement_media_rls.sql`:

```sql
-- announcement
ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcement: read visible"
  ON announcement FOR SELECT USING (visible = true);

CREATE POLICY "announcement: admin all"
  ON announcement FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- media_assets
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_assets: public read"
  ON media_assets FOR SELECT USING (true);

CREATE POLICY "media_assets: admin write"
  ON media_assets FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

- [ ] **Step 4: Uruchom migracje ręcznie w Supabase SQL Editor**

Workflow z `CLAUDE.md`: `db:push` zawiesza się, więc ręcznie:

1. Otwórz Supabase → SQL Editor.
2. Wklej i uruchom zawartość `drizzle/migrations/0010_announcement_and_media.sql`.
3. Wklej i uruchom zawartość `supabase/migrations/003_announcement_media_rls.sql`.
4. Sprawdź: `SELECT * FROM announcement WHERE id = 1;` → powinien zwrócić seed row z `visible = false`.
5. Sprawdź: `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('announcement', 'media_assets');` → obie z `relrowsecurity = true`.

- [ ] **Step 5: Weryfikacja TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors related to nowych tabel.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts drizzle/migrations/0010_announcement_and_media.sql supabase/migrations/003_announcement_media_rls.sql
git commit -m "Add announcement singleton and media_assets tables with RLS"
```

---

## Task 2 — R2 helper dla media

**Files:**
- Modify: `lib/r2.ts`

- [ ] **Step 1: Rozszerz `r2Keys` o helper `media`**

W `lib/r2.ts`, w obiekcie `r2Keys`, dodaj nową funkcję obok istniejących:

```ts
media: (id: string, ext: string) => `media/${id}.${ext.replace(/^\./, "")}`,
```

Pełny obiekt po zmianie:

```ts
export const r2Keys = {
  original: (photoId: string) => `originals/${photoId}.jpg`,
  thumbnail: (photoId: string) => `thumbs/${photoId}.webp`,
  tile: (photoId: string, face: string, level: number, y: number, x: number) =>
    `tiles/${photoId}/${face}/${level}/${y}_${x}.jpg`,
  share: (roundId: string) => `shares/${roundId}.png`,
  media: (id: string, ext: string) => `media/${id}.${ext.replace(/^\./, "")}`,
};
```

- [ ] **Step 2: Weryfikacja TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/r2.ts
git commit -m "Add media key helper to r2Keys"
```

---

## Task 3 — Public API: GET /api/announcement

**Files:**
- Create: `app/api/announcement/route.ts`

- [ ] **Step 1: Utwórz route handler**

Create `app/api/announcement/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { announcement } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const revalidate = 60;

export async function GET() {
  const [row] = await db
    .select({
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl,
      ctaText: announcement.ctaText,
      ctaUrl: announcement.ctaUrl,
    })
    .from(announcement)
    .where(and(eq(announcement.id, 1), eq(announcement.visible, true)))
    .limit(1);

  return NextResponse.json(row ?? null);
}
```

- [ ] **Step 2: Manual smoke test**

Run: `pnpm dev` (jeśli jeszcze nie działa).

Otwórz `http://localhost:3000/api/announcement` w przeglądarce/curl:
- Z seed `visible = false` → odpowiedź `null`.

Następnie ręcznie w Supabase SQL Editor:
```sql
UPDATE announcement SET visible = true WHERE id = 1;
```

Odśwież endpoint → powinien zwrócić `{ title, body, imageUrl: null, ctaText, ctaUrl }`.

Cofnij: `UPDATE announcement SET visible = false WHERE id = 1;`

- [ ] **Step 3: Commit**

```bash
git add app/api/announcement/route.ts
git commit -m "Add public GET /api/announcement endpoint"
```

---

## Task 4 — Admin API: announcement CRUD

**Files:**
- Create: `app/api/admin/announcement/route.ts`

- [ ] **Step 1: Utwórz route handler z GET + PUT**

Create `app/api/admin/announcement/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { announcement } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [row] = await db
    .select()
    .from(announcement)
    .where(eq(announcement.id, 1))
    .limit(1);

  return NextResponse.json(row ?? null);
}

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  imageUrl: z.string().url().nullable(),
  ctaText: z.string().max(60).nullable(),
  ctaUrl: z.string().url().nullable(),
  visible: z.boolean(),
});

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid body", details: parse.error },
      { status: 400 },
    );
  }

  const data = parse.data;

  await db
    .insert(announcement)
    .values({ id: 1, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: announcement.id,
      set: { ...data, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Manual smoke test (jako admin)**

Z włączonym dev serverem, zaloguj się jako admin, otwórz konsolę przeglądarki na `/admin` i:

```js
fetch('/api/admin/announcement').then(r => r.json()).then(console.log);
```

Powinien zwrócić seed row.

```js
fetch('/api/admin/announcement', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test',
    body: 'Test body',
    imageUrl: null,
    ctaText: null,
    ctaUrl: null,
    visible: false,
  }),
}).then(r => r.json()).then(console.log);
```

Powinien zwrócić `{ ok: true }`. Sprawdź w SQL Editor że pola zostały zapisane.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/announcement/route.ts
git commit -m "Add admin announcement CRUD endpoint"
```

---

## Task 5 — Admin API: media (presign + list + finalize + delete)

**Files:**
- Create: `app/api/admin/media/presign/route.ts`
- Create: `app/api/admin/media/route.ts`
- Create: `app/api/admin/media/[id]/route.ts`

- [ ] **Step 1: Utwórz presign endpoint**

Create `app/api/admin/media/presign/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/server";
import { presignPut, r2Keys, getPublicUrl } from "@/lib/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_TYPE: Record<(typeof ALLOWED_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const BodySchema = z.object({
  filename: z.string().max(200).optional(),
  contentType: z.enum(ALLOWED_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid body", details: parse.error },
      { status: 400 },
    );
  }

  const { contentType } = parse.data;
  const id = randomUUID();
  const ext = EXT_BY_TYPE[contentType];
  const storageKey = r2Keys.media(id, ext);
  const publicUrl = getPublicUrl(storageKey);
  const uploadUrl = await presignPut(storageKey, contentType, 3600);

  return NextResponse.json({ uploadUrl, publicUrl, storageKey });
}
```

- [ ] **Step 2: Utwórz list + finalize endpoint**

Create `app/api/admin/media/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select()
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.uploadedAt));

  return NextResponse.json(rows);
}

const FinalizeSchema = z.object({
  url: z.string().url(),
  storageKey: z.string().min(1).max(500),
  filename: z.string().max(200).nullable(),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = FinalizeSchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid body", details: parse.error },
      { status: 400 },
    );
  }

  const data = parse.data;

  const [row] = await db
    .insert(mediaAssets)
    .values({
      url: data.url,
      storageKey: data.storageKey,
      filename: data.filename,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      uploadedBy: admin.id,
    })
    .returning();

  return NextResponse.json(row);
}
```

- [ ] **Step 3: Utwórz delete endpoint**

Create `app/api/admin/media/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db/client";
import { mediaAssets, announcement } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Delete from R2 (idempotent — ignore NoSuchKey)
  try {
    await r2.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: row.storageKey }),
    );
  } catch (err) {
    if (
      !(err instanceof Error) ||
      !err.name.includes("NoSuchKey")
    ) {
      throw err;
    }
  }

  // If announcement.image_url points to this asset, null it out
  await db
    .update(announcement)
    .set({ imageUrl: null, updatedAt: new Date() })
    .where(eq(announcement.imageUrl, row.url));

  // Delete row
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Manual smoke test (jako admin)**

W konsoli przeglądarki na `/admin`:

```js
// Presign — bez tworzenia wiersza
const presign = await fetch('/api/admin/media/presign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contentType: 'image/jpeg', sizeBytes: 100000 }),
}).then(r => r.json());
console.log(presign);
// { uploadUrl: "...", publicUrl: "https://cdn.../media/{uuid}.jpg", storageKey: "media/{uuid}.jpg" }

// List — pusty na razie
await fetch('/api/admin/media').then(r => r.json()); // []
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/media/
git commit -m "Add admin media library endpoints (presign, list, finalize, delete)"
```

---

## Task 6 — shadcn Switch + ImagePicker

**Files:**
- Create: `components/ui/switch.tsx` (przez shadcn CLI)
- Create: `components/admin/ImagePicker.tsx`

- [ ] **Step 1: Zainstaluj shadcn Switch**

Run: `pnpm dlx shadcn@latest add switch`

Po wykonaniu sprawdź że plik `components/ui/switch.tsx` istnieje. Powinien używać `@radix-ui/react-switch` i pasować stylem do reszty projektu.

- [ ] **Step 2: Utwórz komponent ImagePicker**

Create `components/admin/ImagePicker.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Library, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  url: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ImagePickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type Mode = "upload" | "library" | "url";

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState<MediaAsset[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openWith(initialMode: Mode) {
    setMode(initialMode);
    setUrlDraft(value ?? "");
    setOpen(true);
    if (initialMode === "library") loadLibrary();
  }

  async function loadLibrary() {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) throw new Error("HTTP " + res.status);
      setLibrary(await res.json());
    } catch {
      toast.error("Nie udało się wczytać biblioteki");
    } finally {
      setLibraryLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Dozwolone formaty: JPG, PNG, WebP");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Maksymalny rozmiar: 5 MB");
      return;
    }

    setUploading(true);
    try {
      // 1. Presign
      const presignRes = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error("Presign failed");
      const presign: { uploadUrl: string; publicUrl: string; storageKey: string } =
        await presignRes.json();

      // 2. PUT to R2
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to R2 failed");

      // 3. Finalize (create DB row)
      const finalizeRes = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: presign.publicUrl,
          storageKey: presign.storageKey,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!finalizeRes.ok) throw new Error("Finalize failed");

      onChange(presign.publicUrl);
      setOpen(false);
      toast.success("Obraz wgrany");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd uploadu");
    } finally {
      setUploading(false);
    }
  }

  function handleApplyUrl() {
    if (!urlDraft.trim()) {
      onChange(null);
      setOpen(false);
      return;
    }
    try {
      new URL(urlDraft);
    } catch {
      toast.error("Niepoprawny URL");
      return;
    }
    onChange(urlDraft.trim());
    setOpen(false);
  }

  function handlePickFromLibrary(asset: MediaAsset) {
    onChange(asset.url);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="rounded-xl border bg-card/40 p-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Podgląd obrazu"
            className="w-full max-h-48 object-contain rounded-lg bg-muted"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openWith("upload")}
            >
              <ImagePlus className="size-4" />
              Zmień
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Usuń
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith("upload")}
          >
            <Upload className="size-4" />
            Wgraj nowy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith("library")}
          >
            <Library className="size-4" />
            Z biblioteki
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith("url")}
          >
            <Link2 className="size-4" />
            Z URL
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wybierz obraz</DialogTitle>
            <DialogDescription>
              Wgraj nowy plik, wybierz z biblioteki lub podaj zewnętrzny URL.
            </DialogDescription>
          </DialogHeader>

          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
            className="w-full"
          >
            <ToggleGroupItem value="upload" className="flex-1">
              <Upload className="size-4 mr-1.5" />
              Wgraj
            </ToggleGroupItem>
            <ToggleGroupItem value="library" className="flex-1" onClick={loadLibrary}>
              <Library className="size-4 mr-1.5" />
              Biblioteka
            </ToggleGroupItem>
            <ToggleGroupItem value="url" className="flex-1">
              <Link2 className="size-4 mr-1.5" />
              URL
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="min-h-[200px] py-2">
            {mode === "upload" && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2",
                    "text-muted-foreground hover:bg-accent/40 transition-colors",
                    uploading && "opacity-50 pointer-events-none",
                  )}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-6 animate-spin" />
                      <span className="text-sm">Wgrywanie…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-6" />
                      <span className="text-sm">Kliknij, aby wybrać plik</span>
                      <span className="text-xs">JPG/PNG/WebP, max 5 MB</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {mode === "library" && (
              <div>
                {libraryLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="size-4 animate-spin" />
                    Ładowanie…
                  </div>
                ) : library && library.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                    {library.map((asset) => (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => handlePickFromLibrary(asset)}
                        className="aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-brand transition"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.filename ?? ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Biblioteka pusta. Wgraj pierwszy obraz w zakładce „Wgraj".
                  </p>
                )}
              </div>
            )}

            {mode === "url" && (
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://…"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Wklej URL obrazu z dowolnej strony. Pamiętaj, że zewnętrzny host
                  może w przyszłości zniknąć.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {mode === "url" && (
              <Button onClick={handleApplyUrl} variant="brand">
                Użyj URL
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Weryfikacja TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/switch.tsx components/admin/ImagePicker.tsx package.json pnpm-lock.yaml
git commit -m "Add Switch (shadcn) and reusable ImagePicker component"
```

---

## Task 7 — Strona /admin/announcement

**Files:**
- Create: `app/admin/announcement/page.tsx`

- [ ] **Step 1: Utwórz stronę z formularzem**

Create `app/admin/announcement/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImagePicker } from "@/components/admin/ImagePicker";

interface Form {
  title: string;
  body: string;
  imageUrl: string | null;
  ctaText: string;
  ctaUrl: string;
  visible: boolean;
}

const EMPTY: Form = {
  title: "",
  body: "",
  imageUrl: null,
  ctaText: "",
  ctaUrl: "",
  visible: false,
};

function fromApi(row: {
  title: string;
  body: string;
  imageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  visible: boolean;
}): Form {
  return {
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl,
    ctaText: row.ctaText ?? "",
    ctaUrl: row.ctaUrl ?? "",
    visible: row.visible,
  };
}

export default function AnnouncementPage() {
  const [form, setForm] = useState<Form | null>(null);
  const originalRef = useRef<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((row) => {
        const f = row ? fromApi(row) : EMPTY;
        setForm(f);
        originalRef.current = f;
      })
      .catch(() => setError("Nie można wczytać ogłoszenia"));
  }, []);

  if (!form) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Ogłoszenie</h1>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Ładowanie…
          </div>
        )}
      </div>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(originalRef.current);

  async function handleSave() {
    if (!form || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        imageUrl: form.imageUrl,
        ctaText: form.ctaText.trim() || null,
        ctaUrl: form.ctaUrl.trim() || null,
        visible: form.visible,
      };
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      originalRef.current = form;
      toast.success("Ogłoszenie zapisane");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3 sticky top-[56px] sm:top-[64px] bg-background/80 backdrop-blur-md py-2 -mx-4 sm:-mx-6 px-4 sm:px-6 z-10 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ogłoszenie</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Banner widoczny na stronie głównej i rankingu.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} variant="brand">
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Zapisuję…
            </>
          ) : (
            "Zapisz"
          )}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widoczność</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="visible">Pokazuj ogłoszenie na stronie</Label>
              <p className="text-xs text-muted-foreground">
                Ukryte ogłoszenie zachowuje treść — gracze go nie widzą.
              </p>
            </div>
            <Switch
              id="visible"
              checked={form.visible}
              onCheckedChange={(v) => setForm((f) => f && { ...f, visible: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Treść</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Tytuł</Label>
            <Input
              id="title"
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => f && { ...f, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Treść</Label>
            <Textarea
              id="body"
              rows={6}
              maxLength={2000}
              value={form.body}
              onChange={(e) => setForm((f) => f && { ...f, body: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Nowa linia = nowy akapit.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Obraz</CardTitle>
        </CardHeader>
        <CardContent>
          <ImagePicker
            value={form.imageUrl}
            onChange={(url) => setForm((f) => f && { ...f, imageUrl: url })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Przycisk akcji (opcjonalnie)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ctaText">Tekst przycisku</Label>
            <Input
              id="ctaText"
              maxLength={60}
              placeholder="np. Zobacz regulamin"
              value={form.ctaText}
              onChange={(e) => setForm((f) => f && { ...f, ctaText: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaUrl">URL przycisku</Label>
            <Input
              id="ctaUrl"
              type="url"
              placeholder="https://…"
              value={form.ctaUrl}
              onChange={(e) => setForm((f) => f && { ...f, ctaUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Oba pola muszą być wypełnione, żeby przycisk się wyświetlił.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test**

W przeglądarce, jako admin: `/admin/announcement`.

Sprawdź:
- Strona ładuje się z seed data.
- Switch działa (zmiana stanu).
- Tytuł, treść, CTA zapisują się.
- ImagePicker — kliknij „Wgraj nowy", wybierz JPG, sprawdź że banner ma `imageUrl` po zapisie.
- Po zapisie SQL Editor: `SELECT * FROM announcement WHERE id = 1;` → odpowiada formie.

- [ ] **Step 3: Commit**

```bash
git add app/admin/announcement/page.tsx
git commit -m "Add /admin/announcement settings page"
```

---

## Task 8 — Strona /admin/media (biblioteka)

**Files:**
- Create: `app/admin/media/page.tsx`

- [ ] **Step 1: Utwórz stronę biblioteki**

Create `app/admin/media/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  url: string;
  storageKey: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "przed chwilą";
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h temu`;
  const days = Math.round(hours / 24);
  return `${days} d temu`;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) throw new Error("HTTP " + res.status);
      setAssets(await res.json());
    } catch {
      setError("Nie można wczytać biblioteki");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Dozwolone formaty: JPG, PNG, WebP");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Maksymalny rozmiar: 5 MB");
      return;
    }

    setUploading(true);
    try {
      const presign = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      }).then((r) => r.json());

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to R2 failed");

      const finalize = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: presign.publicUrl,
          storageKey: presign.storageKey,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!finalize.ok) throw new Error("Finalize failed");

      toast.success("Wgrano");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd uploadu");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(asset: MediaAsset) {
    if (
      !confirm(
        `Czy na pewno usunąć „${asset.filename ?? asset.storageKey}"? Operacja jest nieodwracalna.`,
      )
    )
      return;

    setDeleting(asset.id);
    try {
      const res = await fetch(`/api/admin/media/${asset.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      toast.success("Usunięto");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd usuwania");
    } finally {
      setDeleting(null);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano URL");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteka mediów</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Wszystkie obrazy wgrane przez admina. Można ich używać w ogłoszeniach
          i innych miejscach aplikacji.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2",
            "text-muted-foreground hover:bg-accent/40 transition-colors",
            uploading && "opacity-50 pointer-events-none",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Wgrywanie…</span>
            </>
          ) : (
            <>
              <Upload className="size-6" />
              <span className="text-sm">Wgraj nowy obraz (klik)</span>
              <span className="text-xs">JPG/PNG/WebP, max 5 MB</span>
            </>
          )}
        </button>
      </div>

      {assets === null ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="size-4 animate-spin" />
          Ładowanie…
        </div>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Brak wgranych obrazów.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="rounded-xl border bg-card/40 overflow-hidden flex flex-col"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.filename ?? ""}
                className="w-full aspect-[4/3] object-cover bg-muted"
                loading="lazy"
              />
              <div className="p-3 flex-1 flex flex-col gap-2 text-xs">
                <div className="font-medium truncate" title={asset.filename ?? ""}>
                  {asset.filename ?? "(bez nazwy)"}
                </div>
                <div className="text-muted-foreground">
                  {asset.contentType.split("/")[1].toUpperCase()} ·{" "}
                  {formatSize(asset.sizeBytes)} · {formatRelative(asset.uploadedAt)}
                </div>
                <div className="flex gap-1.5 mt-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => copyUrl(asset.url)}
                  >
                    <Copy className="size-3" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(asset)}
                    disabled={deleting === asset.id}
                  >
                    {deleting === asset.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Jako admin: `/admin/media`. Wgraj obraz JPG. Powinien pojawić się w gridzie. Kliknij „URL" — sprawdź clipboard. Kliknij usuń — confirm → znika.

- [ ] **Step 3: Commit**

```bash
git add app/admin/media/page.tsx
git commit -m "Add /admin/media library page"
```

---

## Task 9 — Aktualizacja AdminNav

**Files:**
- Modify: `components/admin/AdminNav.tsx`

- [ ] **Step 1: Dodaj dwie nowe pozycje nawigacji**

Otwórz `components/admin/AdminNav.tsx`. W importach z `lucide-react` dodaj `Megaphone` i `FolderOpen`:

```tsx
import { BarChart2, FileText, FolderOpen, Image as ImageIcon, Map as MapIcon, Megaphone, Tag as TagIcon, Target, Upload } from "lucide-react";
```

Rozszerz tablicę `NAV` o dwa wpisy. Wstaw je **między „Treści" a „Analityka"**, żeby zgrupować pola edycji treści:

```tsx
const NAV = [
  { href: "/admin/upload", label: "Upload", icon: Upload },
  { href: "/admin/photos", label: "Zdjęcia", icon: ImageIcon },
  { href: "/admin/tags", label: "Tagi", icon: TagIcon },
  { href: "/admin/map-settings", label: "Mapa", icon: MapIcon },
  { href: "/admin/scoring", label: "Punktacja", icon: Target },
  { href: "/admin/content", label: "Treści", icon: FileText },
  { href: "/admin/announcement", label: "Ogłoszenie", icon: Megaphone },
  { href: "/admin/media", label: "Media", icon: FolderOpen },
  { href: "/admin/analytics", label: "Analityka", icon: BarChart2 },
];
```

- [ ] **Step 2: Manual smoke test**

Otwórz `/admin` — w pasku nawigacji powinny być widoczne dwa nowe linki, klikalne, prowadzące do utworzonych stron. Aktywny stan (highlight) działa.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminNav.tsx
git commit -m "Add Ogłoszenie and Media links to admin nav"
```

---

## Task 10 — Komponent AnnouncementBanner

**Files:**
- Create: `components/AnnouncementBanner.tsx`

- [ ] **Step 1: Utwórz Server Component**

Create `components/AnnouncementBanner.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcement } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

export async function AnnouncementBanner() {
  const [row] = await db
    .select({
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl,
      ctaText: announcement.ctaText,
      ctaUrl: announcement.ctaUrl,
    })
    .from(announcement)
    .where(and(eq(announcement.id, 1), eq(announcement.visible, true)))
    .limit(1);

  if (!row) return null;

  const showCta = row.ctaText && row.ctaUrl;
  const isExternalCta = row.ctaUrl?.startsWith("http");

  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <div className="rounded-2xl border bg-card/60 backdrop-blur-md overflow-hidden">
        <div
          className={
            row.imageUrl
              ? "grid md:grid-cols-2 gap-0"
              : "grid grid-cols-1"
          }
        >
          {row.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.imageUrl}
              alt=""
              className="w-full h-full object-cover aspect-video md:aspect-auto"
            />
          )}
          <div className="p-6 sm:p-8 flex flex-col gap-3 justify-center">
            <h2 className="text-2xl font-bold tracking-tight">{row.title}</h2>
            <p className="text-base text-muted-foreground whitespace-pre-line">
              {row.body}
            </p>
            {showCta && (
              <div className="pt-2">
                <Button asChild variant="brand">
                  {isExternalCta ? (
                    <a
                      href={row.ctaUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.ctaText}
                      <ArrowRight />
                    </a>
                  ) : (
                    <Link href={row.ctaUrl!}>
                      {row.ctaText}
                      <ArrowRight />
                    </Link>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Weryfikacja TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/AnnouncementBanner.tsx
git commit -m "Add AnnouncementBanner RSC"
```

---

## Task 11 — Osadzenie banera na landing i leaderboard

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/leaderboard/page.tsx`

- [ ] **Step 1: Osadź banner w `app/page.tsx`**

Dodaj import na górze pliku:

```tsx
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
```

Wstaw `<AnnouncementBanner />` **między sekcją hero (`<section className="flex-1 flex flex-col items-center justify-center …">`) a sekcją „How"** (`<section className="px-4 sm:px-6 pb-20">`):

```tsx
        )}
      </section>

      <AnnouncementBanner />

      <section className="px-4 sm:px-6 pb-20">
```

- [ ] **Step 2: Osadź banner w `app/leaderboard/page.tsx`**

Dodaj import:

```tsx
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
```

Wstaw `<AnnouncementBanner />` **bezpośrednio po `<header>` a przed `<div className="w-full max-w-2xl mx-auto …">`**:

```tsx
      </header>

      <div className="pt-4">
        <AnnouncementBanner />
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
```

- [ ] **Step 3: Manual smoke test (end-to-end)**

1. SQL Editor: `UPDATE announcement SET visible = true WHERE id = 1;`
2. Otwórz `/` — banner widoczny między hero a sekcją "Jak to działa".
3. Otwórz `/leaderboard` — banner widoczny pod nagłówkiem.
4. Wgraj obraz przez `/admin/announcement`, ustaw, zapisz, odśwież `/` — banner ma obraz w 2-kolumnowym układzie na md+.
5. Usuń obraz, zapisz, odśwież — banner pokazuje tylko tekst (1-kolumnowy).
6. Wyczyść `ctaText` lub `ctaUrl`, zapisz — przycisk znika.
7. Wyłącz `visible`, odśwież — banner znika z `/` i `/leaderboard`.
8. Spróbuj `/admin/announcement` jako anonim → redirect.
9. `curl http://localhost:3000/api/admin/announcement` bez sesji → 403.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/leaderboard/page.tsx
git commit -m "Embed AnnouncementBanner on landing and leaderboard"
```

---

## Self-review checklist (do wykonania przed handoff)

- [ ] Wszystkie pliki ze spec'a (`docs/superpowers/specs/2026-05-06-announcement-banner-design.md`) są pokryte zadaniem.
- [ ] Zero placeholderów typu „TODO/TBD".
- [ ] Spójność typów: `MediaAsset` i `AnnouncementRow` z Task 1, używane w API i UI.
- [ ] R2 CORS — w punkcie smoke testu Task 8 (upload) sprawdzimy czy CORS dopuszcza PUT z localhost na `media/*`. Jeśli upload zwróci CORS error, zaktualizować konfigurację R2 (poza scope kodu, manual w panelu Cloudflare).
- [ ] Migracje uruchomione ręcznie w Supabase SQL Editor (workflow z `CLAUDE.md`).
