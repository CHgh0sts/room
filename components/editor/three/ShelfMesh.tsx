"use client";

import { useEditor } from "@/store/editor";
import { type Shelf, wallLength } from "@/lib/scene/schema";
import { WALL_THICKNESS, getWallTransform } from "@/lib/scene/geometry";

export default function ShelfMesh({ shelf }: { shelf: Shelf }) {
  const room = useEditor((s) => s.scene.room);
  const setSelection = useEditor((s) => s.setSelection);
  const selection = useEditor((s) => s.selection);

  const wl = wallLength(room, shelf.wallId);
  const t = getWallTransform(room, shelf.wallId);

  const ox = Math.max(0, Math.min(wl - shelf.width, shelf.x));
  const oy = Math.max(0, Math.min(room.height - shelf.height, shelf.y));

  // Centre dans le repère local du mur (origine au centre du mur, intérieur = -Z)
  const cx = ox + shelf.width / 2 - wl / 2;
  const cy = oy + shelf.height / 2;
  // L'étagère pointe vers l'intérieur (-Z local). On la place à -shelf.depth/2 - WT/2.
  const cz = -shelf.depth / 2 - WALL_THICKNESS / 2;

  const isSel = selection?.kind === "shelf" && selection.id === shelf.id;

  return (
    <group position={t.position} rotation={[0, t.rotationY, 0]}>
      <mesh
        position={[cx, cy, cz]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ kind: "shelf", id: shelf.id });
        }}
      >
        <boxGeometry args={[shelf.width, shelf.height, shelf.depth]} />
        <meshStandardMaterial
          color={shelf.color}
          roughness={0.85}
          emissive={isSel ? "#7c8cff" : "#000000"}
          emissiveIntensity={isSel ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
}
