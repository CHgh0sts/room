"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, isWallHidden } from "@/store/editor";
import {
  WALL_IDS,
  type Furniture,
  type Opening,
  type Shelf,
  type WallId,
  wallLength,
} from "@/lib/scene/schema";
import { localOnWallToWorld } from "@/lib/scene/geometry";

const PIXELS_PER_METER_DEFAULT = 80;

// Convention 2D : origine SVG en haut-gauche, axe Y vers le bas.
// Monde : axe X est l'Est (+), axe Z est le Sud (+). On veut le Nord en haut
// du plan. Donc : screenX = worldX, screenY = worldZ. (+Z monde = vers le bas
// dans le plan, ce qui correspond au Sud).

type ViewT = { tx: number; ty: number; scale: number };

export default function Scene2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSize({ w: width, h: height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const scene = useEditor((s) => s.scene);
  const setSelection = useEditor((s) => s.setSelection);
  const selection = useEditor((s) => s.selection);
  const updateFurniture = useEditor((s) => s.updateFurniture);

  // Vue : centre la pièce, scale = pixels/mètre.
  const initial = useMemo<ViewT>(() => {
    const padding = 60;
    if (size.w === 0 || size.h === 0) {
      return { tx: 0, ty: 0, scale: PIXELS_PER_METER_DEFAULT };
    }
    const sx = (size.w - 2 * padding) / scene.room.width;
    const sy = (size.h - 2 * padding) / scene.room.depth;
    const s = Math.max(20, Math.min(sx, sy, 200));
    return {
      tx: size.w / 2,
      ty: size.h / 2,
      scale: s,
    };
  }, [size.w, size.h, scene.room.width, scene.room.depth]);

  const [view, setView] = useState<ViewT>(initial);
  // Re-fit quand la taille change (1ère mesure ou redimensionnement gros).
  useEffect(() => {
    setView(initial);
  }, [initial]);

  function worldToScreen(x: number, z: number): [number, number] {
    return [view.tx + x * view.scale, view.ty + z * view.scale];
  }
  function screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - view.tx) / view.scale, (sy - view.ty) / view.scale];
  }

  // Pan + zoom
  const panState = useRef<{ active: boolean; x: number; y: number } | null>(null);
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.min(400, Math.max(15, view.scale * factor));
    // garder le point sous la souris stable
    const wx = (cx - view.tx) / view.scale;
    const wy = (cy - view.ty) / view.scale;
    setView({
      tx: cx - wx * newScale,
      ty: cy - wy * newScale,
      scale: newScale,
    });
  }
  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
      panState.current = { active: true, x: e.clientX, y: e.clientY };
    }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!panState.current?.active) return;
    const dx = e.clientX - panState.current.x;
    const dy = e.clientY - panState.current.y;
    panState.current.x = e.clientX;
    panState.current.y = e.clientY;
    setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  }
  function onMouseUp() {
    panState.current = null;
  }

  // Drag de meubles
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origZ: number;
  } | null>(null);
  function onFurnitureMouseDown(e: React.MouseEvent, f: Furniture) {
    if (e.button !== 0 || e.shiftKey) return;
    e.stopPropagation();
    setSelection({ kind: "furniture", id: f.id });
    dragRef.current = {
      id: f.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: f.x,
      origZ: f.z,
    };
  }
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / view.scale;
      const dy = (e.clientY - d.startY) / view.scale;
      const snap = 0.05;
      updateFurniture(d.id, {
        x: Math.round((d.origX + dx) / snap) * snap,
        z: Math.round((d.origZ + dy) / snap) * snap,
      });
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateFurniture, view.scale]);

  // Géométries
  const halfW = scene.room.width / 2;
  const halfD = scene.room.depth / 2;
  const [x0, y0] = worldToScreen(-halfW, -halfD);
  const [x1, y1] = worldToScreen(halfW, halfD);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none cursor-default"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
          setSelection(null);
        }
      }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ background: "#101015" }}>
        <Grid view={view} size={size} />

        {/* Sol (rectangle de la pièce) */}
        <rect
          x={Math.min(x0, x1)}
          y={Math.min(y0, y1)}
          width={Math.abs(x1 - x0)}
          height={Math.abs(y1 - y0)}
          fill={scene.room.floorColor}
          fillOpacity={0.18}
          stroke="#6c6c75"
          strokeWidth={1}
          onClick={(e) => {
            e.stopPropagation();
            setSelection({ kind: "room" });
          }}
        />

        {/* Murs (les murs masqués sont dessinés en pointillés discrets) */}
        {WALL_IDS.map((id) => (
          <WallLine
            key={id}
            wallId={id}
            scene={scene}
            worldToScreen={worldToScreen}
            selected={selection?.kind === "wall" && selection.id === id}
            hidden={isWallHidden(scene, id)}
            onClick={() => setSelection({ kind: "wall", id })}
          />
        ))}

        {/* Ouvertures (cachées avec leur mur) */}
        {scene.openings.map((o) =>
          isWallHidden(scene, o.wallId) ? null : (
            <OpeningMarker
              key={o.id}
              opening={o}
              scene={scene}
              worldToScreen={worldToScreen}
              selected={selection?.kind === "opening" && selection.id === o.id}
              onClick={() => setSelection({ kind: "opening", id: o.id })}
            />
          ),
        )}

        {/* Étagères (cachées avec leur mur) */}
        {scene.shelves.map((s) =>
          isWallHidden(scene, s.wallId) ? null : (
            <ShelfRect
              key={s.id}
              shelf={s}
              scene={scene}
              worldToScreen={worldToScreen}
              selected={selection?.kind === "shelf" && selection.id === s.id}
              onClick={() => setSelection({ kind: "shelf", id: s.id })}
            />
          ),
        )}

        {/* Meubles */}
        {scene.furniture.map((f) => (
          <FurnitureRect
            key={f.id}
            f={f}
            scale={view.scale}
            worldToScreen={worldToScreen}
            selected={selection?.kind === "furniture" && selection.id === f.id}
            onMouseDown={(e) => onFurnitureMouseDown(e, f)}
          />
        ))}
      </svg>

      <Helper />
    </div>
  );
}

