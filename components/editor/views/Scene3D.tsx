"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useEditor } from "@/store/editor";
import RoomMesh from "../three/RoomMesh";
import FurnitureGroup from "../three/FurnitureGroup";

export default function Scene3D() {
  const setSelection = useEditor((s) => s.setSelection);

  return (
    <Canvas
      shadows
      camera={{ position: [5, 4.5, 6], fov: 45, near: 0.1, far: 200 }}
      onPointerMissed={(e) => {
        if (e.type === "click") setSelection(null);
      }}
    >
      <color attach="background" args={["#0e0e12"]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#3a3a45", 0.6]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <Grid
        infiniteGrid
        cellSize={0.5}
        sectionSize={2}
        cellColor="#2a2a32"
        sectionColor="#3a3a45"
        fadeDistance={30}
        fadeStrength={1.4}
        position={[0, -0.001, 0]}
      />

      <RoomMesh />
      <FurnitureGroup />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={1.5}
        maxDistance={40}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
