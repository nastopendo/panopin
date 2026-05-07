import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcement } from "@/lib/db/schema";
import { AnnouncementBannerClient } from "./AnnouncementBannerClient";

interface AnnouncementBannerProps {
  placement: "home" | "leaderboard";
}

export async function AnnouncementBanner({ placement }: AnnouncementBannerProps) {
  const [row] = await db
    .select({
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl,
      ctaText: announcement.ctaText,
      ctaUrl: announcement.ctaUrl,
      showOnHome: announcement.showOnHome,
      showOnLeaderboard: announcement.showOnLeaderboard,
      updatedAt: announcement.updatedAt,
    })
    .from(announcement)
    .where(and(eq(announcement.id, 1), eq(announcement.visible, true)))
    .limit(1);

  if (!row) return null;

  if (placement === "home" && !row.showOnHome) return null;
  if (placement === "leaderboard" && !row.showOnLeaderboard) return null;

  return (
    <AnnouncementBannerClient
      title={row.title}
      body={row.body}
      imageUrl={row.imageUrl}
      ctaText={row.ctaText}
      ctaUrl={row.ctaUrl}
      updatedAt={row.updatedAt.toISOString()}
    />
  );
}
