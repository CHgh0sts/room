"use client";

import { Trash2 } from "lucide-react";
import {
  OPENING_LABELS,
  WALL_IDS,
  WALL_LABELS,
  type Furniture,
  type Opening,
  type Shelf,
  type WallId,
  wallLength,
} from "@/lib/scene/schema";
import { useEditor, getWallColor, isWallHidden, getWallSlope } from "@/store/editor";
import FurniturePlanEditor from "./FurniturePlanEditor";

export default function PropertiesPanel() {
  const selection = useEditor((s) => s.selection);
  const scene = useEditor((s) => s.scene);

  let content: React.ReactNode;
  if (!selection) {
    content = <Empty>Sélectionnez un élément pour modifier ses propriétés.</Empty>;
  } else if (selection.kind === "room") {
    content = <RoomEditor />;
  } else if (selection.kind === "wall") {
    content = <WallEditor wallId={selection.id} />;
  } else if (selection.kind === "opening") {
    const o = scene.openings.find((x) => x.id === selection.id);
    content = o ? <OpeningEditor opening={o} /> : <Empty>Élément introuvable.</Empty>;
  } else if (selection.kind === "shelf") {
    const s = scene.shelves.find((x) => x.id === selection.id);
    content = s ? <ShelfEditor shelf={s} /> : <Empty>Élément introuvable.</Empty>;
  } else if (selection.kind === "furniture") {
    const f = scene.furniture.find((x) => x.id === selection.id);
    content = f ? <FurnitureEditor furniture={f} /> : <Empty>Élément introuvable.</Empty>;
  }

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-bg-soft overflow-y-auto p-4">
      {content}
    </aside>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-text-dim italic mt-4">{children}</p>
  );
}

