"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { Furniture, FurniturePart } from "@/lib/scene/schema";
import { bakePartsScale } from "@/lib/scene/furniture";
import { useEditor } from "@/store/editor";

const SVG_W = 256;
const SVG_H = 200;
const PADDING = 16;
const SNAP = 0.01; // 1 cm

/* -------------------------------------------------------------------------- */
/* Vues orthographiques                                                       */
/* -------------------------------------------------------------------------- */

type Axis = "x" | "y" | "z";
type ViewKey = "top" | "bottom" | "front" | "back" | "left" | "right";

type ViewProj = {
  key: ViewKey;
  label: string;
  // Pour chaque axe écran (U=horizontal, V=vertical), on indique quel axe
  // monde il représente, et son signe.
  uAxis: Axis;
  uSign: 1 | -1;
  vAxis: Axis;
  vSign: 1 | -1;
  // Axe "profondeur" : celui qu'on ne voit pas. depthSign=1 ⇒ +depthAxis = vers
  // le viewer (donc dessiné par-dessus).
  depthAxis: Axis;
  depthSign: 1 | -1;
  // Étiquettes affichées au-dessus / en dessous du canvas pour s'orienter.
  topLabel: string;
  bottomLabel: string;
};

const VIEWS: ViewProj[] = [
  {
    key: "top",
    label: "Dessus",
    uAxis: "x", uSign: 1,
    vAxis: "z", vSign: 1,
    depthAxis: "y", depthSign: 1,
    topLabel: "arrière",
    bottomLabel: "avant",
  },
  {
    key: "bottom",
    label: "Dessous",
    uAxis: "x", uSign: 1,
    vAxis: "z", vSign: -1,
    depthAxis: "y", depthSign: -1,
    topLabel: "avant",
    bottomLabel: "arrière",
  },
  {
    key: "front",
    label: "Avant",
    uAxis: "x", uSign: 1,
    vAxis: "y", vSign: -1,
    depthAxis: "z", depthSign: 1,
    topLabel: "haut",
    bottomLabel: "sol",
  },
  {
    key: "back",
    label: "Arrière",
    uAxis: "x", uSign: -1,
    vAxis: "y", vSign: -1,
    depthAxis: "z", depthSign: -1,
    topLabel: "haut",
    bottomLabel: "sol",
  },
  {
    key: "left",
    label: "Gauche",
    uAxis: "z", uSign: 1,
    vAxis: "y", vSign: -1,
    depthAxis: "x", depthSign: -1,
    topLabel: "haut",
    bottomLabel: "sol",
  },
  {
    key: "right",
    label: "Droite",
    uAxis: "z", uSign: -1,
    vAxis: "y", vSign: -1,
    depthAxis: "x", depthSign: 1,
    topLabel: "haut",
    bottomLabel: "sol",
  },
];

function axisVal<T extends Record<Axis, number>>(p: T, axis: Axis): number {
  return p[axis];
}

function partSizeOnAxis(p: FurniturePart, axis: Axis): number {
  if (axis === "x") return p.width;
  if (axis === "y") return p.height;
  return p.depth;
}

function partSizeKey(axis: Axis): "width" | "height" | "depth" {
  if (axis === "x") return "width";
  if (axis === "y") return "height";
  return "depth";
}

function bboxSizeOnAxis(f: { width: number; height: number; depth: number }, axis: Axis): number {
  if (axis === "x") return f.width;
  if (axis === "y") return f.height;
  return f.depth;
}

/* -------------------------------------------------------------------------- */
/* Composant principal                                                        */
/* -------------------------------------------------------------------------- */

