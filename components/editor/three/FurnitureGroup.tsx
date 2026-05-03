"use client";

import { useEditor } from "@/store/editor";
import FurnitureMesh from "./FurnitureMesh";

export default function FurnitureGroup() {
  const items = useEditor((s) => s.scene.furniture);
  return (
    <group>
      {items.map((f) => (
        <FurnitureMesh key={f.id} furniture={f} />
      ))}
    </group>
  );
}
