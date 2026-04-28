import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 sm:px-6 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
      <span>© {new Date().getFullYear()} Panopin · Projekt open-source (MIT)</span>
      <nav className="flex items-center gap-4 flex-wrap justify-center">
        <Link href="/leaderboard" className="hover:text-foreground transition-colors">
          Ranking
        </Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Regulamin
        </Link>
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          Prywatność
        </Link>
        <Link href="/cookies" className="hover:text-foreground transition-colors">
          Cookies
        </Link>
      </nav>
    </footer>
  );
}
