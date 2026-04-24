import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-zinc-900">
            Panopin
          </Link>
          <span className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded font-medium">
            ADMIN
          </span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/upload" className="text-zinc-600 hover:text-zinc-900">
              Upload
            </Link>
            <Link href="/admin/photos" className="text-zinc-600 hover:text-zinc-900">
              Zdjęcia
            </Link>
            <Link href="/admin/tags" className="text-zinc-600 hover:text-zinc-900">
              Tagi
            </Link>
            <Link href="/admin/map-settings" className="text-zinc-600 hover:text-zinc-900">
              Mapa
            </Link>
          </nav>
        </div>
        <div className="text-xs text-zinc-500">{admin.email}</div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
