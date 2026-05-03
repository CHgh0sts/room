import type { Room, WallId } from "./schema";
import { wallLength } from "./schema";

export const WALL_THICKNESS = 0.06;

export type WallTransform = {
  position: [number, number, number];
  rotationY: number;
  length: number;
};

/**
 * Place chaque mur de sorte que sa face intérieure soit alignée au bord
 * intérieur de la pièce, et que la coordonnée locale `u` parcoure le mur de
 * gauche à droite tel que vu depuis l'intérieur de la pièce.
 *
 * Convention locale du mesh extrudé (avant la transform du group) :
 *   - axe X local : u (largeur du mur), centré (0 au milieu)
 *   - axe Y local : hauteur du mur (0 = sol, +Y = plafond)
 *   - axe Z local : épaisseur du mur, intérieur = -Z
 */
export function getWallTransform(room: Room, wallId: WallId): WallTransform {
  const length = wallLength(room, wallId);
  switch (wallId) {
    case "north":
      return {
        position: [0, 0, -room.depth / 2],
        rotationY: 0,
        length,
      };
    case "south":
      return {
        position: [0, 0, room.depth / 2],
        rotationY: Math.PI,
        length,
      };
    case "east":
      return {
        position: [room.width / 2, 0, 0],
        rotationY: -Math.PI / 2,
        length,
      };
    case "west":
      return {
        position: [-room.width / 2, 0, 0],
        rotationY: Math.PI / 2,
        length,
      };
  }
}

/**
 * Convertit une position locale (u, v, depthIn) sur un mur en position monde.
 *  - u = position horizontale, 0 = bord gauche du mur (vu de l'intérieur)
 *  - v = hauteur (0 = sol)
 *  - depthIn = profondeur vers l'intérieur de la pièce (>= 0)
 */
export function localOnWallToWorld(
  room: Room,
  wallId: WallId,
  u: number,
  v: number,
  depthIn: number,
): [number, number, number] {
  const t = getWallTransform(room, wallId);
  // Local: x = u - length/2, y = v, z = -depthIn (intérieur)
  const lx = u - t.length / 2;
  const ly = v;
  const lz = -depthIn;
  const cos = Math.cos(t.rotationY);
  const sin = Math.sin(t.rotationY);
  // rotation autour de Y : (x,z) -> (x cos + z sin, -x sin + z cos)
  const wx = t.position[0] + lx * cos + lz * sin;
  const wy = t.position[1] + ly;
  const wz = t.position[2] + (-lx * sin + lz * cos);
  return [wx, wy, wz];
}