function Header({
  title,
  onDelete,
}: {
  title: string;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-medium text-text">{title}</h3>
      {onDelete && (
        <button
          type="button"
          className="btn-ghost text-red-400 hover:text-red-300"
          onClick={onDelete}
          aria-label="Supprimer"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.05,
  unit = "m",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <label className="block">
      <span className="label">
        {label} {unit && <span className="normal-case text-text-dim">({unit})</span>}
      </span>
      <input
        type="number"
        className="input"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="w-10 h-9 rounded border border-border bg-transparent cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="input"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) onChange(v);
            else onChange(v);
          }}
        />
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="text"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------ Room ------------------------ */

function RoomEditor() {
  const room = useEditor((s) => s.scene.room);
  const updateRoom = useEditor((s) => s.updateRoom);
  return (
    <>
      <Header title="Pièce" />
      <div className="space-y-3">
        <NumberField
          label="Largeur"
          value={room.width}
          onChange={(v) => updateRoom({ width: clamp(v, 0.5, 100) })}
          min={0.5}
          max={100}
        />
        <NumberField
          label="Profondeur"
          value={room.depth}
          onChange={(v) => updateRoom({ depth: clamp(v, 0.5, 100) })}
          min={0.5}
          max={100}
        />
        <NumberField
          label="Hauteur sous plafond"
          value={room.height}
          onChange={(v) => updateRoom({ height: clamp(v, 1, 10) })}
          min={1}
          max={10}
        />
        <ColorField
          label="Couleur du sol"
          value={room.floorColor}
          onChange={(c) => updateRoom({ floorColor: c })}
        />
        <ColorField
          label="Couleur des murs (par défaut)"
          value={room.wallColor}
          onChange={(c) => updateRoom({ wallColor: c })}
        />
      </div>
    </>
  );
}

/* ------------------------ Wall ------------------------ */

function WallEditor({ wallId }: { wallId: WallId }) {
  const scene = useEditor((s) => s.scene);
  const setWallOverride = useEditor((s) => s.setWallOverride);
  const setWallHidden = useEditor((s) => s.setWallHidden);
  const setWallSlope = useEditor((s) => s.setWallSlope);
  const override = scene.walls.find((w) => w.id === wallId);
  const color = getWallColor(scene, wallId);
  const hidden = isWallHidden(scene, wallId);
  const slope = getWallSlope(scene, wallId);
  const isOverridden = !!override?.color;
  const roomH = scene.room.height;

  return (
    <>
      <Header title={`Mur ${WALL_LABELS[wallId]}`} />
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Longueur du mur : {wallLength(scene.room, wallId).toFixed(2)} m · Hauteur :{" "}
          {scene.room.height.toFixed(2)} m
        </p>
        <CheckboxField
          label="Mur visible"
          hint="Décocher pour cacher ce mur (utile pour voir l'intérieur)."
          checked={!hidden}
          onChange={(visible) => setWallHidden(wallId, !visible)}
        />
        <ColorField
          label="Couleur (surcharge)"
          value={color}
          onChange={(c) => setWallOverride(wallId, c)}
        />
        {isOverridden && (
          <button
            type="button"
            className="btn w-full"
            onClick={() => setWallOverride(wallId, undefined)}
          >
            Réinitialiser à la couleur par défaut
          </button>
        )}

        <SlopeSection
          wallId={wallId}
          slope={slope}
          roomHeight={roomH}
          setSlope={(s) => setWallSlope(wallId, s)}
        />
      </div>
    </>
  );
}

function SlopeSection({
  wallId,
  slope,
  roomHeight,
  setSlope,
}: {
  wallId: WallId;
  slope: { leftHeight: number; rightHeight: number } | undefined;
  roomHeight: number;
  setSlope: (s: { leftHeight: number; rightHeight: number } | undefined) => void;
}) {
  const enabled = !!slope;
  const left = slope?.leftHeight ?? roomHeight;
  const right = slope?.rightHeight ?? roomHeight * 0.6;

  return (
    <div className="pt-3 mt-1 border-t border-border space-y-3">
      <CheckboxField
        label="Mur mansardé"
        hint={
          enabled
            ? "Pente activée. Le mur " +
              WALL_LABELS[wallId] +
              " devient un trapèze."
            : "Active une pente pour figurer un mur sous toit (combles)."
        }
        checked={enabled}
        onChange={(v) => {
          if (v) {
            // Active avec une pente par défaut : haut côté gauche, bas côté droit.
            setSlope({
              leftHeight: roomHeight,
              rightHeight: Math.max(0.5, roomHeight * 0.5),
            });
          } else {
            setSlope(undefined);
          }
        }}
      />
      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Haut. gauche"
              value={left}
              min={0.2}
              max={roomHeight}
              step={0.05}
              onChange={(v) =>
                setSlope({
                  leftHeight: clamp(v, 0.2, roomHeight),
                  rightHeight: right,
                })
              }
            />
            <NumberField
              label="Haut. droite"
              value={right}
              min={0.2}
              max={roomHeight}
              step={0.05}
              onChange={(v) =>
                setSlope({
                  leftHeight: left,
                  rightHeight: clamp(v, 0.2, roomHeight),
                })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              className="btn text-[11px]"
              title="Pente vers la droite (haut à gauche, bas à droite)"
              onClick={() =>
                setSlope({
                  leftHeight: roomHeight,
                  rightHeight: Math.max(0.5, roomHeight * 0.5),
                })
              }
            >
              ↘ G→D
            </button>
            <button
              type="button"
              className="btn text-[11px]"
              title="Pente vers la gauche"
              onClick={() =>
                setSlope({
                  leftHeight: Math.max(0.5, roomHeight * 0.5),
                  rightHeight: roomHeight,
                })
              }
            >
              ↙ D→G
            </button>
            <button
              type="button"
              className="btn text-[11px]"
              title="Toit en V (bas au centre - non supporté), remet plat"
              onClick={() =>
                setSlope({
                  leftHeight: roomHeight,
                  rightHeight: roomHeight,
                })
              }
            >
              ─ Plat
            </button>
          </div>
          <p className="text-[11px] text-text-dim italic">
            Les fenêtres et portes sont automatiquement clampées sous la
            pente.
          </p>
        </>
      )}
    </div>
  );
}

function CheckboxField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-accent"
      />
      <span className="flex-1">
        <span className="text-sm text-text">{label}</span>
        {hint && <span className="block text-[11px] text-text-dim">{hint}</span>}
      </span>
    </label>
  );
}

/* ------------------------ Opening ------------------------ */

