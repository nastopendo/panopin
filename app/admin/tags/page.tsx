"use client";

import { useEffect, useState } from "react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminTagsPage() {
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then(setTagList)
      .catch(() => setError("Nie można wczytać tagów"));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const slug = slugify(name);
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug, color }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Błąd zapisu");
    } else {
      setTagList((prev) => [...prev, data]);
      setName("");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Na pewno usunąć ten tag?")) return;
    const res = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTagList((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Tagi</h1>

      {/* Add tag form */}
      <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="text-sm font-medium text-zinc-700">Dodaj nowy tag</div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Nazwa tagu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <div className="flex gap-1 items-center">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-zinc-400 scale-110" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {saving ? "…" : "Dodaj"}
          </button>
        </div>
        {name && (
          <div className="text-xs text-zinc-400">
            slug: <span className="font-mono">{slugify(name)}</span>
          </div>
        )}
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </form>

      {/* Tag list */}
      {tagList.length === 0 ? (
        <div className="text-zinc-500 text-sm text-center py-8">Brak tagów.</div>
      ) : (
        <div className="space-y-2">
          {tagList.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: tag.color }}
              />
              <span className="flex-1 font-medium text-sm">{tag.name}</span>
              <span className="text-xs text-zinc-400 font-mono">{tag.slug}</span>
              <button
                onClick={() => handleDelete(tag.id)}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors ml-2"
              >
                Usuń
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
