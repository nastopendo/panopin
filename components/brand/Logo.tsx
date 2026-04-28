import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { mark: "size-6", text: "text-sm" },
  md: { mark: "size-7", text: "text-base" },
  lg: { mark: "size-10", text: "text-xl" },
};

/**
 * Panopin wordmark.
 * The mark blends a map pin with a panorama-arc — orientation that distinguishes
 * Panopin from generic GeoGuessr clones at a glance.
 */
export function Logo({
  href = "/",
  className,
  showWordmark = true,
  size = "md",
}: LogoProps) {
  const sizes = sizeMap[size];
  const Mark = (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg",
        "bg-gradient-to-br from-brand to-brand/60 text-brand-foreground",
        "shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--color-brand)_60%,transparent)]",
        sizes.mark,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3/5"
      >
        <path d="M3 13a9 9 0 0 1 18 0" />
        <circle cx="12" cy="14.5" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        sizes.text,
        className,
      )}
    >
      {Mark}
      {showWordmark && <span>Panopin</span>}
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </Link>
  );
}
