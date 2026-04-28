"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl bg-card/95 border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl backdrop-blur-md pointer-events-auto">
        <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
          Używamy plików cookies niezbędnych do działania serwisu (sesja logowania,
          preferencje).{" "}
          <Link
            href="/cookies"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Dowiedz się więcej
          </Link>
          .
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Rozumiem
        </button>
      </div>
    </div>
  );
}
