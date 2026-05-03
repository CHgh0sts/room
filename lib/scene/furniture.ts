import type { Furniture, FurniturePart } from "./schema";
import { getPresetDefaultDims } from "./presets";

/**
 * Renvoie le facteur d'échelle courant (current / partsRef) appliqué aux
 * parties d'un meuble. Si le meuble n'a pas de parts ou pas de référence,
 * renvoie [1, 1, 1].
 */
export function getPartsScale(
  furniture: Furniture,
): [number, number, number] {
  if (!furniture.parts || furniture.parts.length === 0) return [1, 1, 1];
  const ref =
    furniture.partsRef ??
    (furniture.presetId ? getPresetDefaultDims(furniture.presetId) : null);
  if (!ref) return [1, 1, 1];
  return [
    furniture.width / ref.width,
    furniture.height / ref.height,
    furniture.depth / ref.depth,
  ];
}

/**
 * "Fige" le scale courant dans les coordonnées des parts : applique le ratio
 * (width/partsRef.width, etc.) à chaque pièce, puis remet `partsRef` aux
 * dimensions courantes (donc scale = 1 après).
 *
 * Utile avant toute édition fine d'une pièce : sinon les modifications
 * faites par l'utilisateur dans le repère "référence" seraient ensuite
 * re-multipliées par le scale, ce qui est très contre-intuitif.
 */
export function bakePartsScale(furniture: Furniture): Furniture {
  if (!furniture.parts || furniture.parts.length === 0) return furniture;
  const [sx, sy, sz] = getPartsScale(furniture);
  const isUnit = sx === 1 && sy === 1 && sz === 1;
  const hasRef = !!furniture.partsRef;
  if (isUnit && hasRef) return furniture;

  const baked: FurniturePart[] = furniture.parts.map((p) => ({
    ...p,
    x: round(p.x * sx),
    y: round(p.y * sy),
    z: round(p.z * sz),
    width: round(p.width * sx),
    height: round(p.height * sy),
    depth: round(p.depth * sz),
  }));

  return {
    ...furniture,
    parts: baked,
    partsRef: {
      width: furniture.width,
      height: furniture.height,
      depth: furniture.depth,
    },
  };
}

/**
 * Recalcule la bounding box d'un meuble à partir de ses parts (englobe
 * toutes les pièces, centrée sur l'origine locale du meuble).
 *
 * Renvoie aussi l'offset à appliquer aux parts pour les recentrer si le
 * centre géométrique a bougé. Utilisé après ajout/suppression/redim de
 * pièces pour garder le bbox synchronisé.
 */
export function recomputeBoundingBox(parts: FurniturePart[]): {
  width: number;
  height: number;
  depth: number;
  centerOffset: { x: number; y: number; z: number };
} {
  if (parts.length === 0) {
    return { width: 0.1, height: 0.1, depth: 0.1, centerOffset: { x: 0, y: 0, z: 0 } };
  }
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of parts) {
    minX = Math.min(minX, p.x - p.width / 2);
    maxX = Math.max(maxX, p.x + p.width / 2);
    minY = Math.min(minY, p.y - p.height / 2);
    maxY = Math.max(maxY, p.y + p.height / 2);
    minZ = Math.min(minZ, p.z - p.depth / 2);
    maxZ = Math.max(maxZ, p.z + p.depth / 2);
  }
  return {
    width: round(maxX - minX),
    height: round(maxY - minY),
    depth: round(maxZ - minZ),
    centerOffset: {
      x: round((minX + maxX) / 2),
      y: round((minY + maxY) / 2),
      z: round((minZ + maxZ) / 2),
    },
  };
}

/**
 * Force une pièce à tenir dans la bounding box du meuble (en repère local
 * non scalé). Si la pièce est plus grande que la bbox sur un axe, on la
 * réduit à la taille de la bbox et on la recentre sur 0. Sinon, on translate
 * son centre dans l'intervalle valide.
 */
export function clampPartInBBox(
  part: FurniturePart,
  bbox: { width: number; height: number; depth: number },
): FurniturePart {
  const out = { ...part };
  // Triplets [axe, clé de taille, taille de la bbox sur cet axe].
  const cfg: Array<["x" | "y" | "z", "width" | "height" | "depth", number]> = [
    ["x", "width", bbox.width],
    ["y", "height", bbox.height],
    ["z", "depth", bbox.depth],
  ];
  for (const [axis, sizeKey, bb] of cfg) {
    let size = out[sizeKey];
    if (size > bb) {
      size = bb;
      out[sizeKey] = round(size);
      out[axis] = 0;
    } else {
      const half = bb / 2;
      const min = -half + size / 2;
      const max = half - size / 2;
      out[axis] = round(Math.max(min, Math.min(max, out[axis])));
    }
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
