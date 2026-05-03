import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sceneStateSchema } from "@/lib/scene/schema";
import EditorShell from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, userId: true, name: true, data: true },
  });
  if (!project || project.userId !== user.id) notFound();

  let scene;
  try {
    scene = sceneStateSchema.parse(JSON.parse(project.data));
  } catch {
    notFound();
  }

  return (
    <EditorShell
      projectId={project.id}
      projectName={project.name}
      initialScene={scene}
    />
  );
}
