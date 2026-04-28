import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return NextResponse.json({ displayName: profile?.displayName ?? null });
}

const patchSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Nick musi mieć co najmniej 2 znaki")
    .max(30, "Nick może mieć maksymalnie 30 znaków"),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  await db
    .update(profiles)
    .set({ displayName: parsed.data.displayName })
    .where(eq(profiles.id, user.id));

  return NextResponse.json({ displayName: parsed.data.displayName });
}
