import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

const createSchema = z.object({
  name: z.string().min(1).max(40),
  slug: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, "Slug: tylko małe litery, cyfry i myślniki"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Kolor musi być w formacie #rrggbb"),
});

export async function GET() {
  const list = await db.select().from(tags).orderBy(tags.name);
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, slug, color } = parsed.data;

  const existing = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1);
  if (existing.length > 0) return NextResponse.json({ error: "Slug jest już zajęty" }, { status: 409 });

  const [tag] = await db.insert(tags).values({ name, slug, color }).returning();
  return NextResponse.json(tag, { status: 201 });
}
