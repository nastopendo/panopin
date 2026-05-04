import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { siteContent } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/server";
import { DEFAULT_CONTENT, CONTENT_META } from "@/lib/content";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db.select().from(siteContent);
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const entries = Object.keys(DEFAULT_CONTENT).map((key) => ({
    key,
    value: overrides[key] ?? DEFAULT_CONTENT[key as keyof typeof DEFAULT_CONTENT],
    defaultValue: DEFAULT_CONTENT[key as keyof typeof DEFAULT_CONTENT],
    isDefault: !(key in overrides),
    meta: CONTENT_META[key] ?? { section: "Inne", label: key },
  }));

  return NextResponse.json(entries);
}

const PutSchema = z.array(
  z.object({
    key: z.string().min(1).max(100),
    value: z.string().max(2000),
  }),
);

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = PutSchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body", details: parse.error }, { status: 400 });
  }

  const validKeys = new Set(Object.keys(DEFAULT_CONTENT));
  const rows = parse.data.filter((r) => validKeys.has(r.key));

  if (rows.length > 0) {
    await db
      .insert(siteContent)
      .values(rows.map((r) => ({ key: r.key, value: r.value, updatedAt: new Date() })))
      .onConflictDoUpdate({
        target: siteContent.key,
        set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
      });
  }

  return NextResponse.json({ ok: true, updated: rows.length });
}

const DeleteSchema = z.object({ key: z.string() });

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = DeleteSchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  await db.delete(siteContent).where(eq(siteContent.key, parse.data.key));

  return NextResponse.json({ ok: true });
}
