"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useEditor, getWallSlope } from "@/store/editor";
import { type WallId, wallLength, wallHeightAt } from "@/lib/scene/schema";
import { WALL_THICKNESS, getWallTransform } from "@/lib/scene/geometry";

export default function WallWithOpenings({
  wallId,
  color,
}: {
  wallId: WallId;
  color: string;
}) {
  const scene = useEditor((s) => s.scene);
  const setSelection = useEditor((s) => s.setSelection);
  const selection = useEditor((s) => s.selection);

  const room = scene.room;
  const wl = wallLength(room, wallId);
  const transform = getWallTransform(room, wallId);
  const slope = getWallSlope(scene, wallId);

  const openings = useMemo(
    () => scene.openings.filter((o) => o.wallId === wallId),
    [scene.openings, wallId],
  );

  const geometry = useMemo(() => {
    // Construction du shape du mur dans son repère local : x in [-wl/2, +wl/2],
    // y in [0, hauteur]. Sans pente : rectangle. Avec pente : trapèze dont le
    // sommet (gauche/droite) suit `slope.leftHeight` / `slope.rightHeight`.
    const shape = new THREE.Shape();
    const halfW = wl / 2;
    const hLeft = slope ? slope.leftHeight : room.height;
    const hRight = slope ? slope.rightHeight : room.height;
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(halfW, hRight);
    shape.lineTo(-halfW, hLeft);
    shape.lineTo(-halfW, 0);

    for (const o of openings) {
      // Clamp pour rester dans le mur.
      const ox = Math.max(0, Math.min(wl - o.width, o.x));
      const ow = Math.min(o.width, wl - ox);
      // Hauteur disponible localement : on prend le min des hauteurs aux deux
      // bords X de l'ouverture pour que le trou reste sous la pente.
      const localHMin = Math.min(
        wallHeightAt(room, wallId, slope, ox),
        wallHeightAt(room, wallId, slope, ox + ow),
      );
      const oy =
        o.kind === "door"
          ? 0
          : Math.max(0, Math.min(localHMin - o.height, o.y));
      const oh = Math.min(o.height, localHMin - oy);
      if (ow <= 0 || oh <= 0) continue;
      const x0 = ox - halfW;
      const x1 = x0 + ow;
      const y0 = oy;
      const y1 = oy + oh;
      const hole = new THREE.Path();
      hole.moveTo(x0, y0);
      hole.lineTo(x1, y0);
      hole.lineTo(x1, y1);
      hole.lineTo(x0, y1);
      hole.lineTo(x0, y0);
      shape.holes.push(hole);
    }

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: WALL_THICKNESS,
      bevelEnabled: false,
      curveSegments: 1,
    });
    // Re-centre l'épaisseur autour de Z=0 pour pouvoir attacher des étagères proprement.
    geom.translate(0, 0, -WALL_THICKNESS / 2);
    geom.computeVertexNormals();
    return geom;
  }, [openings, room, wallId, slope, wl]);

  // Cleanup geometry on unmount / change
  // useEffect(() => () => geometry.dispose(), [geometry]);

  const isWallSelected = selection?.kind === "wall" && selection.id === wallId;

  return (
    <group position={transform.position} rotation={[0, transform.rotationY, 0]}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ kind: "wall", id: wallId });
        }}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          side={THREE.DoubleSide}
          emissive={isWallSelected ? "#7c8cff" : "#000000"}
          emissiveIntensity={isWallSelected ? 0.06 : 0}
        />
      </mesh>

      {/* Cadres d'ouvertures pour mieux les voir */}
      {openings.map((o) => {
        const ox = Math.max(0, Math.min(wl - o.width, o.x));
        const ow = Math.min(o.width, wl - ox);
        const localHMin = Math.min(
          wallHeightAt(room, wallId, slope, ox),
          wallHeightAt(room, wallId, slope, ox + ow),
        );
        const oy =
          o.kind === "door"
            ? 0
            : Math.max(0, Math.min(localHMin - o.height, o.y));
        const cx = ox + o.width / 2 - wl / 2;
        const cy = oy + o.height / 2;
        const isSel =
          selection?.kind === "opening" && selection.id === o.id;
        return (
          <mesh
            key={o.id}
            position={[cx, cy, 0]}
            onClick={(e) => {
              e.stopPropagation();
              setSelection({ kind: "opening", id: o.id });
            }}
          >
            <boxGeometry
              args={[o.width, o.height, WALL_THICKNESS + 0.001]}
            />
            <meshStandardMaterial
              color={o.kind === "window" ? "#9ec7ff" : "#6b4f3a"}
              transparent={o.kind === "window"}
              opacity={o.kind === "window" ? 0.35 : 1}
              roughness={0.4}
              metalness={0}
              emissive={isSel ? "#7c8cff" : "#000000"}
              emissiveIntensity={isSel ? 0.5 : 0}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
