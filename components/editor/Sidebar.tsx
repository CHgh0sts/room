"use client";

import { useState } from "react";
import { Plus, ChevronRight, LayoutGrid, Eye, EyeOff } from "lucide-react";
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
import { useEditor, isWallHidden, type Selection } from "@/store/editor";
import FurnitureCatalog from "./FurnitureCatalog";
import { createFurnitureFromPreset } from "@/lib/scene/presets";

export default function Sidebar() {
  const scene = useEditor((s) => s.scene);
  const selection = useEditor((s) => s.selection);
  const setSelection = useEditor((s) => s.setSelection);
  const addOpening = useEditor((s) => s.addOpening);
  const addShelf = useEditor((s) => s.addShelf);
  const addFurniture = useEditor((s) => s.addFurniture);
  const [catalogOpen, setCatalogOpen] = useState(false);

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-bg-soft overflow-y-auto">
      <Section title="Pièce">
        <Item
          label="Dimensions et couleurs"
          active={selection?.kind === "room"}
          onClick={() => setSelection({ kind: "room" })}
        />
      </Section>

      <Section title="Murs">
        {WALL_IDS.map((id) => (
          <WallRow
            key={id}
            wallId={id}
            label={`Mur ${WALL_LABELS[id]}`}
            active={selection?.kind === "wall" && selection.id === id}
            hidden={isWallHidden(scene, id)}
            onClick={() => setSelection({ kind: "wall", id })}
          />
        ))}
      </Section>

      <Section
        title="Ouvertures"
        action={
          <AddButton
            onClick={() => {
              const wallId: WallId = "north";
              const wl = wallLength(scene.room, wallId);
              addOpening({
                wallId,
                kind: "window",
                x: Math.max(0, wl / 2 - 0.6),
                y: 1.0,
                width: 1.2,
                height: 1.0,
              });
            }}
          />
        }
      >
        {scene.openings.length === 0 && <Empty>Aucune ouverture</Empty>}
        {scene.openings.map((o) => (
          <OpeningItem
            key={o.id}
            opening={o}
            active={selection?.kind === "opening" && selection.id === o.id}
            onClick={() => setSelection({ kind: "opening", id: o.id })}
          />
        ))}
      </Section>

      <Section
        title="Étagères encastrées"
        action={
          <AddButton
            onClick={() => {
              const wallId: WallId = "north";
              const wl = wallLength(scene.room, wallId);
              addShelf({
                wallId,
                x: Math.max(0, wl / 2 - 0.4),
                y: 0.9,
                width: 0.8,
                height: 0.3,
                depth: 0.3,
                color: "#a89a83",
              });
            }}
          />
        }
      >
        {scene.shelves.length === 0 && <Empty>Aucune étagère</Empty>}
        {scene.shelves.map((s) => (
          <ShelfItem
            key={s.id}
            shelf={s}
            active={selection?.kind === "shelf" && selection.id === s.id}
            onClick={() => setSelection({ kind: "shelf", id: s.id })}
          />
        ))}
      </Section>

      <Section
        title="Meubles"
        action={
          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className="btn-ghost text-text-muted hover:text-accent"
            title="Ouvrir le catalogue"
            aria-label="Ouvrir le catalogue"
          >
            <LayoutGrid className="size-4" />
          </button>
        }
      >
        {scene.furniture.length === 0 && (
          <div className="px-3 py-2 space-y-2">
            <p className="text-xs text-text-dim italic">Aucun meuble</p>
            <button
              type="button"
              className="btn w-full text-xs"
              onClick={() => setCatalogOpen(true)}
            >
              <LayoutGrid className="size-3.5" />
              Ouvrir le catalogue
            </button>
          </div>
        )}
        {scene.furniture.map((f) => (
          <FurnitureItem
            key={f.id}
            furniture={f}
            active={selection?.kind === "furniture" && selection.id === f.id}
            onClick={() => setSelection({ kind: "furniture", id: f.id })}
          />
        ))}
      </Section>

      {catalogOpen && (
        <FurnitureCatalog
          onClose={() => setCatalogOpen(false)}
          onPick={(preset) => {
            addFurniture(createFurnitureFromPreset(preset));
          }}
        />
      )}
    </aside>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-soft">
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          {title}
        </h3>
        {action}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function WallRow({
  wallId,
  label,
  active,
  hidden,
  onClick,
}: {
  wallId: WallId;
  label: string;
  active: boolean;
  hidden: boolean;
  onClick: () => void;
}) {
  const setWallHidden = useEditor((s) => s.setWallHidden);
  return (
    <div
      className={`group flex items-center transition ${
        active
          ? "bg-bg-panel text-text border-l-2 border-accent"
          : "hover:bg-bg-panel"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWallHidden(wallId, !hidden);
        }}
        title={hidden ? "Afficher le mur" : "Masquer le mur"}
        aria-label={hidden ? "Afficher le mur" : "Masquer le mur"}
        className={`px-2 py-1.5 ${active ? "" : "pl-3"} ${
          hidden ? "text-text-dim" : "text-text-muted"
        } hover:text-accent`}
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center gap-2 pr-3 py-1.5 text-sm text-left ${
          hidden
            ? "text-text-dim italic line-through decoration-text-dim/40"
            : active
              ? "text-text"
              : "text-text-muted"
        }`}
      >
        <span className="truncate flex-1">{label}</span>
        <ChevronRight className="size-3 text-text-dim" />
      </button>
    </div>
  );
}

function Item({
  label,
  active,
  onClick,
  hint,
  swatch,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hint?: string;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition ${
        active
          ? "bg-bg-panel text-text border-l-2 border-accent pl-[10px]"
          : "text-text-muted hover:bg-bg-panel hover:text-text"
      }`}
    >
      {swatch && (
        <span
          className="size-3 rounded-sm border border-border"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span className="truncate flex-1">{label}</span>
      {hint && <span className="text-xs text-text-dim">{hint}</span>}
      <ChevronRight className="size-3 text-text-dim" />
    </button>
  );
}

function OpeningItem({
  opening,
  active,
  onClick,
}: {
  opening: Opening;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Item
      label={`${OPENING_LABELS[opening.kind]} (${WALL_LABELS[opening.wallId]})`}
      active={active}
      onClick={onClick}
      hint={`${opening.width.toFixed(2)}×${opening.height.toFixed(2)}m`}
    />
  );
}

function ShelfItem({
  shelf,
  active,
  onClick,
}: {
  shelf: Shelf;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Item
      label={`Étagère (${WALL_LABELS[shelf.wallId]})`}
      active={active}
      onClick={onClick}
      swatch={shelf.color}
    />
  );
}

function FurnitureItem({
  furniture,
  active,
  onClick,
}: {
  furniture: Furniture;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Item
      label={furniture.name}
      active={active}
      onClick={onClick}
      swatch={furniture.color}
    />
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-ghost text-text-muted hover:text-accent"
      aria-label="Ajouter"
    >
      <Plus className="size-4" />
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-2 text-xs text-text-dim italic">{children}</p>
  );
}

// (kept for type-checking external imports)
export type { Selection };
