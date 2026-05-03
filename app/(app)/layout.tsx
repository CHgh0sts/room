import Link from "next/link";
import { redirect } from "next/navigation";
import { Box } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/projects" className="flex items-center gap-2 font-medium">
            <Box className="size-5 text-accent" />
            <span>Room3D</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
