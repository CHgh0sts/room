import { z } from "zod";

const colorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const color = z.string().regex(colorRegex, "Couleur hex invalide");

const positiveSize = z.number().positive().max(100);
const nonNegSize = z.number().min(0).max(100);

export const wallIdSchema = z.enum(["north", "east", "south", "west"]);
export type WallId = z.infer<typeof wallIdSchema>;

export const roomSchema = z.object({
  width: positiveSize.default(4),
  depth: positiveSize.default(3),
  height: positiveSize.default(2.5),
  floorColor: color.default("#cfc6b8"),
  wallColor: color.default("#e8e6e1"),
});
export type Room = z.infer<typeof roomSchema>;

/**
 * Pente d'un mur mansardé : hauteurs (en mètres) au bord gauche et au
 * bord droit du mur, vu depuis l'intérieur de la pièce. Si non défini,
 * le mur est rectangulaire et utilise `room.height`.
 */
export const wallSlopeSchema = z.object({
  leftHeight: z.number().positive().max(100),
  rightHeight: z.number().positive().max(100),
});
export type WallSlope = z.infer<typeof wallSlopeSchema>;

export const wallOverrideSchema = z.object({
  id: wallIdSchema,
  color: color.optional(),
  hidden: z.boolean().optional(),
  slope: wallSlopeSchema.optional(),
});
export type WallOverride = z.infer<typeof wallOverrideSchema>;

export const openingKindSchema = z.enum(["window", "door"]);
export type OpeningKind = z.infer<typeof openingKindSchema>;

export const openingSchema = z.object({
  id: z.string().min(1),
  wallId: wallIdSchema,
  kind: openingKindSchema,
  // Position locale sur le mur, mesurée depuis le coin gauche du mur.
  x: nonNegSize,
  y: nonNegSize, // toujours 0 pour une porte (UI le force)
  width: positiveSize,
  height: positiveSize,
});
export type Opening = z.infer<typeof openingSchema>;

export const shelfSchema = z.object({
  id: z.string().min(1),
  wallId: wallIdSchema,
  x: nonNegSize,
  y: nonNegSize,
  width: positiveSize,
  height: positiveSize,
  depth: z.number().positive().max(2).default(0.3),
  color: color.default("#a89a83"),
});
export type Shelf = z.infer<typeof shelfSchema>;

/**
 * Une "partie" d'un meuble composé : une boîte positionnée relativement au
 * centre du meuble. Les offsets x/y/z sont en mètres dans le repère LOCAL
 * du meuble (avant rotation). Si `color` est omis, la couleur principale du
 * meuble est utilisée.
 */
export const furniturePartSchema = z.object({
  x: z.number().min(-50).max(50),
  y: z.number().min(-50).max(50),
  z: z.number().min(-50).max(50),
  width: positiveSize,
  height: positiveSize,
  depth: positiveSize,
  color: color.optional(),
});
export type FurniturePart = z.infer<typeof furniturePartSchema>;

export const furnitureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  // Position du CENTRE du meuble en coordonnées monde (mètres). x/z dans le
  // plan du sol, y vertical (y = height/2 => meuble posé au sol).
  x: z.number().min(-50).max(50),
  y: z.number().min(-50).max(50),
  z: z.number().min(-50).max(50),
  // Dimensions de la boîte englobante (utilisées pour la sélection 2D et le
  // wireframe). Les `parts`, si présents, peuvent ne pas remplir toute la
  // boîte (ex : pieds + plateau d'un bureau).
  width: positiveSize, // X
  height: positiveSize, // Y
  depth: positiveSize, // Z
  // Rotations en radians, ordre Three.js par défaut (XYZ).
  rotationX: z.number().min(-Math.PI * 2).max(Math.PI * 2).default(0),
  rotationY: z.number().min(-Math.PI * 2).max(Math.PI * 2).default(0),
  rotationZ: z.number().min(-Math.PI * 2).max(Math.PI * 2).default(0),
  color: color.default("#8a8f9a"),
  // Si présent et non vide, le meuble est composé de plusieurs sous-boîtes.
  // Sinon, on rend une seule boîte de taille (width, height, depth).
  parts: z.array(furniturePartSchema).optional(),
  // Dimensions d'origine du bbox au moment où `parts` a été défini. Sert à
  // calculer un facteur d'échelle à appliquer aux parties quand l'utilisateur
  // redimensionne le meuble : scale = (current / partsRef).
  partsRef: z
    .object({
      width: positiveSize,
      height: positiveSize,
      depth: positiveSize,
    })
    .optional(),
  // Si défini, le meuble provient d'un preset du catalogue.
  presetId: z.string().min(1).optional(),
});
export type Furniture = z.infer<typeof furnitureSchema>;

export const sceneStateSchema = z.object({
  version: z.literal(1).default(1),
  room: roomSchema,
  walls: z.array(wallOverrideSchema).default([]),
  openings: z.array(openingSchema).default([]),
  shelves: z.array(shelfSchema).default([]),
  furniture: z.array(furnitureSchema).default([]),
});
export type SceneState = z.infer<typeof sceneStateSchema>;

export const WALL_IDS: WallId[] = ["north", "east", "south", "west"];

export const WALL_LABELS: Record<WallId, string> = {
  north: "Nord",
  east: "Est",
  south: "Sud",
  west: "Ouest",
};

export const OPENING_LABELS: Record<OpeningKind, string> = {
  window: "Fenêtre",
  door: "Porte",
};

export function defaultScene(): SceneState {
  return sceneStateSchema.parse({
    version: 1,
    room: {
      width: 4,
      depth: 3,
      height: 2.5,
      floorColor: "#cfc6b8",
      wallColor: "#e8e6e1",
    },
    walls: [],
    openings: [],
    shelves: [],
    furniture: [],
  });
}

/**
 * Largeur d'un mur donné en mètres.
 * - north / south parcourent l'axe X => largeur = room.width
 * - east  / west  parcourent l'axe Z => largeur = room.depth
 */
export function wallLength(room: Room, wallId: WallId): number {
  return wallId === "north" || wallId === "south" ? room.width : room.depth;
}

/**
 * Hauteur du mur à une position `u` donnée (0 = bord gauche, wallLength = bord
 * droit, vu depuis l'intérieur). Pour un mur mansardé, interpole linéairement
 * entre `leftHeight` et `rightHeight`. Sans pente, renvoie room.height.
 */
export function wallHeightAt(
  room: Room,
  wallId: WallId,
  slope: WallSlope | undefined,
  u: number,
): number {
  if (!slope) return room.height;
  const len = wallLength(room, wallId);
  const t = len > 0 ? Math.max(0, Math.min(1, u / len)) : 0;
  return slope.leftHeight + (slope.rightHeight - slope.leftHeight) * t;
}