export default function FurniturePlanEditor({
  furniture,
}: {
  furniture: Furniture;
}) {
  // Affichage : on travaille toujours sur la version "bakée" (scale=1) pour
  // que le canvas reflète exactement les dimensions affichées en 3D.
  const display = useMemo(() => bakePartsScale(furniture), [furniture]);
  const parts = display.parts ?? [];

  const updatePart = useEditor((s) => s.updateFurniturePart);
  const addPart = useEditor((s) => s.addFurniturePart);
  const removePart = useEditor((s) => s.removeFurniturePart);

  const [viewKey, setViewKey] = useState<ViewKey>("top");
  const view = VIEWS.find((v) => v.key === viewKey)!;

  // Sélection partagée avec la scène 3D (pour la surbrillance).
  const selectedIdx = useEditor((s) => s.selectedPartIndex);
  const setSelectedIdx = useEditor((s) => s.setSelectedPartIndex);

  const [hidden, setHidden] = useState<Set<number>>(new Set());

  // Si parts changent (ajout/suppression), garde une sélection valide et
  // nettoie les indices cachés obsolètes.
  useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= parts.length) {
      setSelectedIdx(null);
    }
    setHidden((prev) => {
      const next = new Set<number>();
      for (const i of prev) if (i < parts.length) next.add(i);
      return next;
    });
  }, [parts.length, selectedIdx, setSelectedIdx]);

  /* ----- Auto-fit selon la vue ----- */

  const { scale, cu, cv, bbU, bbV, projParts, projOrder } = useMemo(() => {
    const bbU = bboxSizeOnAxis(display, view.uAxis);
    const bbV = bboxSizeOnAxis(display, view.vAxis);
    let minU = -bbU / 2, maxU = bbU / 2;
    let minV = -bbV / 2, maxV = bbV / 2;

    const proj = parts.map((p) => {
      const u = view.uSign * axisVal(p, view.uAxis);
      const v = view.vSign * axisVal(p, view.vAxis);
      const su = partSizeOnAxis(p, view.uAxis);
      const sv = partSizeOnAxis(p, view.vAxis);
      const dep = view.depthSign * axisVal(p, view.depthAxis);
      return { u, v, su, sv, dep };
    });
    for (const r of proj) {
      minU = Math.min(minU, r.u - r.su / 2);
      maxU = Math.max(maxU, r.u + r.su / 2);
      minV = Math.min(minV, r.v - r.sv / 2);
      maxV = Math.max(maxV, r.v + r.sv / 2);
    }
    const spanU = Math.max(0.01, maxU - minU);
    const spanV = Math.max(0.01, maxV - minV);
    const innerW = SVG_W - 2 * PADDING;
    const innerH = SVG_H - 2 * PADDING;
    const scale = Math.min(innerW / spanU, innerH / spanV);
    const cu = (minU + maxU) / 2;
    const cv = (minV + maxV) / 2;

    // Painter's algo : trier par profondeur croissante (les plus proches
    // dessinées en dernier, donc au-dessus).
    const order = parts
      .map((_, i) => i)
      .sort((a, b) => proj[a].dep - proj[b].dep);

    return { scale, cu, cv, bbU, bbV, projParts: proj, projOrder: order };
  }, [display, parts, view]);

  function uvToScreen(u: number, v: number): [number, number] {
    return [SVG_W / 2 + (u - cu) * scale, SVG_H / 2 + (v - cv) * scale];
  }

  /* ----- Drag (move + resize) ----- */

  type DragMode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  const dragRef = useRef<{
    idx: number;
    mode: DragMode;
    startX: number;
    startY: number;
    orig: FurniturePart;
  } | null>(null);

  function startDrag(e: React.MouseEvent, idx: number, mode: DragMode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedIdx(idx);
    dragRef.current = {
      idx,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...parts[idx] },
    };
  }

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dxScreen = ev.clientX - d.startX;
      const dyScreen = ev.clientY - d.startY;
      const dU = dxScreen / scale;
      const dV = dyScreen / scale;
      const o = d.orig;

      const uAxis = view.uAxis;
      const vAxis = view.vAxis;
      const uSign = view.uSign;
      const vSign = view.vSign;
      const sizeUKey = partSizeKey(uAxis);
      const sizeVKey = partSizeKey(vAxis);
      const minSize = 0.02;

      // Demi-bbox en repère écran (la bbox est centrée sur 0 dans les deux
      // sens). Sert à clamper pour que la pièce ne sorte pas du meuble.
      const bbHalfU = bboxSizeOnAxis(display, uAxis) / 2;
      const bbHalfV = bboxSizeOnAxis(display, vAxis) / 2;

      // Coords U/V écran initiales de la pièce.
      const origCenterU = uSign * axisVal(o, uAxis);
      const origCenterV = vSign * axisVal(o, vAxis);
      const origSizeU = partSizeOnAxis(o, uAxis);
      const origSizeV = partSizeOnAxis(o, vAxis);
      const origWestU = origCenterU - origSizeU / 2;
      const origEastU = origCenterU + origSizeU / 2;
      const origNorthV = origCenterV - origSizeV / 2;
      const origSouthV = origCenterV + origSizeV / 2;

      let newCenterU = origCenterU;
      let newSizeU = origSizeU;
      let newCenterV = origCenterV;
      let newSizeV = origSizeV;

      if (d.mode === "move") {
        const lo = -bbHalfU + origSizeU / 2;
        const hi = bbHalfU - origSizeU / 2;
        newCenterU = clamp(origCenterU + dU, lo, hi);
        const loV = -bbHalfV + origSizeV / 2;
        const hiV = bbHalfV - origSizeV / 2;
        newCenterV = clamp(origCenterV + dV, loV, hiV);
      } else {
        if (d.mode.includes("e")) {
          const newEast = clamp(
            origEastU + dU,
            origWestU + minSize,
            bbHalfU,
          );
          newSizeU = newEast - origWestU;
          newCenterU = (newEast + origWestU) / 2;
        } else if (d.mode.includes("w")) {
          const newWest = clamp(
            origWestU + dU,
            -bbHalfU,
            origEastU - minSize,
          );
          newSizeU = origEastU - newWest;
          newCenterU = (origEastU + newWest) / 2;
        }
        if (d.mode.includes("s")) {
          const newSouth = clamp(
            origSouthV + dV,
            origNorthV + minSize,
            bbHalfV,
          );
          newSizeV = newSouth - origNorthV;
          newCenterV = (newSouth + origNorthV) / 2;
        } else if (d.mode.includes("n")) {
          const newNorth = clamp(
            origNorthV + dV,
            -bbHalfV,
            origSouthV - minSize,
          );
          newSizeV = origSouthV - newNorth;
          newCenterV = (origSouthV + newNorth) / 2;
        }
      }

      const patch: Partial<FurniturePart> = {};
      if (newCenterU !== origCenterU) {
        // world[uAxis] = uSign * centerU (puisque uSign² = 1).
        (patch as Record<string, number>)[uAxis] = snap(uSign * newCenterU);
      }
      if (newSizeU !== origSizeU) {
        (patch as Record<string, number>)[sizeUKey] = snap(newSizeU);
      }
      if (newCenterV !== origCenterV) {
        (patch as Record<string, number>)[vAxis] = snap(vSign * newCenterV);
      }
      if (newSizeV !== origSizeV) {
        (patch as Record<string, number>)[sizeVKey] = snap(newSizeV);
      }
      if (Object.keys(patch).length > 0) {
        updatePart(furniture.id, d.idx, patch);
      }
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
  }, [updatePart, furniture.id, scale, view, display]);

  /* ----- Hover/selection cycling : clic répété passe à la pièce dessous ----- */

  function pickNext(idx: number): number {
    // Pièces visibles dont la projection contient le centre de `idx`.
    const target = projParts[idx];
    const candidates: number[] = [];
    for (let i = 0; i < projParts.length; i++) {
      if (hidden.has(i)) continue;
      const r = projParts[i];
      if (
        target.u >= r.u - r.su / 2 &&
        target.u <= r.u + r.su / 2 &&
        target.v >= r.v - r.sv / 2 &&
        target.v <= r.v + r.sv / 2
      ) {
        candidates.push(i);
      }
    }
    // Trier du plus proche du viewer (depth max) au plus loin (depth min).
    candidates.sort((a, b) => projParts[b].dep - projParts[a].dep);
    if (candidates.length === 0) return idx;
    const cur = candidates.indexOf(idx);
    if (cur < 0) return candidates[0];
    return candidates[(cur + 1) % candidates.length];
  }

  /* ----- Rendu ----- */

  const selected = selectedIdx !== null ? parts[selectedIdx] : null;

  // Rectangle de la bbox englobante.
  const [bx0, by0] = uvToScreen(-bbU / 2, -bbV / 2);
  const [bx1, by1] = uvToScreen(bbU / 2, bbV / 2);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] uppercase tracking-wider text-text-dim">
            Plan du meuble — {view.label.toLowerCase()}
          </div>
        </div>

        {/* Sélecteur de vue */}
        <div className="grid grid-cols-6 gap-1 mb-2">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={[
                "text-[10px] py-1 rounded border transition-colors",
                v.key === viewKey
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-bg text-text-dim hover:text-text",
              ].join(" ")}
              onClick={() => setViewKey(v.key)}
              title={v.label}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-text-dim mb-2">
          Cliquez une pièce pour la sélectionner (re-cliquer cycle vers la
          pièce derrière). Glissez pour déplacer, ou tirez les poignées pour
          redimensionner.
        </div>

        <svg
          width={SVG_W}
          height={SVG_H}
          className="rounded border border-border bg-bg block"
          onClick={() => setSelectedIdx(null)}
        >
          {/* bbox du meuble */}
          <rect
            x={Math.min(bx0, bx1)}
            y={Math.min(by0, by1)}
            width={Math.abs(bx1 - bx0)}
            height={Math.abs(by1 - by0)}
            fill="none"
            stroke="#3a3a44"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {/* Repères d'orientation */}
          <text
            x={SVG_W / 2}
            y={10}
            textAnchor="middle"
            fontSize={9}
            fill="#5a5a66"
          >
            {view.topLabel}
          </text>
          <text
            x={SVG_W / 2}
            y={SVG_H - 2}
            textAnchor="middle"
            fontSize={9}
            fill="#5a5a66"
          >
            {view.bottomLabel}
          </text>

          {/* Pièces, des plus loin aux plus proches */}
          {projOrder.map((idx) => {
            if (hidden.has(idx)) return null;
            const p = parts[idx];
            const r = projParts[idx];
            const [x0, y0] = uvToScreen(r.u - r.su / 2, r.v - r.sv / 2);
            const [x1, y1] = uvToScreen(r.u + r.su / 2, r.v + r.sv / 2);
            const w = Math.abs(x1 - x0);
            const h = Math.abs(y1 - y0);
            const isSel = selectedIdx === idx;
            const fill = p.color ?? furniture.color;
            return (
              <rect
                key={idx}
                x={Math.min(x0, x1)}
                y={Math.min(y0, y1)}
                width={w}
                height={h}
                fill={fill}
                fillOpacity={isSel ? 0.92 : 0.45}
                stroke={isSel ? "#7c8cff" : "#1f1f26"}
                strokeWidth={isSel ? 2 : 1}
                style={{ cursor: "move" }}
                onMouseDown={(e) => startDrag(e, idx, "move")}
                onClick={(e) => {
                  e.stopPropagation();
                  // Cycle si déjà sélectionnée.
                  if (selectedIdx === idx) {
                    setSelectedIdx(pickNext(idx));
                  } else {
                    setSelectedIdx(idx);
                  }
                }}
              />
            );
          })}

          {/* Poignées pour la pièce sélectionnée */}
          {selectedIdx !== null && selected && !hidden.has(selectedIdx) && (
            <ResizeHandles
              proj={projParts[selectedIdx]}
              uvToScreen={uvToScreen}
              onStart={(mode, e) => startDrag(e, selectedIdx, mode)}
            />
          )}
        </svg>
      </div>

      {/* Liste des pièces avec toggle œil */}
      <PartsList
        parts={parts}
        fallbackColor={furniture.color}
        selectedIdx={selectedIdx}
        hidden={hidden}
        onSelect={(i) => setSelectedIdx(i)}
        onToggleHide={(i) =>
          setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
          })
        }
        onShowAll={
          hidden.size > 0 ? () => setHidden(new Set()) : undefined
        }
      />

      {selected ? (
        <SelectedPartEditor
          key={selectedIdx}
          part={selected}
          partIndex={selectedIdx!}
          furnitureId={furniture.id}
          fallbackColor={furniture.color}
          onRemove={() => {
            removePart(furniture.id, selectedIdx!);
            setSelectedIdx(null);
          }}
        />
      ) : (
        <p className="text-[11px] text-text-dim italic">
          Aucune pièce sélectionnée.
        </p>
      )}

      <button
        type="button"
        className="btn w-full text-xs flex items-center justify-center gap-1"
        onClick={() => {
          const w = Math.min(0.2, display.width * 0.5);
          const h = Math.min(0.2, display.height * 0.5);
          const dp = Math.min(0.2, display.depth * 0.5);
          const newPart: FurniturePart = {
            x: 0,
            y: -display.height / 2 + h / 2,
            z: 0,
            width: w,
            height: h,
            depth: dp,
          };
          addPart(furniture.id, newPart);
          setSelectedIdx(parts.length);
        }}
      >
        <Plus className="size-3.5" /> Ajouter une pièce
      </button>
    </div>
  );
}

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