function Helper() {
  return (
    <div className="absolute bottom-3 left-3 text-[11px] text-text-dim bg-bg-soft/80 border border-border rounded px-2 py-1 pointer-events-none">
      Molette : zoom &nbsp;·&nbsp; Maj/Clic-milieu+glisser : pan &nbsp;·&nbsp;
      Glisser un meuble pour le déplacer
    </div>
  );
}

function Grid({ view, size }: { view: ViewT; size: { w: number; h: number } }) {
  if (view.scale < 25) return null;
  const step = view.scale; // 1 mètre
  const offsetX = ((view.tx % step) + step) % step;
  const offsetY = ((view.ty % step) + step) % step;
  const lines: React.ReactElement[] = [];
  for (let x = offsetX; x < size.w; x += step) {
    lines.push(
      <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={size.h} stroke="#1f1f26" strokeWidth={1} />,
    );
  }
  for (let y = offsetY; y < size.h; y += step) {
    lines.push(
      <line key={`hy${y}`} x1={0} y1={y} x2={size.w} y2={y} stroke="#1f1f26" strokeWidth={1} />,
    );
  }
  return <g>{lines}</g>;
}

function WallLine({
  wallId,
  scene,
  worldToScreen,
  selected,
  hidden,
  onClick,
}: {
  wallId: WallId;
  scene: ReturnType<typeof useEditor.getState>["scene"];
  worldToScreen: (x: number, z: number) => [number, number];
  selected: boolean;
  hidden: boolean;
  onClick: () => void;
}) {
  const wl = wallLength(scene.room, wallId);
  const [ax, ay] = worldEdgeStart(scene, wallId);
  const [bx, by] = worldEdgeEnd(scene, wallId);
  const [sx0, sy0] = worldToScreen(ax, ay);
  const [sx1, sy1] = worldToScreen(bx, by);
  const sortedOps = scene.openings
    .filter((o) => o.wallId === wallId)
    .map((o) => ({
      o,
      x: Math.max(0, Math.min(wl - o.width, o.x)),
    }))
    .sort((a, b) => a.x - b.x);
  // Dessine en segments (avec interruptions sur les portes pour donner une impression de plan).
  const segments: Array<[number, number]> = [];
  let cursor = 0;
  for (const { o, x } of sortedOps) {
    if (x > cursor) segments.push([cursor, x]);
    cursor = Math.min(wl, x + o.width);
  }
  if (cursor < wl) segments.push([cursor, wl]);

  // Direction unitaire du mur en monde.
  const dx = (bx - ax) / wl;
  const dz = (by - ay) / wl;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    >
      {segments.map(([s0, s1], i) => {
        const wx0 = ax + dx * s0;
        const wz0 = ay + dz * s0;
        const wx1 = ax + dx * s1;
        const wz1 = ay + dz * s1;
        const [px0, py0] = worldToScreen(wx0, wz0);
        const [px1, py1] = worldToScreen(wx1, wz1);
        return (
          <line
            key={i}
            x1={px0}
            y1={py0}
            x2={px1}
            y2={py1}
            stroke={selected ? "#7c8cff" : hidden ? "#5a5a64" : "#cfcfd6"}
            strokeWidth={selected ? 6 : hidden ? 1.5 : 5}
            strokeDasharray={hidden ? "4 4" : undefined}
            strokeOpacity={hidden ? 0.6 : 1}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Hitline plus large invisible pour cliquer plus facilement */}
      <line
        x1={sx0}
        y1={sy0}
        x2={sx1}
        y2={sy1}
        stroke="transparent"
        strokeWidth={16}
      />
    </g>
  );
}

function worldEdgeStart(
  scene: ReturnType<typeof useEditor.getState>["scene"],
  wallId: WallId,
): [number, number] {
  const w = scene.room.width;
  const d = scene.room.depth;
  // Parcours de gauche à droite vu de l'intérieur :
  switch (wallId) {
    case "north":
      return [-w / 2, -d / 2];
    case "east":
      return [w / 2, -d / 2];
    case "south":
      return [w / 2, d / 2];
    case "west":
      return [-w / 2, d / 2];
  }
}
function worldEdgeEnd(
  scene: ReturnType<typeof useEditor.getState>["scene"],
  wallId: WallId,
): [number, number] {
  const w = scene.room.width;
  const d = scene.room.depth;
  switch (wallId) {
    case "north":
      return [w / 2, -d / 2];
    case "east":
      return [w / 2, d / 2];
    case "south":
      return [-w / 2, d / 2];
    case "west":
      return [-w / 2, -d / 2];
  }
}

function OpeningMarker({
  opening,
  scene,
  worldToScreen,
  selected,
  onClick,
}: {
  opening: Opening;
  scene: ReturnType<typeof useEditor.getState>["scene"];
  worldToScreen: (x: number, z: number) => [number, number];
  selected: boolean;
  onClick: () => void;
}) {
  const wl = wallLength(scene.room, opening.wallId);
  const x = Math.max(0, Math.min(wl - opening.width, opening.x));
  const [ax, ay] = worldEdgeStart(scene, opening.wallId);
  const [bx, by] = worldEdgeEnd(scene, opening.wallId);
  const dx = (bx - ax) / wl;
  const dz = (by - ay) / wl;
  const wx0 = ax + dx * x;
  const wz0 = ay + dz * x;
  const wx1 = ax + dx * (x + opening.width);
  const wz1 = ay + dz * (x + opening.width);
  const [px0, py0] = worldToScreen(wx0, wz0);
  const [px1, py1] = worldToScreen(wx1, wz1);
  const stroke = opening.kind === "window" ? "#9ec7ff" : "#caa885";
  return (
    <line
      x1={px0}
      y1={py0}
      x2={px1}
      y2={py1}
      stroke={selected ? "#7c8cff" : stroke}
      strokeWidth={selected ? 7 : 5}
      strokeDasharray={opening.kind === "window" ? "6 4" : undefined}
      strokeLinecap="butt"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    />
  );
}

function ShelfRect({
  shelf,
  scene,
  worldToScreen,
  selected,
  onClick,
}: {
  shelf: Shelf;
  scene: ReturnType<typeof useEditor.getState>["scene"];
  worldToScreen: (x: number, z: number) => [number, number];
  selected: boolean;
  onClick: () => void;
}) {
  const wl = wallLength(scene.room, shelf.wallId);
  const ox = Math.max(0, Math.min(wl - shelf.width, shelf.x));
  // 4 coins dans le repère monde (vue de dessus, on ignore Y)
  const corners = [
    localOnWallToWorld(scene.room, shelf.wallId, ox, 0, 0),
    localOnWallToWorld(scene.room, shelf.wallId, ox + shelf.width, 0, 0),
    localOnWallToWorld(scene.room, shelf.wallId, ox + shelf.width, 0, shelf.depth),
    localOnWallToWorld(scene.room, shelf.wallId, ox, 0, shelf.depth),
  ];
  const points = corners
    .map(([x, , z]) => worldToScreen(x, z))
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  return (
    <polygon
      points={points}
      fill={shelf.color}
      fillOpacity={0.6}
      stroke={selected ? "#7c8cff" : "#5a5a64"}
      strokeWidth={selected ? 2 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    />
  );
}

function FurnitureRect({
  f,
  worldToScreen,
  selected,
  onMouseDown,
}: {
  f: Furniture;
  scale: number;
  worldToScreen: (x: number, z: number) => [number, number];
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  // 4 coins dans le repère local du meuble, puis rotation Y.
  const hw = f.width / 2;
  const hd = f.depth / 2;
  const cos = Math.cos(f.rotationY);
  const sin = Math.sin(f.rotationY);
  const corners: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([lx, lz]) => [
    f.x + lx * cos + lz * sin,
    f.z + (-lx * sin + lz * cos),
  ]);
  const points = corners
    .map(([wx, wz]) => worldToScreen(wx, wz))
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  return (
    <g style={{ cursor: "grab" }} onMouseDown={onMouseDown}>
      <polygon
        points={points}
        fill={f.color}
        stroke={selected ? "#7c8cff" : "#2c2c33"}
        strokeWidth={selected ? 2.5 : 1.5}
      />
    </g>
  );
}
