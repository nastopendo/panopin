import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(tags).where(eq(tags.id, id));
  return new NextResponse(null, { status: 204 });
}
