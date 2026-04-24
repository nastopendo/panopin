"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Photo {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
  tagIds: string[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
};

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/photos").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ]).then(([photosData, tagsData]) => {
      setPhotos(photosData);
      setTags(tagsData);
    });
  }, []);

  async function patchPhoto(id: string, patch: { difficulty?: string; tagIds?: string[] }) {
    setSaving(id);
    await fetch(`/api/admin/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(null);
  }

  function updateDifficulty(id: string, difficulty: "easy" | "medium" | "hard") {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, difficulty } : p)));
    patchPhoto(id, { difficulty });
  }

  function toggleTag(photoId: string, tagId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const tagIds = photo.tagIds.includes(tagId)
      ? photo.tagIds.filter((t) => t !== tagId)
      : [...photo.tagIds, tagId];
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, tagIds } : p)));
    patchPhoto(photoId, { tagIds });
  }

  async function deletePhoto(id: string) {
    if (!confirm("Na pewno usunąć to zdjęcie?")) return;
    await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zdjęcia ({photos.length})</h1>
        <Link
          href="/admin/upload"
          className="bg-zinc-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-zinc-700 transition-colors"
        >
          + Dodaj zdjęcie
        </Link>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-500">
          Brak zdjęć.{" "}
          <Link href="/admin/upload" className="text-zinc-900 underline">
            Dodaj pierwsze
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((p) => (
            <div key={p.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              {p.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnailUrl}
                  alt={p.title ?? "panorama"}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-3 space-y-2">
                <div className="font-medium text-sm truncate">{p.title ?? "(bez tytułu)"}</div>
                <div className="text-xs text-zinc-500">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </div>

                {/* Difficulty select */}
                <select
                  value={p.difficulty}
                  onChange={(e) =>
                    updateDifficulty(p.id, e.target.value as "easy" | "medium" | "hard")
                  }
                  disabled={saving === p.id}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-2 py-1 outline-none focus:border-zinc-400 disabled:opacity-50"
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>

                {/* Tags expand toggle */}
                {tags.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedId((prev) => (prev === p.id ? null : p.id))}
                      className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                    >
                      {expandedId === p.id ? "▲ Tagi" : `▼ Tagi (${p.tagIds.length})`}
                    </button>
                    {expandedId === p.id && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(p.id, tag.id)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-opacity ${
                              p.tagIds.includes(tag.id) ? "opacity-100" : "opacity-30"
                            }`}
                            style={{ background: tag.color + "33", color: tag.color, border: `1px solid ${tag.color}` }}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString("pl")}
                  </span>
                  <button
                    onClick={() => deletePhoto(p.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
