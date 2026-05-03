"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { TransformControls } from "@react-three/drei";
import { useEditor } from "@/store/editor";
import type { Furniture, FurniturePart } from "@/lib/scene/schema";
import { getPresetDefaultDims } from "@/lib/scene/presets";

export default function FurnitureMesh({ furniture }: { furniture: Furniture }) {
  const groupRef = useRef<THREE.Group>(null);
  const setSelection = useEditor((s) => s.setSelection);
  const setSelectedPartIndex = useEditor((s) => s.setSelectedPartIndex);
  const updateFurniture = useEditor((s) => s.updateFurniture);
  const selection = useEditor((s) => s.selection);
  const transformMode = useEditor((s) => s.transformMode);
  const selectedPartIndex = useEditor((s) => s.selectedPartIndex);

  const isSelected =
    selection?.kind === "furniture" && selection.id === furniture.id;

  const cx = furniture.x;
  const cy = furniture.y;
  const cz = furniture.z;

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(cx, cy, cz);
    groupRef.current.rotation.set(
      furniture.rotationX,
      furniture.rotationY,
      furniture.rotationZ,
    );
  }, [cx, cy, cz, furniture.rotationX, furniture.rotationY, furniture.rotationZ]);

  const hasParts = furniture.parts && furniture.parts.length > 0;
  const onSelect = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelection({ kind: "furniture", id: furniture.id });
  };

  // Facteur d'échelle des parties si l'utilisateur a redimensionné le bbox.
  // Référence : partsRef stocké à la création, ou défauts du preset si absent.
  const partsScale = useMemo<[number, number, number]>(() => {
    if (!hasParts) return [1, 1, 1];
    const ref =
      furniture.partsRef ??
      (furniture.presetId ? getPresetDefaultDims(furniture.presetId) : null);
    if (!ref) return [1, 1, 1];
    return [
      furniture.width / ref.width,
      furniture.height / ref.height,
      furniture.depth / ref.depth,
    ];
  }, [
    hasParts,
    furniture.partsRef,
    furniture.presetId,
    furniture.width,
    furniture.height,
    furniture.depth,
  ]);

  return (
    <>
      <group
        ref={groupRef}
        position={[cx, cy, cz]}
        rotation={[furniture.rotationX, furniture.rotationY, furniture.rotationZ]}
      >
        {hasParts ? (
          <group scale={partsScale}>
            {furniture.parts!.map((part, i) => (
              <PartMesh
                key={i}
                part={part}
                fallbackColor={furniture.color}
                isSelected={isSelected}
                highlighted={isSelected && selectedPartIndex === i}
                onSelect={(e) => {
                  e.stopPropagation();
                  setSelection({ kind: "furniture", id: furniture.id });
                  setSelectedPartIndex(i);
                }}
              />
            ))}
          </group>
        ) : (
          <mesh
            castShadow
            receiveShadow
            onClick={onSelect}
          >
            <boxGeometry args={[furniture.width, furniture.height, furniture.depth]} />
            <meshStandardMaterial
              color={furniture.color}
              roughness={0.7}
              emissive={isSelected ? "#7c8cff" : "#000000"}
              emissiveIntensity={isSelected ? 0.18 : 0}
            />
          </mesh>
        )}
        {isSelected && (
          <lineSegments>
            <edgesGeometry
              args={[new THREE.BoxGeometry(furniture.width, furniture.height, furniture.depth)]}
            />
            <lineBasicMaterial color="#7c8cff" />
          </lineSegments>
        )}
      </group>

      {isSelected && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          translationSnap={transformMode === "translate" ? 0.05 : undefined}
          rotationSnap={transformMode === "rotate" ? Math.PI / 36 : undefined}
          onObjectChange={() => {
            const g = groupRef.current;
            if (!g) return;
            if (transformMode === "translate") {
              updateFurniture(furniture.id, {
                x: round(g.position.x),
                y: round(g.position.y),
                z: round(g.position.z),
              });
            } else {
              updateFurniture(furniture.id, {
                rotationX: round(g.rotation.x),
                rotationY: round(g.rotation.y),
                rotationZ: round(g.rotation.z),
              });
            }
          }}
        />
      )}
    </>
  );
}

function PartMesh({
  part,
  fallbackColor,
  isSelected,
  highlighted,
  onSelect,
}: {
  part: FurniturePart;
  fallbackColor: string;
  isSelected: boolean;
  highlighted: boolean;
  onSelect: (e: { stopPropagation: () => void }) => void;
}) {
  const color = part.color ?? fallbackColor;
  // Géométrie partagée entre le mesh et son contour de surbrillance.
  const geom = useMemo(
    () => new THREE.BoxGeometry(part.width, part.height, part.depth),
    [part.width, part.height, part.depth],
  );
  return (
    <group position={[part.x, part.y, part.z]}>
      <mesh castShadow receiveShadow onClick={onSelect} geometry={geom}>
        <meshStandardMaterial
          color={color}
          roughness={0.75}
          emissive={
            highlighted ? "#ffb02e" : isSelected ? "#7c8cff" : "#000000"
          }
          emissiveIntensity={highlighted ? 0.55 : isSelected ? 0.1 : 0}
        />
      </mesh>
      {highlighted && (
        <lineSegments>
          <edgesGeometry args={[geom]} />
          <lineBasicMaterial color="#ffb02e" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
