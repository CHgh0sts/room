import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ProjectActions from "./ProjectActions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true },
  });

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Mes projets</h1>
          <p className="text-text-muted text-sm mt-1">
            Créez ou ouvrez un projet pour modéliser votre pièce.
          </p>
        </div>
        <ProjectActions />
      </div>

      {projects.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-text-muted">
            Vous n’avez pas encore de projet. Cliquez sur « Nouveau projet »
            pour commencer.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <li key={p.id} className="card p-5 flex flex-col">
              <Link
                href={`/projects/${p.id}`}
                className="font-medium text-text hover:text-accent"
              >
                {p.name}
              </Link>
              <p className="text-xs text-text-dim mt-2">
                Modifié le{" "}
                {new Date(p.updatedAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <Link href={`/projects/${p.id}`} className="btn">
                  Ouvrir
                </Link>
                <ProjectActions projectId={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
