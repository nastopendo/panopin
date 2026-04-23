import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-950 text-white p-8">
      <h1 className="text-4xl font-bold tracking-tight">Panopin</h1>
      <p className="text-zinc-400 text-center max-w-sm">
        Odgaduj lokalizacje panoram 360° z okolicy. Im bliżej — tym więcej punktów.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/play/demo"
          className="px-6 py-3 bg-white text-zinc-900 rounded-xl font-semibold hover:bg-zinc-100 transition-colors text-center"
        >
          Zagraj (demo)
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:border-zinc-500 transition-colors text-center"
        >
          Zaloguj się
        </Link>
      </div>
    </main>
  );
}
