import Link from "next/link";
import { Box } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 text-text-muted hover:text-text"
      >
        <Box className="size-5 text-accent" />
        <span className="font-medium">Room3D</span>
      </Link>
      <div className="w-full max-w-sm card p-6">{children}</div>
    </main>
  );
}