/* -------------------------------------------------------------------------- */
/* Sous-composants                                                            */
/* -------------------------------------------------------------------------- */

function ResizeHandles({
  proj,
  uvToScreen,
  onStart,
}: {
  proj: { u: number; v: number; su: number; sv: number };
  uvToScreen: (u: number, v: number) => [number, number];
  onStart: (
    mode: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
    e: React.MouseEvent,
  ) => void;
}) {
  const [x0, y0] = uvToScreen(proj.u - proj.su / 2, proj.v - proj.sv / 2);
  const [x1, y1] = uvToScreen(proj.u + proj.su / 2, proj.v + proj.sv / 2);
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const handles: Array<{
    x: number;
    y: number;
    mode: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    cursor: string;
  }> = [
    { x: left, y: top, mode: "nw", cursor: "nwse-resize" },
    { x: right, y: top, mode: "ne", cursor: "nesw-resize" },
    { x: left, y: bottom, mode: "sw", cursor: "nesw-resize" },
    { x: right, y: bottom, mode: "se", cursor: "nwse-resize" },
    { x: cx, y: top, mode: "n", cursor: "ns-resize" },
    { x: cx, y: bottom, mode: "s", cursor: "ns-resize" },
    { x: left, y: cy, mode: "w", cursor: "ew-resize" },
    { x: right, y: cy, mode: "e", cursor: "ew-resize" },
  ];
  return (
    <g>
      {handles.map((h) => (
        <rect
          key={h.mode}
          x={h.x - 4}
          y={h.y - 4}
          width={8}
          height={8}
          fill="#7c8cff"
          stroke="#fff"
          strokeWidth={1}
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => onStart(h.mode, e)}
        />
      ))}
    </g>
  );
}

