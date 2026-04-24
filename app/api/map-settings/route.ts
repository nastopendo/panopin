import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { mapSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEFAULTS = {
  centerLat: 52.0,
  centerLng: 19.5,
  defaultZoom: 5,
  mapStyle: "street" as const,
};

export async function GET() {
  const [row] = await db.select().from(mapSettings).where(eq(mapSettings.id, 1)).limit(1);
  return NextResponse.json(row ?? DEFAULTS);
}
