"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserNav() {
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && !user.is_anonymous) {
        setEmail(user.email ?? null);
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setName(
            data.displayName ??
              user.user_metadata?.full_name ??
              user.email ??
              "Gracz",
          );
        } else {
          setName(user.user_metadata?.full_name ?? user.email ?? "Gracz");
        }
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDialog() {
    setInputValue(name ?? "");
    setError(null);
    setDialogOpen(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  async function handleSave() {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Nick musi mieć od 2 do 30 znaków");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      setName(trimmed);
      setDialogOpen(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Błąd zapisu");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    setName(null);
    setEmail(null);
  }

  if (!loaded) {
    return <div className="size-9" aria-hidden />;
  }

  if (!name) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <User className="size-4" />
        Zaloguj się
      </Link>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menu użytkownika"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-transform hover:scale-105"
        >
          <Avatar>
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal normal-case tracking-normal">
            <div className="flex flex-col space-y-0.5 py-0.5">
              <p className="text-sm font-medium truncate">{name}</p>
              {email && (
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openDialog}>
            <Pencil />
            Zmień nick
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut />
            Wyloguj
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Zmień nick</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Nick w rankingu</Label>
              <Input
                id="display-name"
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                maxLength={30}
                placeholder="Twój nick"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                {inputValue.trim().length}/30 znaków
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Anuluj
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Zapisuję…" : "Zapisz"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