function OpeningEditor({ opening }: { opening: Opening }) {
  const room = useEditor((s) => s.scene.room);
  const updateOpening = useEditor((s) => s.updateOpening);
  const removeOpening = useEditor((s) => s.removeOpening);
  const wl = wallLength(room, opening.wallId);
  return (
    <>
      <Header
        title={OPENING_LABELS[opening.kind]}
        onDelete={() => removeOpening(opening.id)}
      />
      <div className="space-y-3">
        <SelectField
          label="Type"
          value={opening.kind}
          onChange={(v) =>
            updateOpening(opening.id, {
              kind: v,
              y: v === "door" ? 0 : opening.y,
            })
          }
          options={[
            { value: "window", label: "Fenêtre" },
            { value: "door", label: "Porte" },
          ]}
        />
        <SelectField
          label="Mur"
          value={opening.wallId}
          onChange={(v) => updateOpening(opening.id, { wallId: v as WallId })}
          options={WALL_IDS.map((id) => ({ value: id, label: WALL_LABELS[id] }))}
        />
        <NumberField
          label="Largeur"
          value={opening.width}
          onChange={(v) =>
            updateOpening(opening.id, { width: clamp(v, 0.1, wl) })
          }
          min={0.1}
          max={wl}
        />
        <NumberField
          label="Hauteur"
          value={opening.height}
          onChange={(v) =>
            updateOpening(opening.id, { height: clamp(v, 0.1, room.height) })
          }
          min={0.1}
          max={room.height}
        />
        <NumberField
          label="Position depuis la gauche"
          value={opening.x}
          onChange={(v) =>
            updateOpening(opening.id, {
              x: clamp(v, 0, Math.max(0, wl - opening.width)),
            })
          }
          min={0}
          max={Math.max(0, wl - opening.width)}
        />
        {opening.kind === "window" && (
          <NumberField
            label="Hauteur depuis le sol"
            value={opening.y}
            onChange={(v) =>
              updateOpening(opening.id, {
                y: clamp(v, 0, Math.max(0, room.height - opening.height)),
              })
            }
            min={0}
            max={Math.max(0, room.height - opening.height)}
          />
        )}
      </div>
    </>
  );
}

/* ------------------------ Shelf ------------------------ */

function ShelfEditor({ shelf }: { shelf: Shelf }) {
  const room = useEditor((s) => s.scene.room);
  const updateShelf = useEditor((s) => s.updateShelf);
  const removeShelf = useEditor((s) => s.removeShelf);
  const wl = wallLength(room, shelf.wallId);
  return (
    <>
      <Header title="Étagère encastrée" onDelete={() => removeShelf(shelf.id)} />
      <div className="space-y-3">
        <SelectField
          label="Mur"
          value={shelf.wallId}
          onChange={(v) => updateShelf(shelf.id, { wallId: v as WallId })}
          options={WALL_IDS.map((id) => ({ value: id, label: WALL_LABELS[id] }))}
        />
        <NumberField
          label="Largeur"
          value={shelf.width}
          onChange={(v) => updateShelf(shelf.id, { width: clamp(v, 0.1, wl) })}
          min={0.1}
          max={wl}
        />
        <NumberField
          label="Hauteur"
          value={shelf.height}
          onChange={(v) =>
            updateShelf(shelf.id, { height: clamp(v, 0.05, room.height) })
          }
          min={0.05}
          max={room.height}
        />
        <NumberField
          label="Profondeur (vers l'intérieur)"
          value={shelf.depth}
          onChange={(v) => updateShelf(shelf.id, { depth: clamp(v, 0.05, 2) })}
          min={0.05}
          max={2}
        />
        <NumberField
          label="Position depuis la gauche"
          value={shelf.x}
          onChange={(v) =>
            updateShelf(shelf.id, {
              x: clamp(v, 0, Math.max(0, wl - shelf.width)),
            })
          }
          min={0}
          max={Math.max(0, wl - shelf.width)}
        />
        <NumberField
          label="Hauteur depuis le sol"
          value={shelf.y}
          onChange={(v) =>
            updateShelf(shelf.id, {
              y: clamp(v, 0, Math.max(0, room.height - shelf.height)),
            })
          }
          min={0}
          max={Math.max(0, room.height - shelf.height)}
        />
        <ColorField
          label="Couleur"
          value={shelf.color}
          onChange={(c) => updateShelf(shelf.id, { color: c })}
        />
      </div>
    </>
  );
}

