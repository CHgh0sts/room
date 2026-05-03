"use client";

import { useEditor, getWallColor, isWallHidden } from "@/store/editor";
import { WALL_IDS } from "@/lib/scene/schema";
import WallWithOpenings from "./WallWithOpenings";
import ShelfMesh from "./ShelfMesh";

export default function RoomMesh() {
  const scene = useEditor((s) => s.scene);
  const setSelection = useEditor((s) => s.setSelection);
  const { room } = scene;

  return (
    <group>
      {/* Sol */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ kind: "room" });
        }}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={room.floorColor} roughness={0.95} />
      </mesh>

      {/* Murs */}
      {WALL_IDS.map((wallId) =>
        isWallHidden(scene, wallId) ? null : (
          <WallWithOpenings
            key={wallId}
            wallId={wallId}
            color={getWallColor(scene, wallId)}
          />
        ),
      )}

      {/* Étagères encastrées (masquées si leur mur l'est) */}
      {scene.shelves.map((shelf) =>
        isWallHidden(scene, shelf.wallId) ? null : (
          <ShelfMesh key={shelf.id} shelf={shelf} />
        ),
      )}
    </group>
  );
}
