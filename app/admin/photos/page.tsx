import { db } from "@/lib/db/client";
import { photos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function AdminPhotosPage() {
  const list = await db.select().from(photos).orderBy(desc(photos.createdAt));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zdjęcia ({list.length})</h1>
        <Link
          href="/admin/upload"
          className="bg-zinc-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-zinc-700 transition-colors"
        >
          + Dodaj zdjęcie
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-500">
          Brak zdjęć. <Link href="/admin/upload" className="text-zinc-900 underline">Dodaj pierwsze</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <div key={p.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              {p.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnailUrl} alt={p.title ?? "panorama"} className="w-full h-32 object-cover" />
              )}
              <div className="p-3 space-y-1">
                <div className="font-medium text-sm truncate">{p.title ?? "(bez tytułu)"}</div>
                <div className="text-xs text-zinc-500">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · {p.difficulty}
                </div>
                <div className="text-xs text-zinc-400">
                  {new Date(p.createdAt).toLocaleDateString("pl")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
