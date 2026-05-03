"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { SceneState } from "@/lib/scene/schema";
import { useEditor } from "@/store/editor";
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import PropertiesPanel from "./PropertiesPanel";
import { useAutosave } from "./useAutosave";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

const SceneViewport = dynamic(() => import("./views/SceneViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-text-muted">
      Chargement du moteur 3D…
    </div>
  ),
});

export default function EditorShell({
  projectId,
  projectName,
  initialScene,
}: {
  projectId: string;
  projectName: string;
  initialScene: SceneState;
}) {
  const init = useEditor((s) => s.init);

  useEffect(() => {
    init({ projectId, name: projectName, scene: initialScene });
  }, [init, projectId, projectName, initialScene]);

  useAutosave();
  useKeyboardShortcuts();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <div className="flex-1 relative bg-bg">
          <SceneViewport />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
