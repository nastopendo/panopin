import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { mapSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

const DEFAULTS = { centerLat: 52.0, centerLng: 19.5, defaultZoom: 5, mapStyle: "street" as const };

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [row] = await db.select().from(mapSettings).where(eq(mapSettings.id, 1)).limit(1);
  return NextResponse.json(row ?? DEFAULTS);
}

const BodySchema = z.object({
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  defaultZoom: z.number().min(1).max(20),
  mapStyle: z.enum(["street", "satellite"]),
});

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body", details: parse.error }, { status: 400 });
  }

  const data = parse.data;

  await db
    .insert(mapSettings)
    .values({ id: 1, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: mapSettings.id,
      set: { ...data, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
