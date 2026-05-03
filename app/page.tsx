import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Box, LogIn, UserPlus } from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Box className="size-5 text-accent" />
            <span>Room3D</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <Link href="/projects" className="btn">
                Mes projets
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">
                  <LogIn className="size-4" /> Connexion
                </Link>
                <Link href="/register" className="btn-primary">
                  <UserPlus className="size-4" /> Créer un compte
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="flex-1 flex items-center">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Modélisez votre pièce, placez vos meubles, visualisez l’espace.
          </h1>
          <p className="mt-6 text-text-muted text-lg">
            Un éditeur 3D minimaliste pour dessiner les murs, fenêtres et portes
            de votre pièce, puis simuler la disposition de vos meubles à l’aide
            de formes géométriques simples paramétrables.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            {user ? (
              <Link href="/projects" className="btn-primary">
                Ouvrir mes projets
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary">
                  Commencer gratuitement
                </Link>
                <Link href="/login" className="btn">
                  J’ai déjà un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
