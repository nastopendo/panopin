import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";

function getInitials(value: string | null | undefined): string {
  if (!value) return "??";
  return value.slice(0, 2).toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="md" />
            <Badge variant="brand" className="uppercase tracking-wider">
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {admin.email}
            </span>
            <Avatar className="size-8">
              <AvatarFallback className="text-[10px]">
                {getInitials(admin.email)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
