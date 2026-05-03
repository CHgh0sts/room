"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export default function ProjectActions({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (projectId) {
    return (
      <button
        type="button"
        className="btn-ghost text-red-400 hover:text-red-300"
        disabled={busy}
        onClick={async () => {
          if (!confirm("Supprimer ce projet ?")) return;
          setBusy(true);
          try {
            await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
        aria-label="Supprimer le projet"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn-primary"
      disabled={busy}
      onClick={async () => {
        const name = prompt("Nom du projet :", "Nouvelle pièce");
        if (!name?.trim()) return;
        setBusy(true);
        try {
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
          });
          if (!res.ok) {
            alert("Impossible de créer le projet.");
            return;
          }
          const { project } = await res.json();
          router.push(`/projects/${project.id}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Plus className="size-4" />
      Nouveau projet
    </button>
  );
}
