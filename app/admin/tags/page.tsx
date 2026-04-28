"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
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
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    const res = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTagList((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Tagi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tagi pomagają graczom filtrować rundy po tematyce.
        </p>
      </header>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tag-name">Nazwa tagu</Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Stare miasto"
              />
              {name && (
                <p className="text-xs text-muted-foreground">
                  slug: <span className="font-mono">{slugify(name)}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Kolor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Kolor ${c}`}
                    onClick={() => setColor(c)}
                    className={cn(
                      "size-8 rounded-full transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                        : "hover:scale-105",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              Dodaj tag
            </Button>
          </form>
        </CardContent>
      </Card>

      {tagList.length === 0 ? (
        <div className="rounded-xl border bg-card/40 p-10 text-center">
          <TagIcon
            className="size-8 mx-auto text-muted-foreground/40 mb-3"
            strokeWidth={1.4}
          />
          <p className="text-muted-foreground text-sm">Brak tagów.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tagList.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3"
            >
              <span
                className="size-3 rounded-full shrink-0 ring-1 ring-inset ring-foreground/10"
                style={{ background: tag.color }}
              />
              <span className="flex-1 font-medium text-sm truncate">{tag.name}</span>
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                {tag.slug}
              </span>
              <Button
                onClick={() => setPendingDelete(tag)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Usuń tag ${tag.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć tag?</DialogTitle>
            <DialogDescription>
              Tag <strong className="text-foreground">{pendingDelete?.name}</strong> zostanie usunięty. Powiązania ze zdjęciami też.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 />
              Usuń tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
