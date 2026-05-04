"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, FileText, Image as ImageIcon, Map as MapIcon, Tag as TagIcon, Target, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/upload", label: "Upload", icon: Upload },
  { href: "/admin/photos", label: "Zdjęcia", icon: ImageIcon },
  { href: "/admin/tags", label: "Tagi", icon: TagIcon },
  { href: "/admin/map-settings", label: "Mapa", icon: MapIcon },
  { href: "/admin/scoring", label: "Punktacja", icon: Target },
  { href: "/admin/content", label: "Treści", icon: FileText },
  { href: "/admin/analytics", label: "Analityka", icon: BarChart2 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="px-4 sm:px-6 -mb-px overflow-x-auto">
      <ul className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-t-lg px-3 sm:px-4 py-2.5 text-sm transition-colors border-b-2 whitespace-nowrap",
                  active
                    ? "text-foreground border-brand font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-transparent",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
