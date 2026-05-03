import { create } from "zustand";
import {
  defaultScene,
  type Furniture,
  type FurniturePart,
  type Opening,
  type Shelf,
  type SceneState,
  type WallId,
  type WallOverride,
  type WallSlope,
} from "@/lib/scene/schema";
import { bakePartsScale, clampPartInBBox } from "@/lib/scene/furniture";

export type ViewMode = "3d" | "2d";
export type TransformMode = "translate" | "rotate";

export type Selection =
  | { kind: "room" }
  | { kind: "wall"; id: WallId }
  | { kind: "opening"; id: string }
  | { kind: "shelf"; id: string }
  | { kind: "furniture"; id: string }
  | null;

type EditorState = {
  projectId: string | null;
  projectName: string;
  scene: SceneState;
  selection: Selection;
  // Index de la pièce du meuble courante actuellement éditée dans le
  // mini-éditeur 2D. Utilisé pour mettre en surbrillance cette pièce dans
  // la scène 3D. Réinitialisé à null quand la sélection de meuble change.
  selectedPartIndex: number | null;
  viewMode: ViewMode;
  transformMode: TransformMode;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;

  init: (params: { projectId: string; name: string; scene: SceneState }) => void;
  setSelection: (s: Selection) => void;
  setSelectedPartIndex: (i: number | null) => void;
  setViewMode: (v: ViewMode) => void;
  setTransformMode: (m: TransformMode) => void;
  setProjectName: (name: string) => void;

  updateRoom: (patch: Partial<SceneState["room"]>) => void;
  setWallOverride: (id: WallId, color?: string) => void;
  setWallHidden: (id: WallId, hidden: boolean) => void;
  setWallSlope: (id: WallId, slope?: WallSlope) => void;

  addOpening: (o: Omit<Opening, "id">) => string;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  removeOpening: (id: string) => void;

  addShelf: (s: Omit<Shelf, "id">) => string;
  updateShelf: (id: string, patch: Partial<Shelf>) => void;
  removeShelf: (id: string) => void;

  addFurniture: (f: Omit<Furniture, "id">) => string;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;
  removeFurniture: (id: string) => void;

  // Édition fine des parties d'un meuble (mini-éditeur 2D du meuble).
  // Toutes ces actions "bakent" d'abord le scale courant : les parts sont
  // ré-exprimées dans le repère où la bbox courante = partsRef, donc
  // l'utilisateur travaille sur les valeurs absolues affichées.
  updateFurniturePart: (
    furnitureId: string,
    partIndex: number,
    patch: Partial<FurniturePart>,
  ) => void;
  addFurniturePart: (furnitureId: string, part: FurniturePart) => void;
  removeFurniturePart: (furnitureId: string, partIndex: number) => void;

  markSaving: (saving: boolean) => void;
  markSaved: () => void;
};

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const useEditor = create<EditorState>((set, get) => ({
  projectId: null,
  projectName: "",
  scene: defaultScene(),
  selection: { kind: "room" },
  selectedPartIndex: null,
  viewMode: "3d",
  transformMode: "translate",
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  init: ({ projectId, name, scene }) =>
    set({
      projectId,
      projectName: name,
      scene,
      selection: { kind: "room" },
      selectedPartIndex: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: Date.now(),
    }),

  setSelection: (s) =>
    set((st) => {
      // Réinitialise l'index de pièce quand on change de meuble (ou qu'on
      // sélectionne autre chose qu'un meuble).
      const sameFurniture =
        s?.kind === "furniture" &&
        st.selection?.kind === "furniture" &&
        s.id === st.selection.id;
      return {
        selection: s,
        selectedPartIndex: sameFurniture ? st.selectedPartIndex : null,
      };
    }),
  setSelectedPartIndex: (i) => set({ selectedPartIndex: i }),
  setViewMode: (v) => set({ viewMode: v }),
  setTransformMode: (m) => set({ transformMode: m }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  updateRoom: (patch) =>
    set((st) => ({
      scene: { ...st.scene, room: { ...st.scene.room, ...patch } },
      isDirty: true,
    })),

  setWallOverride: (id, color) =>
    set((st) => {
      const existing = st.scene.walls.find((w) => w.id === id);
      const others = st.scene.walls.filter((w) => w.id !== id);
      const merged: WallOverride = { ...(existing ?? { id }), id, color };
      const next: WallOverride[] = wallOverrideHasContent(merged)
        ? [...others, merged]
        : others;
      return { scene: { ...st.scene, walls: next }, isDirty: true };
    }),

  setWallHidden: (id, hidden) =>
    set((st) => {
      const existing = st.scene.walls.find((w) => w.id === id);
      const others = st.scene.walls.filter((w) => w.id !== id);
      const merged: WallOverride = {
        ...(existing ?? { id }),
        id,
        hidden: hidden || undefined,
      };
      const next: WallOverride[] = wallOverrideHasContent(merged)
        ? [...others, merged]
        : others;
      return { scene: { ...st.scene, walls: next }, isDirty: true };
    }),

  setWallSlope: (id, slope) =>
    set((st) => {
      const existing = st.scene.walls.find((w) => w.id === id);
      const others = st.scene.walls.filter((w) => w.id !== id);
      const merged: WallOverride = {
        ...(existing ?? { id }),
        id,
        slope,
      };
      const next: WallOverride[] = wallOverrideHasContent(merged)
        ? [...others, merged]
        : others;
      return { scene: { ...st.scene, walls: next }, isDirty: true };
    }),

  addOpening: (o) => {
    const id = uid("op");
    set((st) => ({
      scene: { ...st.scene, openings: [...st.scene.openings, { ...o, id }] },
      selection: { kind: "opening", id },
      isDirty: true,
    }));
    return id;
  },
  updateOpening: (id, patch) =>
    set((st) => ({
      scene: {
        ...st.scene,
        openings: st.scene.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      },
      isDirty: true,
    })),
  removeOpening: (id) =>
    set((st) => ({
      scene: { ...st.scene, openings: st.scene.openings.filter((o) => o.id !== id) },
      selection:
        st.selection?.kind === "opening" && st.selection.id === id ? null : st.selection,
      isDirty: true,
    })),

  addShelf: (s) => {
    const id = uid("sh");
    set((st) => ({
      scene: { ...st.scene, shelves: [...st.scene.shelves, { ...s, id }] },
      selection: { kind: "shelf", id },
      isDirty: true,
    }));
    return id;
  },
  updateShelf: (id, patch) =>
    set((st) => ({
      scene: {
        ...st.scene,
        shelves: st.scene.shelves.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
      isDirty: true,
    })),
  removeShelf: (id) =>
    set((st) => ({
      scene: { ...st.scene, shelves: st.scene.shelves.filter((s) => s.id !== id) },
      selection:
        st.selection?.kind === "shelf" && st.selection.id === id ? null : st.selection,
      isDirty: true,
    })),

  addFurniture: (f) => {
    const id = uid("fu");
    set((st) => ({
      scene: { ...st.scene, furniture: [...st.scene.furniture, { ...f, id }] },
      selection: { kind: "furniture", id },
      isDirty: true,
    }));
    return id;
  },
  updateFurniture: (id, patch) =>
    set((st) => ({
      scene: {
        ...st.scene,
        furniture: st.scene.furniture.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      },
      isDirty: true,
    })),
  removeFurniture: (id) =>
    set((st) => ({
      scene: { ...st.scene, furniture: st.scene.furniture.filter((f) => f.id !== id) },
      selection:
        st.selection?.kind === "furniture" && st.selection.id === id
          ? null
          : st.selection,
      isDirty: true,
    })),

  updateFurniturePart: (furnitureId, partIndex, patch) =>
    set((st) => ({
      scene: {
        ...st.scene,
        furniture: st.scene.furniture.map((f) => {
          if (f.id !== furnitureId) return f;
          const baked = bakePartsScale(f);
          if (!baked.parts || partIndex < 0 || partIndex >= baked.parts.length) {
            return baked;
          }
          const merged = { ...baked.parts[partIndex], ...patch };
          const clamped = clampPartInBBox(merged, baked);
          const nextParts = baked.parts.map((p, i) =>
            i === partIndex ? clamped : p,
          );
          return { ...baked, parts: nextParts };
        }),
      },
      isDirty: true,
    })),

  addFurniturePart: (furnitureId, part) =>
    set((st) => ({
      scene: {
        ...st.scene,
        furniture: st.scene.furniture.map((f) => {
          if (f.id !== furnitureId) return f;
          const baked = bakePartsScale(f);
          const clamped = clampPartInBBox(part, baked);
          const nextParts: FurniturePart[] = [...(baked.parts ?? []), clamped];
          return { ...baked, parts: nextParts };
        }),
      },
      isDirty: true,
    })),

  removeFurniturePart: (furnitureId, partIndex) =>
    set((st) => {
      const sel = st.selectedPartIndex;
      let nextSel = sel;
      if (sel !== null) {
        if (sel === partIndex) nextSel = null;
        else if (sel > partIndex) nextSel = sel - 1;
      }
      return {
        scene: {
          ...st.scene,
          furniture: st.scene.furniture.map((f) => {
            if (f.id !== furnitureId) return f;
            const baked = bakePartsScale(f);
            if (
              !baked.parts ||
              partIndex < 0 ||
              partIndex >= baked.parts.length
            ) {
              return baked;
            }
            const nextParts = baked.parts.filter((_, i) => i !== partIndex);
            return { ...baked, parts: nextParts };
          }),
        },
        selectedPartIndex: nextSel,
        isDirty: true,
      };
    }),

  markSaving: (saving) => set({ isSaving: saving }),
  markSaved: () => set({ isDirty: false, isSaving: false, lastSavedAt: Date.now() }),
}));

export function getWallColor(state: SceneState, wallId: WallId): string {
  const override = state.walls.find((w) => w.id === wallId);
  return override?.color ?? state.room.wallColor;
}

export function isWallHidden(state: SceneState, wallId: WallId): boolean {
  const override = state.walls.find((w) => w.id === wallId);
  return !!override?.hidden;
}

export function getWallSlope(
  state: SceneState,
  wallId: WallId,
): WallSlope | undefined {
  const override = state.walls.find((w) => w.id === wallId);
  return override?.slope;
}

/** Vrai si l'override porte au moins une info utile (sinon on peut le drop). */
function wallOverrideHasContent(o: WallOverride): boolean {
  return (
    o.color !== undefined || o.hidden !== undefined || o.slope !== undefined
  );
}