/* ------------------------ Furniture ------------------------ */

function FurnitureEditor({ furniture }: { furniture: Furniture }) {
  const updateFurniture = useEditor((s) => s.updateFurniture);
  const removeFurniture = useEditor((s) => s.removeFurniture);
  const rxDeg = radToDeg(furniture.rotationX);
  const ryDeg = radToDeg(furniture.rotationY);
  const rzDeg = radToDeg(furniture.rotationZ);

  function setDim(field: "width" | "height" | "depth", value: number) {
    const v = clamp(value, 0.05, 50);
    updateFurniture(furniture.id, { [field]: v });
  }

  return (
    <>
      <Header title="Meuble" onDelete={() => removeFurniture(furniture.id)} />
      <div className="space-y-3">
        <TextField
          label="Nom"
          value={furniture.name}
          onChange={(s) => updateFurniture(furniture.id, { name: s })}
        />
        <SectionLabel>Dimensions</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="Largeur"
            value={furniture.width}
            onChange={(v) => setDim("width", v)}
            min={0.05}
            max={50}
          />
          <NumberField
            label="Hauteur"
            value={furniture.height}
            onChange={(v) => setDim("height", v)}
            min={0.05}
            max={50}
          />
          <NumberField
            label="Profondeur"
            value={furniture.depth}
            onChange={(v) => setDim("depth", v)}
            min={0.05}
            max={50}
          />
        </div>
        <SectionLabel hint="Position du centre du meuble">Position</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="X"
            value={furniture.x}
            onChange={(v) => updateFurniture(furniture.id, { x: v })}
            step={0.05}
          />
          <NumberField
            label="Y"
            value={furniture.y}
            onChange={(v) => updateFurniture(furniture.id, { y: v })}
            step={0.05}
          />
          <NumberField
            label="Z"
            value={furniture.z}
            onChange={(v) => updateFurniture(furniture.id, { z: v })}
            step={0.05}
          />
        </div>
        <button
          type="button"
          className="btn w-full text-xs"
          onClick={() =>
            updateFurniture(furniture.id, { y: furniture.height / 2 })
          }
        >
          Poser au sol
        </button>
        <SectionLabel>Rotation</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="X"
            unit="°"
            value={rxDeg}
            step={5}
            onChange={(deg) =>
              updateFurniture(furniture.id, { rotationX: degToRad(deg) })
            }
          />
          <NumberField
            label="Y"
            unit="°"
            value={ryDeg}
            step={5}
            onChange={(deg) =>
              updateFurniture(furniture.id, { rotationY: degToRad(deg) })
            }
          />
          <NumberField
            label="Z"
            unit="°"
            value={rzDeg}
            step={5}
            onChange={(deg) =>
              updateFurniture(furniture.id, { rotationZ: degToRad(deg) })
            }
          />
        </div>
        <button
          type="button"
          className="btn w-full text-xs"
          onClick={() =>
            updateFurniture(furniture.id, {
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
            })
          }
        >
          Réinitialiser la rotation
        </button>
        <SectionLabel>Apparence</SectionLabel>
        <ColorField
          label="Couleur"
          value={furniture.color}
          onChange={(c) => updateFurniture(furniture.id, { color: c })}
        />
        {furniture.parts && furniture.parts.length > 0 && (
          <>
            <SectionLabel hint="Modifiez chaque pièce indépendamment, sans déformation.">
              Composition
            </SectionLabel>
            <FurniturePlanEditor furniture={furniture} />
          </>
        )}
      </div>
    </>
  );
}

function SectionLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="pt-2 -mb-1">
      <div className="text-[11px] uppercase tracking-wider text-text-dim">
        {children}
      </div>
      {hint && <div className="text-[10px] text-text-dim mt-0.5">{hint}</div>}
    </div>
  );
}

function radToDeg(r: number): number {
  return Math.round((r * 180) / Math.PI);
}
function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
