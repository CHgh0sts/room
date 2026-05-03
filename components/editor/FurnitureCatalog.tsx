"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import {
  CATEGORIES,
  PRESETS,
  createFurnitureFromPreset,
  type FurniturePreset,
  type PresetCategory,
} from "@/lib/scene/presets";
import { renderPresetThumbnail } from "@/lib/scene/thumbnail";

export default function FurnitureCatalog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (preset: FurniturePreset) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<PresetCategory | "Tous">("Tous");

  // Lock scroll + escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRESETS.filter((p) => {
      if (activeCat !== "Tous" && p.category !== activeCat) return false;
      if (!q) return true;
      return (
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCat]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="font-medium text-text">Catalogue de meubles</h2>
            <p className="text-xs text-text-dim">
              Choisissez un modèle prêt à l’emploi. Vous pourrez ensuite
              ajuster ses dimensions, sa couleur et sa rotation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher un meuble…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <CatChip
              active={activeCat === "Tous"}
              onClick={() => setActiveCat("Tous")}
              label="Tous"
            />
            {CATEGORIES.map((c) => (
              <CatChip
                key={c}
                active={activeCat === c}
                onClick={() => setActiveCat(c)}
                label={c}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-dim italic text-center py-10">
              Aucun meuble ne correspond.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  onClick={() => {
                    onPick(p);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs border transition ${
        active
          ? "bg-accent-soft text-text border-accent"
          : "border-border text-text-muted hover:text-text hover:bg-bg-panel"
      }`}
    >
      {label}
    </button>
  );
}

function PresetCard({
  preset,
  onClick,
}: {
  preset: FurniturePreset;
  onClick: () => void;
}) {
  const data = useMemo(() => createFurnitureFromPreset(preset), [preset]);
  return (
    <button
      type="button"
      onClick={onClick}
      className="card hover:border-accent text-left flex flex-col overflow-hidden transition group"
    >
      <div className="aspect-[4/3] bg-bg flex items-center justify-center border-b border-border-soft">
        <PresetThumbnail preset={preset} fallbackColor={data.color} />
      </div>
      <div className="p-2.5">
        <div className="text-sm font-medium text-text truncate">
          {preset.label}
        </div>
        <div className="text-[11px] text-text-dim line-clamp-2 mt-0.5">
          {preset.description}
        </div>
        <div className="text-[10px] text-text-dim mt-1.5 uppercase tracking-wider">
          {preset.category} · {data.width.toFixed(2)}×{data.depth.toFixed(2)}m
        </div>
      </div>
    </button>
  );
}

/**
 * Miniature : rendu 3D one-shot (Three.js) capturé en PNG et affiché en
 * <img>. Le rendu est mis en cache à vie du module via `renderPresetThumbnail`.
 *
 * Si WebGL n'est pas disponible (ex : SSR) on retombe sur un bloc coloré.
 */
function PresetThumbnail({
  preset,
  fallbackColor,
}: {
  preset: FurniturePreset;
  fallbackColor: string;
}) {
  const W = 240;
  const H = 180;
  const [src, setSrc] = useState<string | null>(null);

  // useLayoutEffect évite le flash du fallback quand l'image est déjà en
  // cache : la miniature est posée avant le premier paint.
  useLayoutEffect(() => {
    const url = renderPresetThumbnail(preset, W, H);
    setSrc(url);
  }, [preset]);

  if (!src) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: fallbackColor + "22" }}
      >
        <div
          className="w-1/2 h-1/2 rounded"
          style={{ backgroundColor: fallbackColor }}
        />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={preset.label}
      width={W}
      height={H}
      className="max-w-full max-h-full object-contain"
      draggable={false}
    />
  );
}
