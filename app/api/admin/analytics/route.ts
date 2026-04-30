import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { fetchAnalytics } from "@/lib/admin/analytics-data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchAnalytics();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[admin/analytics] fetch failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
