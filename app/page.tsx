import Link from "next/link";
import { UserNav } from "@/components/UserNav";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 shrink-0">
        <span className="font-bold">Panopin</span>
        <div className="flex items-center gap-5">
          <Link
            href="/leaderboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Ranking
          </Link>
          <UserNav />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">Panopin</h1>
        <p className="text-zinc-400 text-center max-w-sm">
          Odgaduj lokalizacje panoram 360° z okolicy. Im bliżej — tym więcej punktów.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/play"
            className="px-6 py-3 bg-white text-zinc-900 rounded-xl font-semibold hover:bg-zinc-100 transition-colors text-center"
          >
            Zagraj
          </Link>
          <Link
            href="/leaderboard"
            className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:border-zinc-500 transition-colors text-center"
          >
            Ranking
          </Link>
        </div>
      </div>
    </main>
  );
}