function PartsList({
  parts,
  fallbackColor,
  selectedIdx,
  hidden,
  onSelect,
  onToggleHide,
  onShowAll,
}: {
  parts: FurniturePart[];
  fallbackColor: string;
  selectedIdx: number | null;
  hidden: Set<number>;
  onSelect: (i: number) => void;
  onToggleHide: (i: number) => void;
  onShowAll?: () => void;
}) {
  if (parts.length === 0) return null;
  return (
    <div className="rounded border border-border bg-bg">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <span className="text-[10px] uppercase tracking-wider text-text-dim">
          Pièces ({parts.length})
        </span>
        {onShowAll && (
          <button
            type="button"
            className="text-[10px] text-text-dim hover:text-text"
            onClick={onShowAll}
          >
            Tout afficher
          </button>
        )}
      </div>
      <div className="max-h-32 overflow-y-auto py-1">
        {parts.map((p, i) => {
          const isSel = selectedIdx === i;
          const isHidden = hidden.has(i);
          const color = p.color ?? fallbackColor;
          return (
            <div
              key={i}
              className={[
                "flex items-center gap-2 px-2 py-1 cursor-pointer text-[11px]",
                isSel ? "bg-accent/15 text-text" : "hover:bg-bg-soft text-text",
                isHidden ? "opacity-50" : "",
              ].join(" ")}
              onClick={() => onSelect(i)}
            >
              <button
                type="button"
                className="text-text-dim hover:text-text shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHide(i);
                }}
                title={isHidden ? "Afficher" : "Masquer"}
                aria-label={isHidden ? "Afficher" : "Masquer"}
              >
                {isHidden ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
              <span
                className="size-3 rounded-sm border border-black/30 shrink-0"
                style={{ backgroundColor: normalizeHex(color) }}
              />
              <span className="flex-1 truncate">
                Pièce {i + 1}
              </span>
              <span className="text-text-dim shrink-0">
                {fmt(p.width)}×{fmt(p.height)}×{fmt(p.depth)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function SelectedPartEditor({
  part,
  partIndex,
  furnitureId,
  fallbackColor,
  onRemove,
}: {
  part: FurniturePart;
  partIndex: number;
  furnitureId: string;
  fallbackColor: string;
  onRemove: () => void;
}) {
  const updatePart = useEditor((s) => s.updateFurniturePart);

  function set<K extends keyof FurniturePart>(key: K, value: FurniturePart[K]) {
    updatePart(furnitureId, partIndex, { [key]: value } as Partial<FurniturePart>);
  }

  const colorValue = part.color ?? fallbackColor;
  const usesFallback = !part.color;

  return (
    <div className="rounded border border-border bg-bg p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-text-dim">
          Pièce sélectionnée
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="btn-ghost text-red-400 hover:text-red-300"
          aria-label="Supprimer la pièce"
          title="Supprimer la pièce"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SmallNumber
          label="Largeur (X)"
          value={part.width}
          step={0.01}
          min={0.02}
          onChange={(v) => set("width", clamp(v, 0.02, 50))}
        />
        <SmallNumber
          label="Hauteur (Y)"
          value={part.height}
          step={0.01}
          min={0.02}
          onChange={(v) => set("height", clamp(v, 0.02, 50))}
        />
        <SmallNumber
          label="Profond. (Z)"
          value={part.depth}
          step={0.01}
          min={0.02}
          onChange={(v) => set("depth", clamp(v, 0.02, 50))}
        />
        <SmallNumber
          label="X (centre)"
          value={part.x}
          step={0.01}
          onChange={(v) => set("x", v)}
        />
        <SmallNumber
          label="Y (centre)"
          value={part.y}
          step={0.01}
          onChange={(v) => set("y", v)}
        />
        <SmallNumber
          label="Z (centre)"
          value={part.z}
          step={0.01}
          onChange={(v) => set("z", v)}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-dim shrink-0">Couleur</span>
        <input
          type="color"
          className="w-8 h-7 rounded border border-border bg-transparent cursor-pointer"
          value={normalizeHex(colorValue)}
          onChange={(e) => set("color", e.target.value)}
        />
        {!usesFallback && (
          <button
            type="button"
            className="btn-ghost text-[11px] text-text-dim hover:text-text"
            onClick={() => set("color", undefined)}
            title="Utiliser la couleur du meuble"
          >
            défaut
          </button>
        )}
      </div>
    </div>
  );
}

function SmallNumber({
  label,
  value,
  onChange,
  step = 0.01,
  min,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-text-dim">
        {label}
      </span>
      <input
        type="number"
        className="input text-xs py-1"
        value={Number.isFinite(value) ? round3(value) : 0}
        step={step}
        min={min}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function normalizeHex(c: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return (
      "#" +
      c
        .slice(1)
        .split("")
        .map((d) => d + d)
        .join("")
    );
  }
  return "#888888";
}
