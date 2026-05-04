"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Map,
  Save,
  Loader2,
  Check,
  Move3d,
  Rotate3d,
} from "lucide-react";
import { useEditor } from "@/store/editor";

export default function Toolbar() {
  const projectName = useEditor((s) => s.projectName);
  const setProjectName = useEditor((s) => s.setProjectName);
  const viewMode = useEditor((s) => s.viewMode);
  const setViewMode = useEditor((s) => s.setViewMode);
  const isDirty = useEditor((s) => s.isDirty);
  const isSaving = useEditor((s) => s.isSaving);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);

  const status = isSaving
    ? "Enregistrement…"
    : isDirty
      ? "Modifications non enregistrées"
      : lastSavedAt
        ? "Enregistré"
        : "";

  return (
    <div className="border-b border-border bg-bg-soft">
      <div className="px-4 py-2 flex items-center gap-4">
        <Link
          href="/projects"
          className="btn-ghost"
          aria-label="Retour aux projets"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent border-0 outline-none font-medium text-text px-2 py-1 rounded hover:bg-bg-panel focus:bg-bg-panel min-w-0 max-w-xs"
        />
        <div className="flex-1" />
        <TransformModeToggle />
        <div className="text-xs text-text-muted flex items-center gap-1.5 mr-2">
          {isSaving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : !isDirty && lastSavedAt ? (
            <Check className="size-3 text-emerald-400" />
          ) : null}
          <span>{status}</span>
        </div>
        <div className="flex items-center gap-1 panel rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-sm rounded ${viewMode === "3d" ? "bg-bg text-text" : "text-text-muted hover:text-text"}`}
          >
            <Box className="size-4" />
            3D
          </button>
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-sm rounded ${viewMode === "2d" ? "bg-bg text-text" : "text-text-muted hover:text-text"}`}
          >
            <Map className="size-4" />
            Plan 2D
          </button>
        </div>
        <SaveButton />
      </div>
    </div>
  );
}

function TransformModeToggle() {
  const selection = useEditor((s) => s.selection);
  const scene = useEditor((s) => s.scene);
  const viewMode = useEditor((s) => s.viewMode);
  const transformMode = useEditor((s) => s.transformMode);
  const setTransformMode = useEditor((s) => s.setTransformMode);
  if (viewMode !== "3d" || selection?.kind !== "furniture") return null;
  const fu = scene.furniture.find((x) => x.id === selection.id);
  if (fu?.hidden) return null;
  return (
    <div className="flex items-center gap-1 panel rounded-md p-0.5">
      <button
        type="button"
        onClick={() => setTransformMode("translate")}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-sm rounded ${transformMode === "translate" ? "bg-bg text-text" : "text-text-muted hover:text-text"}`}
        title="Déplacer (T)"
      >
        <Move3d className="size-4" />
        Déplacer
      </button>
      <button
        type="button"
        onClick={() => setTransformMode("rotate")}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-sm rounded ${transformMode === "rotate" ? "bg-bg text-text" : "text-text-muted hover:text-text"}`}
        title="Pivoter (R)"
      >
        <Rotate3d className="size-4" />
        Pivoter
      </button>
    </div>
  );
}

function SaveButton() {
  const isDirty = useEditor((s) => s.isDirty);
  const isSaving = useEditor((s) => s.isSaving);
  return (
    <button
      type="button"
      className="btn"
      disabled={!isDirty || isSaving}
      onClick={() => {
        // déclenche un autosave immédiat via un évènement personnalisé
        window.dispatchEvent(new Event("editor:save-now"));
      }}
    >
      <Save className="size-4" />
      Enregistrer
    </button>
  );
}
