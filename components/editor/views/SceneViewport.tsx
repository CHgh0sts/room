"use client";

import { useEditor } from "@/store/editor";
import Scene3D from "./Scene3D";
import Scene2D from "./Scene2D";

export default function SceneViewport() {
  const viewMode = useEditor((s) => s.viewMode);
  return (
    <div className="absolute inset-0">
      {viewMode === "3d" ? <Scene3D /> : <Scene2D />}
    </div>
  );
}
