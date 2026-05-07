import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { announcement } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { isSafeHttpUrl } from "@/lib/url";

const safeHttpUrl = z.string().url().refine(isSafeHttpUrl, {
  message: "URL musi używać protokołu http lub https",
});

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
  body: z.string().min(1).max(5000),
  imageUrl: safeHttpUrl.nullable(),
  ctaText: z.string().max(60).nullable(),
  ctaUrl: safeHttpUrl.nullable(),
  visible: z.boolean(),
  showOnHome: z.boolean(),
  showOnLeaderboard: z.boolean(),
  showAsPopup: z.boolean(),
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

  const data = { ...parse.data, body: sanitizeRichText(parse.data.body) };

  await db
    .insert(announcement)
    .values({ id: 1, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: announcement.id,
      set: { ...data, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
