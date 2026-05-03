import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room3D — Éditeur de pièces",
  description:
    "Modélisez votre pièce et simulez la disposition de vos meubles en 3D.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-bg text-text" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
