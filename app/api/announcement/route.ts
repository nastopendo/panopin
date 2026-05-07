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
      showOnHome: announcement.showOnHome,
      showOnLeaderboard: announcement.showOnLeaderboard,
      showAsPopup: announcement.showAsPopup,
      updatedAt: announcement.updatedAt,
    })
    .from(announcement)
    .where(and(eq(announcement.id, 1), eq(announcement.visible, true)))
    .limit(1);

  return NextResponse.json(row ?? null);
}
