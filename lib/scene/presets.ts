import type { Furniture, FurniturePart } from "./schema";

export type PresetCategory =
  | "Salon"
  | "Salle à manger"
  | "Chambre"
  | "Cuisine"
  | "Salle de bain"
  | "Bureau"
  | "Rangement"
  | "Autre";

/**
 * Un preset = un modèle de meuble paramétrable.
 *
 * `buildParts(w, h, d)` génère la liste des sous-boîtes pour la taille
 * englobante demandée. Cela permet de régénérer le meuble lorsque
 * l'utilisateur change ses dimensions.
 */
export type FurniturePreset = {
  id: string;
  label: string;
  description: string;
  category: PresetCategory;
  defaultName: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  defaultColor: string;
  buildParts: (dims: {
    width: number;
    height: number;
    depth: number;
  }) => FurniturePart[] | undefined;
};

/* ----------------------- Helpers de construction ----------------------- */

function topPanel(
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  thickness = 0.04,
): FurniturePart {
  return {
    x: 0,
    y: bbHeight / 2 - thickness / 2,
    z: 0,
    width: bbWidth,
    height: thickness,
    depth: bbDepth,
  };
}

function fourLegs(
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  topThickness = 0.04,
  legSize = 0.05,
  insetX = 0.02,
  insetZ = 0.02,
): FurniturePart[] {
  const legHeight = bbHeight - topThickness;
  const legY = -bbHeight / 2 + legHeight / 2;
  const dx = bbWidth / 2 - legSize / 2 - insetX;
  const dz = bbDepth / 2 - legSize / 2 - insetZ;
  return [
    [-dx, legY, -dz],
    [dx, legY, -dz],
    [-dx, legY, dz],
    [dx, legY, dz],
  ].map(([x, y, z]) => ({
    x,
    y,
    z,
    width: legSize,
    height: legHeight,
    depth: legSize,
  }));
}

function cabinet(
  side: "left" | "right",
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  cabWidth: number,
  topThickness = 0.04,
): FurniturePart {
  const cabHeight = bbHeight - topThickness;
  const cy = -bbHeight / 2 + cabHeight / 2;
  const cx =
    side === "left" ? -bbWidth / 2 + cabWidth / 2 : bbWidth / 2 - cabWidth / 2;
  return {
    x: cx,
    y: cy,
    z: 0,
    width: cabWidth,
    height: cabHeight,
    depth: bbDepth - 0.02,
  };
}

function drawerFronts(
  side: "left" | "right",
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  cabWidth: number,
  count: number,
  color: string,
  topThickness = 0.04,
): FurniturePart[] {
  const cabHeight = bbHeight - topThickness;
  const cabBottom = -bbHeight / 2;
  const cabCx =
    side === "left" ? -bbWidth / 2 + cabWidth / 2 : bbWidth / 2 - cabWidth / 2;
  const drawerH = cabHeight / count;
  const out: FurniturePart[] = [];
  for (let i = 0; i < count; i++) {
    const cy = cabBottom + drawerH * (i + 0.5);
    out.push({
      x: cabCx,
      y: cy,
      z: bbDepth / 2 - 0.012,
      width: cabWidth - 0.04,
      height: drawerH * 0.85,
      depth: 0.01,
      color,
    });
  }
  return out;
}

function legsAtTwoCorners(
  side: "left" | "right",
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  topThickness = 0.04,
  legSize = 0.05,
): FurniturePart[] {
  const legHeight = bbHeight - topThickness;
  const legY = -bbHeight / 2 + legHeight / 2;
  const xSign = side === "left" ? -1 : 1;
  const dx = (bbWidth / 2 - legSize / 2 - 0.02) * xSign;
  const dz = bbDepth / 2 - legSize / 2 - 0.02;
  return [
    { x: dx, y: legY, z: -dz, width: legSize, height: legHeight, depth: legSize },
    { x: dx, y: legY, z: dz, width: legSize, height: legHeight, depth: legSize },
  ];
}

/** Caisson plein avec un panneau "porte" sur la face avant (+Z). */
function cabinetWithDoor(
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  bodyColor: string,
  doorColor: string,
  doorThk = 0.02,
): FurniturePart[] {
  return [
    {
      x: 0,
      y: 0,
      z: -doorThk / 2,
      width: bbWidth,
      height: bbHeight,
      depth: bbDepth - doorThk,
      color: bodyColor,
    },
    {
      x: 0,
      y: 0,
      z: bbDepth / 2 - doorThk / 2,
      width: bbWidth - 0.01,
      height: bbHeight - 0.01,
      depth: doorThk,
      color: doorColor,
    },
  ];
}

/** Génère N panneaux de portes côte à côte sur la face avant (+Z). */
function doorRow(
  bbWidth: number,
  bbHeight: number,
  bbDepth: number,
  count: number,
  color: string,
  doorThk = 0.02,
): FurniturePart[] {
  const out: FurniturePart[] = [];
  const dw = bbWidth / count;
  for (let i = 0; i < count; i++) {
    out.push({
      x: -bbWidth / 2 + dw * (i + 0.5),
      y: 0,
      z: bbDepth / 2 - doorThk / 2,
      width: dw - 0.01,
      height: bbHeight - 0.02,
      depth: doorThk,
      color,
    });
  }
  return out;
}

/**
 * Construit l'écran d'une TV : coque sombre + dalle légèrement en relief
 * sur la face avant (+Z). `screenH` et `screenD` permettent de placer
 * l'écran dans une bbox plus grande (ex : TV avec pied).
 */
function tvScreenParts(
  bbWidth: number,
  screenH: number,
  screenD: number,
  yCenter = 0,
  zCenter = 0,
): FurniturePart[] {
  const bezel = 0.012;
  const dalleThk = 0.005;
  return [
    // Coque arrière + cadre.
    {
      x: 0,
      y: yCenter,
      z: zCenter,
      width: bbWidth,
      height: screenH,
      depth: screenD,
      color: "#1a1a1e",
    },
    // Dalle (face avant).
    {
      x: 0,
      y: yCenter,
      z: zCenter + screenD / 2 - dalleThk / 2,
      width: bbWidth - bezel * 2,
      height: screenH - bezel * 2,
      depth: dalleThk,
      color: "#0a0a0c",
    },
  ];
}

/* ----------------------------- Couleurs ----------------------------- */

const WOOD = "#9a7a4f";
const WOOD_DARK = "#6b4a2b";
const WOOD_LIGHT = "#c8a878";
const FABRIC = "#6c7480";
const FABRIC_LIGHT = "#a6acb6";
const METAL = "#3a3a40";
const METAL_LIGHT = "#9aa0a6";
const MATTRESS = "#e6e2d5";
const WHITE = "#ececec";
const PORCELAIN = "#f4f4f4";
const GLASS = "#9bc3d4";
const STONE = "#5a5a62";
const TV_BEZEL = "#1a1a1e";
const TV_SCREEN = "#0a0a0c";

/* ----------------------------- Presets ----------------------------- */

export const PRESETS: FurniturePreset[] = [
  /* =========================================================== */
  /* SALON                                                       */
  /* =========================================================== */
  {
    id: "sofa_2",
    label: "Canapé 2 places",
    description: "Base, dossier, accoudoirs.",
    category: "Salon",
    defaultName: "Canapé 2 places",
    defaultWidth: 1.6,
    defaultHeight: 0.85,
    defaultDepth: 0.9,
    defaultColor: FABRIC,
    buildParts: ({ width: w, height: h, depth: d }) => sofaParts(w, h, d),
  },
  {
    id: "sofa_3",
    label: "Canapé 3 places",
    description: "Canapé long, base + dossier + accoudoirs.",
    category: "Salon",
    defaultName: "Canapé 3 places",
    defaultWidth: 2.2,
    defaultHeight: 0.85,
    defaultDepth: 0.9,
    defaultColor: FABRIC,
    buildParts: ({ width: w, height: h, depth: d }) => sofaParts(w, h, d),
  },
  {
    id: "armchair",
    label: "Fauteuil",
    description: "Assise rembourrée, accoudoirs, dossier.",
    category: "Salon",
    defaultName: "Fauteuil",
    defaultWidth: 0.85,
    defaultHeight: 0.85,
    defaultDepth: 0.85,
    defaultColor: FABRIC,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const baseH = h * 0.53;
      const armW = Math.min(0.14, w * 0.18);
      return [
        { x: 0, y: -h / 2 + baseH / 2, z: 0, width: w, height: baseH, depth: d },
        {
          x: 0,
          y: -h / 2 + baseH + (h - baseH) / 2,
          z: -d / 2 + 0.06,
          width: w,
          height: h - baseH,
          depth: 0.12,
        },
        {
          x: -w / 2 + armW / 2,
          y: -h / 2 + baseH + 0.1,
          z: 0,
          width: armW,
          height: 0.2,
          depth: d - 0.12,
        },
        {
          x: w / 2 - armW / 2,
          y: -h / 2 + baseH + 0.1,
          z: 0,
          width: armW,
          height: 0.2,
          depth: d - 0.12,
        },
      ];
    },
  },
  {
    id: "pouf",
    label: "Pouf",
    description: "Petit siège bas rembourré, sans dossier.",
    category: "Salon",
    defaultName: "Pouf",
    defaultWidth: 0.45,
    defaultHeight: 0.4,
    defaultDepth: 0.45,
    defaultColor: FABRIC_LIGHT,
    buildParts: ({ width: w, height: h, depth: d }) => [
      { x: 0, y: 0, z: 0, width: w, height: h, depth: d },
    ],
  },
  {
    id: "coffee_table",
    label: "Table basse",
    description: "Plateau bas, 4 pieds courts.",
    category: "Salon",
    defaultName: "Table basse",
    defaultWidth: 1.0,
    defaultHeight: 0.4,
    defaultDepth: 0.55,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.04),
      ...fourLegs(w, h, d, 0.04, 0.05, 0.03, 0.03),
    ],
  },
  {
    id: "side_table",
    label: "Table d'appoint",
    description: "Petite table carrée à mettre à côté d'un canapé.",
    category: "Salon",
    defaultName: "Table d'appoint",
    defaultWidth: 0.5,
    defaultHeight: 0.55,
    defaultDepth: 0.5,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.03),
      ...fourLegs(w, h, d, 0.03, 0.04, 0.02, 0.02),
    ],
  },
  {
    id: "console_table",
    label: "Console",
    description: "Table fine et longue à poser contre un mur.",
    category: "Salon",
    defaultName: "Console",
    defaultWidth: 1.2,
    defaultHeight: 0.8,
    defaultDepth: 0.32,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.03),
      ...fourLegs(w, h, d, 0.03, 0.04, 0.03, 0.03),
    ],
  },
  {
    id: "tv_unit",
    label: "Meuble TV",
    description: "Meuble bas large pour TV.",
    category: "Salon",
    defaultName: "Meuble TV",
    defaultWidth: 1.6,
    defaultHeight: 0.45,
    defaultDepth: 0.4,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      { x: 0, y: 0, z: 0, width: w, height: h, depth: d - 0.02 },
      ...[-1, 0, 1].map<FurniturePart>((i) => ({
        x: i * (w / 3),
        y: 0,
        z: d / 2 - 0.012,
        width: w / 3 - 0.02,
        height: h - 0.04,
        depth: 0.012,
        color: WHITE,
      })),
    ],
  },
  {
    id: "tv_wall_43",
    label: "TV murale 43\"",
    description: "Écran plat 43 pouces, format mural fin.",
    category: "Salon",
    defaultName: "TV 43\"",
    defaultWidth: 0.96,
    defaultHeight: 0.58,
    defaultDepth: 0.06,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) =>
      tvScreenParts(w, h, d),
  },
  {
    id: "tv_wall_55",
    label: "TV murale 55\"",
    description: "Écran plat 55 pouces, format mural fin.",
    category: "Salon",
    defaultName: "TV 55\"",
    defaultWidth: 1.23,
    defaultHeight: 0.73,
    defaultDepth: 0.06,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) =>
      tvScreenParts(w, h, d),
  },
  {
    id: "tv_wall_65",
    label: "TV murale 65\"",
    description: "Écran plat 65 pouces, format mural fin.",
    category: "Salon",
    defaultName: "TV 65\"",
    defaultWidth: 1.45,
    defaultHeight: 0.85,
    defaultDepth: 0.07,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) =>
      tvScreenParts(w, h, d),
  },
  {
    id: "tv_wall_75",
    label: "TV murale 75\"",
    description: "Écran plat 75 pouces, grand format mural.",
    category: "Salon",
    defaultName: "TV 75\"",
    defaultWidth: 1.67,
    defaultHeight: 0.98,
    defaultDepth: 0.08,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) =>
      tvScreenParts(w, h, d),
  },
  {
    id: "tv_stand_central",
    label: "TV pied central 43\"",
    description: "TV 43\" sur pied central, à poser sur un meuble.",
    category: "Salon",
    defaultName: "TV pied central",
    defaultWidth: 0.96,
    defaultHeight: 0.7,
    defaultDepth: 0.25,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const standH = Math.min(0.13, h * 0.2);
      const baseH = 0.018;
      const screenH = h - standH;
      const screenD = Math.min(d, 0.06);
      const baseW = Math.min(0.42, w * 0.45);
      const baseD = Math.min(0.22, d * 0.95);
      const poleH = standH - baseH;
      return [
        ...tvScreenParts(w, screenH, screenD, h / 2 - screenH / 2, 0),
        // Pied central.
        {
          x: 0,
          y: -h / 2 + baseH + poleH / 2,
          z: 0,
          width: 0.1,
          height: poleH,
          depth: 0.04,
          color: TV_BEZEL,
        },
        // Base.
        {
          x: 0,
          y: -h / 2 + baseH / 2,
          z: 0,
          width: baseW,
          height: baseH,
          depth: baseD,
          color: TV_BEZEL,
        },
      ];
    },
  },
  {
    id: "tv_stand_legs",
    label: "TV 2 pieds 55\"",
    description: "TV 55\" avec 2 pieds latéraux, à poser sur un meuble.",
    category: "Salon",
    defaultName: "TV 2 pieds",
    defaultWidth: 1.23,
    defaultHeight: 0.85,
    defaultDepth: 0.25,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const standH = Math.min(0.13, h * 0.18);
      const screenH = h - standH;
      const screenD = Math.min(d, 0.06);
      const baseD = Math.min(0.22, d * 0.95);
      const legW = 0.06;
      const legD = baseD;
      const dx = w * 0.36;
      return [
        ...tvScreenParts(w, screenH, screenD, h / 2 - screenH / 2, 0),
        // 2 pieds latéraux.
        {
          x: -dx,
          y: -h / 2 + standH / 2,
          z: 0,
          width: legW,
          height: standH,
          depth: legD,
          color: TV_BEZEL,
        },
        {
          x: dx,
          y: -h / 2 + standH / 2,
          z: 0,
          width: legW,
          height: standH,
          depth: legD,
          color: TV_BEZEL,
        },
      ];
    },
  },
  {
    id: "tv_floor_tall",
    label: "TV sur trépied 75\"",
    description: "Grand écran 75\" autoporté sur pied haut, façon écran de présentation.",
    category: "Salon",
    defaultName: "TV trépied",
    defaultWidth: 1.7,
    defaultHeight: 1.95,
    defaultDepth: 0.55,
    defaultColor: TV_BEZEL,
    buildParts: ({ width: w, height: h, depth: d }) => {
      // Hauteur du pied : ~50 % de la hauteur totale (le bas de l'écran à
      // ~ hauteur de table). Base massive pour la stabilité visuelle.
      const standH = h * 0.5;
      const baseH = 0.04;
      const screenH = h - standH;
      const screenD = Math.min(d * 0.18, 0.08);
      const baseW = Math.min(0.7, w * 0.5);
      const baseD = Math.min(0.45, d * 0.85);
      const poleH = standH - baseH;
      return [
        ...tvScreenParts(w, screenH, screenD, h / 2 - screenH / 2, 0),
        // Mât central.
        {
          x: 0,
          y: -h / 2 + baseH + poleH / 2,
          z: 0,
          width: 0.08,
          height: poleH,
          depth: 0.06,
          color: TV_BEZEL,
        },
        // Base lourde.
        {
          x: 0,
          y: -h / 2 + baseH / 2,
          z: 0,
          width: baseW,
          height: baseH,
          depth: baseD,
          color: TV_BEZEL,
        },
      ];
    },
  },
  {
    id: "sideboard",
    label: "Buffet",
    description: "Meuble bas long avec 3 portes.",
    category: "Salon",
    defaultName: "Buffet",
    defaultWidth: 1.6,
    defaultHeight: 0.85,
    defaultDepth: 0.45,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const doorThk = 0.02;
      return [
        {
          x: 0,
          y: 0,
          z: -doorThk / 2,
          width: w,
          height: h,
          depth: d - doorThk,
        },
        ...doorRow(w, h, d, 3, WOOD_DARK),
      ];
    },
  },
  {
    id: "bookshelf",
    label: "Bibliothèque",
    description: "Étagère ouverte avec montants et plusieurs niveaux.",
    category: "Salon",
    defaultName: "Bibliothèque",
    defaultWidth: 0.8,
    defaultHeight: 1.8,
    defaultDepth: 0.3,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const sideThk = 0.025;
      const shelfThk = 0.022;
      const parts: FurniturePart[] = [
        {
          x: -w / 2 + sideThk / 2,
          y: 0,
          z: 0,
          width: sideThk,
          height: h,
          depth: d,
        },
        {
          x: w / 2 - sideThk / 2,
          y: 0,
          z: 0,
          width: sideThk,
          height: h,
          depth: d,
        },
      ];
      const shelves = Math.max(2, Math.round(h / 0.33) + 1);
      for (let i = 0; i < shelves; i++) {
        const t = i / (shelves - 1);
        const y = -h / 2 + t * h;
        parts.push({
          x: 0,
          y,
          z: 0,
          width: w - 2 * sideThk,
          height: shelfThk,
          depth: d - 0.01,
        });
      }
      return parts;
    },
  },
  {
    id: "cube_shelf",
    label: "Étagère cubes",
    description: "Étagère carrée à cases, idéale pour ranger.",
    category: "Salon",
    defaultName: "Étagère cubes",
    defaultWidth: 0.78,
    defaultHeight: 0.78,
    defaultDepth: 0.32,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const thk = 0.022;
      const parts: FurniturePart[] = [];
      // Cadre extérieur (bandes haut/bas/gauche/droite).
      parts.push({ x: 0, y: -h / 2 + thk / 2, z: 0, width: w, height: thk, depth: d });
      parts.push({ x: 0, y: h / 2 - thk / 2, z: 0, width: w, height: thk, depth: d });
      parts.push({ x: -w / 2 + thk / 2, y: 0, z: 0, width: thk, height: h, depth: d });
      parts.push({ x: w / 2 - thk / 2, y: 0, z: 0, width: thk, height: h, depth: d });
      // Séparateurs intérieurs (1 horizontal + 1 vertical, donne une grille 2x2).
      parts.push({ x: 0, y: 0, z: 0, width: w - 2 * thk, height: thk, depth: d });
      parts.push({ x: 0, y: 0, z: 0, width: thk, height: h - 2 * thk, depth: d });
      return parts;
    },
  },

  /* =========================================================== */
  /* SALLE À MANGER                                              */
  /* =========================================================== */
  {
    id: "dining_table",
    label: "Table à manger",
    description: "Grande table 4 pieds.",
    category: "Salle à manger",
    defaultName: "Table à manger",
    defaultWidth: 1.8,
    defaultHeight: 0.75,
    defaultDepth: 0.9,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.04),
      ...fourLegs(w, h, d, 0.04, 0.06, 0.06, 0.06),
    ],
  },
  {
    id: "chair",
    label: "Chaise",
    description: "Assise + dossier + 4 pieds.",
    category: "Salle à manger",
    defaultName: "Chaise",
    defaultWidth: 0.45,
    defaultHeight: 0.85,
    defaultDepth: 0.45,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const seatHeight = h * 0.53;
      const seatThk = 0.04;
      const seatY = -h / 2 + seatHeight + seatThk / 2;
      const seatTopY = seatY + seatThk / 2;
      const topY = h / 2;
      const backH = topY - seatTopY;
      const backY = (seatTopY + topY) / 2;
      const legHeight = seatHeight - seatThk / 2;
      const legY = -h / 2 + legHeight / 2;
      const legSize = 0.04;
      const dx = w / 2 - legSize / 2 - 0.01;
      const dz = d / 2 - legSize / 2 - 0.01;
      return [
        { x: 0, y: seatY, z: 0, width: w, height: seatThk, depth: d },
        {
          x: 0,
          y: backY,
          z: -d / 2 + 0.025,
          width: w,
          height: backH,
          depth: 0.04,
        },
        ...[
          [-dx, legY, -dz],
          [dx, legY, -dz],
          [-dx, legY, dz],
          [dx, legY, dz],
        ].map<FurniturePart>(([x, y, z]) => ({
          x,
          y,
          z,
          width: legSize,
          height: legHeight,
          depth: legSize,
        })),
      ];
    },
  },
  {
    id: "dining_bench",
    label: "Banc de table",
    description: "Banc long, à mettre d'un côté de la table.",
    category: "Salle à manger",
    defaultName: "Banc",
    defaultWidth: 1.4,
    defaultHeight: 0.45,
    defaultDepth: 0.32,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.035),
      ...fourLegs(w, h, d, 0.035, 0.04, 0.04, 0.03),
    ],
  },

  /* =========================================================== */
  /* CHAMBRE                                                     */
  /* =========================================================== */
  {
    id: "bed_single",
    label: "Lit 1 personne",
    description: "Sommier + matelas + tête de lit.",
    category: "Chambre",
    defaultName: "Lit 1 personne",
    defaultWidth: 0.95,
    defaultHeight: 0.95,
    defaultDepth: 2.05,
    defaultColor: WOOD_DARK,
    buildParts: ({ width: w, height: h, depth: d }) => bedParts(w, h, d, 0.18),
  },
  {
    id: "bed_double",
    label: "Lit 2 personnes",
    description: "Lit double avec tête de lit.",
    category: "Chambre",
    defaultName: "Lit 2 personnes",
    defaultWidth: 1.6,
    defaultHeight: 0.95,
    defaultDepth: 2.05,
    defaultColor: WOOD_DARK,
    buildParts: ({ width: w, height: h, depth: d }) => bedParts(w, h, d, 0.2),
  },
  {
    id: "bed_king",
    label: "Lit king size",
    description: "Très grand lit double 180×200.",
    category: "Chambre",
    defaultName: "Lit king size",
    defaultWidth: 1.8,
    defaultHeight: 1.0,
    defaultDepth: 2.05,
    defaultColor: WOOD_DARK,
    buildParts: ({ width: w, height: h, depth: d }) => bedParts(w, h, d, 0.22),
  },
  {
    id: "nightstand",
    label: "Table de nuit",
    description: "Petite table de chevet 2 tiroirs.",
    category: "Chambre",
    defaultName: "Table de nuit",
    defaultWidth: 0.45,
    defaultHeight: 0.5,
    defaultDepth: 0.4,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      { x: 0, y: 0, z: 0, width: w, height: h, depth: d - 0.02 },
      {
        x: 0,
        y: h / 4,
        z: d / 2 - 0.012,
        width: w - 0.04,
        height: h / 2 - 0.02,
        depth: 0.012,
        color: WOOD_DARK,
      },
      {
        x: 0,
        y: -h / 4,
        z: d / 2 - 0.012,
        width: w - 0.04,
        height: h / 2 - 0.02,
        depth: 0.012,
        color: WOOD_DARK,
      },
    ],
  },
  {
    id: "wardrobe",
    label: "Armoire 2 portes",
    description: "Armoire fermée 2 portes.",
    category: "Chambre",
    defaultName: "Armoire",
    defaultWidth: 1.2,
    defaultHeight: 2.0,
    defaultDepth: 0.6,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const doorThk = 0.02;
      return [
        {
          x: 0,
          y: 0,
          z: -doorThk / 2,
          width: w,
          height: h,
          depth: d - doorThk,
        },
        ...doorRow(w, h, d, 2, WOOD_DARK),
      ];
    },
  },
  {
    id: "wardrobe_3doors",
    label: "Armoire 3 portes",
    description: "Grande armoire avec 3 portes.",
    category: "Chambre",
    defaultName: "Armoire 3 portes",
    defaultWidth: 1.8,
    defaultHeight: 2.1,
    defaultDepth: 0.6,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const doorThk = 0.02;
      return [
        {
          x: 0,
          y: 0,
          z: -doorThk / 2,
          width: w,
          height: h,
          depth: d - doorThk,
        },
        ...doorRow(w, h, d, 3, WOOD_DARK),
      ];
    },
  },
  {
    id: "dresser",
    label: "Commode",
    description: "Commode 4 tiroirs.",
    category: "Chambre",
    defaultName: "Commode",
    defaultWidth: 1.1,
    defaultHeight: 0.85,
    defaultDepth: 0.5,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const drawerCount = 4;
      const drawerH = h / drawerCount;
      const fronts: FurniturePart[] = [];
      for (let i = 0; i < drawerCount; i++) {
        fronts.push({
          x: 0,
          y: -h / 2 + drawerH * (i + 0.5),
          z: d / 2 - 0.012,
          width: w - 0.04,
          height: drawerH * 0.85,
          depth: 0.012,
          color: WOOD_DARK,
        });
      }
      return [
        { x: 0, y: 0, z: 0, width: w, height: h, depth: d - 0.02 },
        ...fronts,
      ];
    },
  },
  {
    id: "chest",
    label: "Coffre",
    description: "Coffre en bois bas, à poser au pied du lit.",
    category: "Chambre",
    defaultName: "Coffre",
    defaultWidth: 0.9,
    defaultHeight: 0.45,
    defaultDepth: 0.45,
    defaultColor: WOOD_DARK,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const lid = 0.04;
      return [
        { x: 0, y: -lid / 2, z: 0, width: w, height: h - lid, depth: d },
        {
          x: 0,
          y: h / 2 - lid / 2,
          z: 0,
          width: w + 0.01,
          height: lid,
          depth: d + 0.01,
          color: WOOD,
        },
      ];
    },
  },
  {
    id: "bedside_bench",
    label: "Bout de lit",
    description: "Banc rembourré à mettre au pied du lit.",
    category: "Chambre",
    defaultName: "Bout de lit",
    defaultWidth: 1.2,
    defaultHeight: 0.45,
    defaultDepth: 0.4,
    defaultColor: FABRIC_LIGHT,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const cush = 0.1;
      return [
        {
          x: 0,
          y: -h / 2 + (h - cush) / 2,
          z: 0,
          width: w * 0.9,
          height: h - cush,
          depth: d * 0.9,
          color: WOOD_DARK,
        },
        {
          x: 0,
          y: h / 2 - cush / 2,
          z: 0,
          width: w,
          height: cush,
          depth: d,
        },
      ];
    },
  },
  {
    id: "mirror_floor",
    label: "Miroir psyché",
    description: "Grand miroir sur pied.",
    category: "Chambre",
    defaultName: "Miroir psyché",
    defaultWidth: 0.55,
    defaultHeight: 1.7,
    defaultDepth: 0.06,
    defaultColor: WOOD_DARK,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const frame = 0.04;
      return [
        // Cadre (4 bandes).
        { x: 0, y: h / 2 - frame / 2, z: 0, width: w, height: frame, depth: d },
        { x: 0, y: -h / 2 + frame / 2, z: 0, width: w, height: frame, depth: d },
        { x: -w / 2 + frame / 2, y: 0, z: 0, width: frame, height: h, depth: d },
        { x: w / 2 - frame / 2, y: 0, z: 0, width: frame, height: h, depth: d },
        // Glace (légèrement en retrait).
        {
          x: 0,
          y: 0,
          z: d / 2 - 0.005,
          width: w - 2 * frame,
          height: h - 2 * frame,
          depth: 0.005,
          color: GLASS,
        },
      ];
    },
  },

  /* =========================================================== */
  /* CUISINE                                                     */
  /* =========================================================== */
  {
    id: "kitchen_base_cabinet",
    label: "Meuble bas cuisine",
    description: "Caisson de cuisine standard avec porte.",
    category: "Cuisine",
    defaultName: "Meuble bas cuisine",
    defaultWidth: 0.6,
    defaultHeight: 0.85,
    defaultDepth: 0.6,
    defaultColor: WHITE,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const top = 0.04;
      // Plan de travail + caisson + porte.
      return [
        {
          x: 0,
          y: h / 2 - top / 2,
          z: 0,
          width: w,
          height: top,
          depth: d,
          color: STONE,
        },
        ...cabinetWithDoor(w, h - top, d, WHITE, WHITE).map((p) => ({
          ...p,
          y: p.y - top / 2,
        })),
      ];
    },
  },
  {
    id: "kitchen_base_drawers",
    label: "Meuble bas tiroirs",
    description: "Caisson de cuisine avec 3 tiroirs.",
    category: "Cuisine",
    defaultName: "Meuble bas tiroirs",
    defaultWidth: 0.6,
    defaultHeight: 0.85,
    defaultDepth: 0.6,
    defaultColor: WHITE,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const top = 0.04;
      const bodyH = h - top;
      const bodyY = -h / 2 + bodyH / 2;
      return [
        {
          x: 0,
          y: h / 2 - top / 2,
          z: 0,
          width: w,
          height: top,
          depth: d,
          color: STONE,
        },
        { x: 0, y: bodyY, z: 0, width: w, height: bodyH, depth: d - 0.02, color: WHITE },
        ...drawerFronts("right", w, h, d, w, 3, WHITE, top).map((p) => ({
          ...p,
          x: 0,
        })),
      ];
    },
  },
  {
    id: "kitchen_wall_cabinet",
    label: "Meuble haut cuisine",
    description: "Élément haut de cuisine, à fixer au mur.",
    category: "Cuisine",
    defaultName: "Meuble haut cuisine",
    defaultWidth: 0.6,
    defaultHeight: 0.7,
    defaultDepth: 0.35,
    defaultColor: WHITE,
    buildParts: ({ width: w, height: h, depth: d }) =>
      cabinetWithDoor(w, h, d, WHITE, WHITE),
  },
  {
    id: "kitchen_island",
    label: "Îlot central",
    description: "Grand bloc cuisine avec plan de travail.",
    category: "Cuisine",
    defaultName: "Îlot central",
    defaultWidth: 1.6,
    defaultHeight: 0.95,
    defaultDepth: 0.9,
    defaultColor: WHITE,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const top = 0.05;
      const bodyH = h - top;
      return [
        {
          x: 0,
          y: h / 2 - top / 2,
          z: 0,
          width: w,
          height: top,
          depth: d,
          color: STONE,
        },
        {
          x: 0,
          y: -h / 2 + bodyH / 2,
          z: 0,
          width: w,
          height: bodyH,
          depth: d,
          color: WHITE,
        },
        // Façades de portes (2).
        ...doorRow(w, bodyH * 0.95, d, 2, WHITE).map((p) => ({
          ...p,
          y: -top / 2,
        })),
      ];
    },
  },
  {
    id: "fridge",
    label: "Réfrigérateur",
    description: "Frigo haut, façade lisse.",
    category: "Cuisine",
    defaultName: "Réfrigérateur",
    defaultWidth: 0.65,
    defaultHeight: 1.85,
    defaultDepth: 0.65,
    defaultColor: METAL_LIGHT,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const doorThk = 0.02;
      // Corps + 2 portes (haut/bas, freezer + frigo).
      const splitY = h * 0.28; // ligne de séparation, en partant du milieu vers le haut
      const upperH = h / 2 - splitY;
      const lowerH = h / 2 + splitY;
      return [
        {
          x: 0,
          y: 0,
          z: -doorThk / 2,
          width: w,
          height: h,
          depth: d - doorThk,
          color: METAL_LIGHT,
        },
        {
          x: 0,
          y: h / 2 - upperH / 2,
          z: d / 2 - doorThk / 2,
          width: w - 0.01,
          height: upperH - 0.01,
          depth: doorThk,
          color: METAL_LIGHT,
        },
        {
          x: 0,
          y: -h / 2 + lowerH / 2,
          z: d / 2 - doorThk / 2,
          width: w - 0.01,
          height: lowerH - 0.01,
          depth: doorThk,
          color: METAL_LIGHT,
        },
      ];
    },
  },
  {
    id: "oven_unit",
    label: "Colonne four",
    description: "Colonne haute avec four et placard.",
    category: "Cuisine",
    defaultName: "Colonne four",
    defaultWidth: 0.6,
    defaultHeight: 1.85,
    defaultDepth: 0.6,
    defaultColor: WHITE,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const doorThk = 0.02;
      // Corps + façade four (au milieu) + porte placard (en haut).
      return [
        {
          x: 0,
          y: 0,
          z: -doorThk / 2,
          width: w,
          height: h,
          depth: d - doorThk,
          color: WHITE,
        },
        // Porte du haut (placard).
        {
          x: 0,
          y: h / 2 - h * 0.2,
          z: d / 2 - doorThk / 2,
          width: w - 0.01,
          height: h * 0.4 - 0.01,
          depth: doorThk,
          color: WHITE,
        },
        // Façade du four (centre).
        {
          x: 0,
          y: 0,
          z: d / 2 - doorThk / 2,
          width: w - 0.02,
          height: h * 0.32,
          depth: doorThk,
          color: METAL,
        },
        // Tiroir du bas.
        {
          x: 0,
          y: -h / 2 + h * 0.12,
          z: d / 2 - doorThk / 2,
          width: w - 0.01,
          height: h * 0.22 - 0.01,
          depth: doorThk,
          color: WHITE,
        },
      ];
    },
  },
  {
    id: "dishwasher",
    label: "Lave-vaisselle",
    description: "Lave-vaisselle sous plan.",
    category: "Cuisine",
    defaultName: "Lave-vaisselle",
    defaultWidth: 0.6,
    defaultHeight: 0.85,
    defaultDepth: 0.6,
    defaultColor: METAL_LIGHT,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const top = 0.04;
      return [
        {
          x: 0,
          y: h / 2 - top / 2,
          z: 0,
          width: w,
          height: top,
          depth: d,
          color: STONE,
        },
        ...cabinetWithDoor(w, h - top, d, METAL_LIGHT, METAL_LIGHT).map(
          (p) => ({ ...p, y: p.y - top / 2 }),
        ),
      ];
    },
  },
  {
    id: "bar_stool",
    label: "Tabouret de bar",
    description: "Tabouret haut pour îlot ou bar.",
    category: "Cuisine",
    defaultName: "Tabouret de bar",
    defaultWidth: 0.4,
    defaultHeight: 0.95,
    defaultDepth: 0.4,
    defaultColor: WOOD_DARK,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.04),
      ...fourLegs(w, h, d, 0.04, 0.035, 0.03, 0.03).map<FurniturePart>((p) => ({
        ...p,
        color: METAL,
      })),
    ],
  },
  {
    id: "stool",
    label: "Tabouret",
    description: "Assise et 4 pieds, sans dossier.",
    category: "Cuisine",
    defaultName: "Tabouret",
    defaultWidth: 0.4,
    defaultHeight: 0.45,
    defaultDepth: 0.4,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d, 0.04),
      ...fourLegs(w, h, d, 0.04, 0.035, 0.02, 0.02),
    ],
  },

  /* =========================================================== */
  /* SALLE DE BAIN                                               */
  /* =========================================================== */
  {
    id: "vanity_unit",
    label: "Meuble vasque",
    description: "Meuble bas avec plan vasque.",
    category: "Salle de bain",
    defaultName: "Meuble vasque",
    defaultWidth: 0.8,
    defaultHeight: 0.85,
    defaultDepth: 0.5,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const top = 0.04;
      const bodyH = h - top;
      const bowlW = Math.min(0.5, w * 0.65);
      const bowlD = Math.min(0.32, d * 0.65);
      return [
        // Plan.
        {
          x: 0,
          y: h / 2 - top / 2,
          z: 0,
          width: w,
          height: top,
          depth: d,
          color: STONE,
        },
        // Caisson + 2 portes.
        ...cabinetWithDoor(w, bodyH, d, WOOD, WOOD_DARK).map((p) => ({
          ...p,
          y: p.y - top / 2,
        })),
        // Vasque (cube blanc en relief).
        {
          x: 0,
          y: h / 2 + 0.03,
          z: 0.02,
          width: bowlW,
          height: 0.08,
          depth: bowlD,
          color: PORCELAIN,
        },
      ];
    },
  },
  {
    id: "bathtub",
    label: "Baignoire",
    description: "Baignoire rectangulaire.",
    category: "Salle de bain",
    defaultName: "Baignoire",
    defaultWidth: 1.7,
    defaultHeight: 0.55,
    defaultDepth: 0.75,
    defaultColor: PORCELAIN,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const wall = 0.05;
      // 4 parois + fond pour figurer une baignoire creuse.
      return [
        // Fond.
        { x: 0, y: -h / 2 + wall / 2, z: 0, width: w, height: wall, depth: d, color: PORCELAIN },
        // Parois.
        {
          x: -w / 2 + wall / 2,
          y: 0,
          z: 0,
          width: wall,
          height: h,
          depth: d,
          color: PORCELAIN,
        },
        {
          x: w / 2 - wall / 2,
          y: 0,
          z: 0,
          width: wall,
          height: h,
          depth: d,
          color: PORCELAIN,
        },
        {
          x: 0,
          y: 0,
          z: -d / 2 + wall / 2,
          width: w,
          height: h,
          depth: wall,
          color: PORCELAIN,
        },
        {
          x: 0,
          y: 0,
          z: d / 2 - wall / 2,
          width: w,
          height: h,
          depth: wall,
          color: PORCELAIN,
        },
      ];
    },
  },
  {
    id: "shower_cabin",
    label: "Cabine de douche",
    description: "Cabine de douche cube avec parois vitrées.",
    category: "Salle de bain",
    defaultName: "Cabine de douche",
    defaultWidth: 0.9,
    defaultHeight: 2.0,
    defaultDepth: 0.9,
    defaultColor: GLASS,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const tray = 0.06;
      const glass = 0.02;
      return [
        // Receveur.
        {
          x: 0,
          y: -h / 2 + tray / 2,
          z: 0,
          width: w,
          height: tray,
          depth: d,
          color: PORCELAIN,
        },
        // 2 parois en verre (dos + côté).
        {
          x: 0,
          y: tray / 2,
          z: -d / 2 + glass / 2,
          width: w,
          height: h - tray,
          depth: glass,
          color: GLASS,
        },
        {
          x: -w / 2 + glass / 2,
          y: tray / 2,
          z: 0,
          width: glass,
          height: h - tray,
          depth: d,
          color: GLASS,
        },
      ];
    },
  },
  {
    id: "toilet",
    label: "WC",
    description: "Cuvette + réservoir.",
    category: "Salle de bain",
    defaultName: "WC",
    defaultWidth: 0.4,
    defaultHeight: 0.78,
    defaultDepth: 0.65,
    defaultColor: PORCELAIN,
    buildParts: ({ width: w, height: h, depth: d }) => {
      // Cuvette (en bas) + réservoir (à l'arrière en haut).
      const tankH = h * 0.45;
      const bowlH = h - tankH;
      const tankD = d * 0.25;
      return [
        {
          x: 0,
          y: -h / 2 + bowlH / 2,
          z: d * 0.05,
          width: w,
          height: bowlH,
          depth: d * 0.9,
          color: PORCELAIN,
        },
        {
          x: 0,
          y: -h / 2 + bowlH + tankH / 2,
          z: -d / 2 + tankD / 2,
          width: w * 0.9,
          height: tankH,
          depth: tankD,
          color: PORCELAIN,
        },
      ];
    },
  },
  {
    id: "washing_machine",
    label: "Lave-linge",
    description: "Machine à laver, façade hublot.",
    category: "Salle de bain",
    defaultName: "Lave-linge",
    defaultWidth: 0.6,
    defaultHeight: 0.85,
    defaultDepth: 0.6,
    defaultColor: WHITE,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const doorThk = 0.02;
      const hubR = Math.min(w, h) * 0.32;
      return [
        {
          x: 0,
          y: 0,
          z: -doorThk / 2,
          width: w,
          height: h,
          depth: d - doorThk,
          color: WHITE,
        },
        // Hublot (cube sombre simulant le verre).
        {
          x: 0,
          y: -h * 0.05,
          z: d / 2 - 0.01,
          width: hubR * 2,
          height: hubR * 2,
          depth: 0.02,
          color: METAL,
        },
        // Bandeau du haut.
        {
          x: 0,
          y: h / 2 - 0.05,
          z: d / 2 - 0.01,
          width: w * 0.9,
          height: 0.06,
          depth: 0.02,
          color: METAL_LIGHT,
        },
      ];
    },
  },

  /* =========================================================== */
  /* BUREAU                                                      */
  /* =========================================================== */
  {
    id: "desk_4legs",
    label: "Bureau 4 pieds",
    description: "Plateau et 4 pieds fins.",
    category: "Bureau",
    defaultName: "Bureau",
    defaultWidth: 1.4,
    defaultHeight: 0.75,
    defaultDepth: 0.7,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => [
      topPanel(w, h, d),
      ...fourLegs(w, h, d),
    ],
  },
  {
    id: "desk_drawer_left",
    label: "Bureau caisson gauche",
    description: "Plateau, caisson 3 tiroirs à gauche, 2 pieds à droite.",
    category: "Bureau",
    defaultName: "Bureau caisson gauche",
    defaultWidth: 1.4,
    defaultHeight: 0.75,
    defaultDepth: 0.7,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const cab = Math.min(0.45, w * 0.4);
      return [
        topPanel(w, h, d),
        cabinet("left", w, h, d, cab),
        ...drawerFronts("left", w, h, d, cab, 3, WOOD_DARK),
        ...legsAtTwoCorners("right", w, h, d),
      ];
    },
  },
  {
    id: "desk_drawer_right",
    label: "Bureau caisson droit",
    description: "Plateau, caisson 3 tiroirs à droite, 2 pieds à gauche.",
    category: "Bureau",
    defaultName: "Bureau caisson droit",
    defaultWidth: 1.4,
    defaultHeight: 0.75,
    defaultDepth: 0.7,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const cab = Math.min(0.45, w * 0.4);
      return [
        topPanel(w, h, d),
        cabinet("right", w, h, d, cab),
        ...drawerFronts("right", w, h, d, cab, 3, WOOD_DARK),
        ...legsAtTwoCorners("left", w, h, d),
      ];
    },
  },
  {
    id: "desk_two_drawers",
    label: "Bureau 2 caissons",
    description: "Plateau et deux caissons, un de chaque côté.",
    category: "Bureau",
    defaultName: "Bureau 2 caissons",
    defaultWidth: 1.6,
    defaultHeight: 0.75,
    defaultDepth: 0.7,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const cab = Math.min(0.45, w * 0.3);
      return [
        topPanel(w, h, d),
        cabinet("left", w, h, d, cab),
        ...drawerFronts("left", w, h, d, cab, 3, WOOD_DARK),
        cabinet("right", w, h, d, cab),
        ...drawerFronts("right", w, h, d, cab, 3, WOOD_DARK),
      ];
    },
  },
  {
    id: "desk_metal_legs",
    label: "Bureau pieds métal",
    description: "Plateau bois, 4 pieds métalliques.",
    category: "Bureau",
    defaultName: "Bureau pieds métal",
    defaultWidth: 1.4,
    defaultHeight: 0.75,
    defaultDepth: 0.7,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const top = topPanel(w, h, d);
      const legs = fourLegs(w, h, d, 0.04, 0.04).map<FurniturePart>((p) => ({
        ...p,
        color: METAL,
      }));
      return [top, ...legs];
    },
  },
  {
    id: "office_chair",
    label: "Chaise de bureau",
    description: "Chaise haute avec dossier (modèle simplifié).",
    category: "Bureau",
    defaultName: "Chaise de bureau",
    defaultWidth: 0.55,
    defaultHeight: 1.0,
    defaultDepth: 0.55,
    defaultColor: METAL,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const seatThk = 0.06;
      const seatY = -h / 2 + h * 0.5;
      const backH = h * 0.45;
      const backY = seatY + seatThk / 2 + backH / 2;
      const baseH = 0.04;
      return [
        // Pied central.
        {
          x: 0,
          y: -h / 2 + baseH + (seatY - seatThk / 2 - (-h / 2 + baseH)) / 2,
          z: 0,
          width: 0.05,
          height: seatY - seatThk / 2 - (-h / 2 + baseH),
          depth: 0.05,
          color: METAL,
        },
        // Base étoile.
        {
          x: 0,
          y: -h / 2 + baseH / 2,
          z: 0,
          width: w,
          height: baseH,
          depth: d,
          color: METAL,
        },
        // Assise.
        {
          x: 0,
          y: seatY,
          z: 0,
          width: w * 0.85,
          height: seatThk,
          depth: d * 0.85,
          color: FABRIC,
        },
        // Dossier.
        {
          x: 0,
          y: backY,
          z: -d / 2 + 0.06,
          width: w * 0.7,
          height: backH,
          depth: 0.05,
          color: FABRIC,
        },
      ];
    },
  },
  {
    id: "filing_cabinet",
    label: "Caisson roulant",
    description: "Petit caisson 3 tiroirs sur roulettes.",
    category: "Bureau",
    defaultName: "Caisson roulant",
    defaultWidth: 0.42,
    defaultHeight: 0.6,
    defaultDepth: 0.5,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const drawerCount = 3;
      const drawerH = h / drawerCount;
      const fronts: FurniturePart[] = [];
      for (let i = 0; i < drawerCount; i++) {
        fronts.push({
          x: 0,
          y: -h / 2 + drawerH * (i + 0.5),
          z: d / 2 - 0.012,
          width: w - 0.04,
          height: drawerH * 0.85,
          depth: 0.012,
          color: WOOD_DARK,
        });
      }
      return [
        { x: 0, y: 0, z: 0, width: w, height: h, depth: d - 0.02 },
        ...fronts,
      ];
    },
  },

  /* =========================================================== */
  /* RANGEMENT                                                   */
  /* =========================================================== */
  {
    id: "shoe_cabinet",
    label: "Meuble à chaussures",
    description: "Petit meuble bas avec porte abattante.",
    category: "Rangement",
    defaultName: "Meuble à chaussures",
    defaultWidth: 0.9,
    defaultHeight: 0.55,
    defaultDepth: 0.3,
    defaultColor: WOOD,
    buildParts: ({ width: w, height: h, depth: d }) =>
      cabinetWithDoor(w, h, d, WOOD, WOOD_DARK),
  },
  {
    id: "tall_shelf",
    label: "Étagère haute",
    description: "Étagère grande hauteur avec nombreux niveaux.",
    category: "Rangement",
    defaultName: "Étagère haute",
    defaultWidth: 0.9,
    defaultHeight: 2.2,
    defaultDepth: 0.32,
    defaultColor: WOOD_LIGHT,
    buildParts: ({ width: w, height: h, depth: d }) => {
      const sideThk = 0.025;
      const shelfThk = 0.022;
      const parts: FurniturePart[] = [
        {
          x: -w / 2 + sideThk / 2,
          y: 0,
          z: 0,
          width: sideThk,
          height: h,
          depth: d,
        },
        {
          x: w / 2 - sideThk / 2,
          y: 0,
          z: 0,
          width: sideThk,
          height: h,
          depth: d,
        },
      ];
      const shelves = Math.max(3, Math.round(h / 0.32) + 1);
      for (let i = 0; i < shelves; i++) {
        const t = i / (shelves - 1);
        const y = -h / 2 + t * h;
        parts.push({
          x: 0,
          y,
          z: 0,
          width: w - 2 * sideThk,
          height: shelfThk,
          depth: d - 0.01,
        });
      }
      return parts;
    },
  },

  /* =========================================================== */
  /* AUTRE                                                       */
  /* =========================================================== */
  {
    id: "box",
    label: "Boîte simple",
    description: "Une boîte paramétrable, point de départ libre.",
    category: "Autre",
    defaultName: "Boîte",
    defaultWidth: 0.8,
    defaultHeight: 0.7,
    defaultDepth: 0.5,
    defaultColor: "#8a8f9a",
    buildParts: () => undefined,
  },
];

function sofaParts(w: number, h: number, d: number): FurniturePart[] {
  const baseH = h * 0.5;
  const armW = Math.min(0.14, w * 0.1);
  return [
    { x: 0, y: -h / 2 + baseH / 2, z: 0, width: w, height: baseH, depth: d },
    {
      x: 0,
      y: -h / 2 + baseH + (h - baseH) / 2,
      z: -d / 2 + 0.07,
      width: w,
      height: h - baseH,
      depth: 0.14,
    },
    {
      x: -w / 2 + armW / 2,
      y: -h / 2 + baseH + 0.12,
      z: 0,
      width: armW,
      height: 0.24,
      depth: d - 0.14,
    },
    {
      x: w / 2 - armW / 2,
      y: -h / 2 + baseH + 0.12,
      z: 0,
      width: armW,
      height: 0.24,
      depth: d - 0.14,
    },
  ];
}

function bedParts(
  w: number,
  h: number,
  d: number,
  matH: number,
): FurniturePart[] {
  const baseH = h * 0.34;
  const headH = h - baseH - matH;
  return [
    { x: 0, y: -h / 2 + baseH / 2, z: 0, width: w, height: baseH, depth: d },
    {
      x: 0,
      y: -h / 2 + baseH + matH / 2,
      z: 0.05,
      width: w - 0.06,
      height: matH,
      depth: d - 0.06,
      color: MATTRESS,
    },
    {
      x: 0,
      y: -h / 2 + baseH + matH + headH / 2,
      z: -d / 2 + 0.04,
      width: w,
      height: headH,
      depth: 0.06,
    },
  ];
}

export const CATEGORIES: PresetCategory[] = [
  "Salon",
  "Salle à manger",
  "Chambre",
  "Cuisine",
  "Salle de bain",
  "Bureau",
  "Rangement",
  "Autre",
];

export function getPresetById(id: string): FurniturePreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Crée un Furniture (sans id) à partir d'un preset, posé au sol. */
export function createFurnitureFromPreset(
  preset: FurniturePreset,
): Omit<Furniture, "id"> {
  const w = preset.defaultWidth;
  const h = preset.defaultHeight;
  const d = preset.defaultDepth;
  const parts = preset.buildParts({ width: w, height: h, depth: d });
  return {
    name: preset.defaultName,
    x: 0,
    y: h / 2,
    z: 0,
    width: w,
    height: h,
    depth: d,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    color: preset.defaultColor,
    parts,
    partsRef: parts ? { width: w, height: h, depth: d } : undefined,
    presetId: preset.id,
  };
}

/**
 * Récupère les dimensions d'origine d'un preset (pour servir de partsRef
 * de fallback quand un meuble n'a pas son partsRef défini, ex : meuble
 * créé avant l'introduction de ce champ).
 */
export function getPresetDefaultDims(
  presetId: string,
): { width: number; height: number; depth: number } | undefined {
  const preset = getPresetById(presetId);
  if (!preset) return undefined;
  return {
    width: preset.defaultWidth,
    height: preset.defaultHeight,
    depth: preset.defaultDepth,
  };
}

/** Régénère les parts d'un meuble pour de nouvelles dimensions. */
export function rebuildPartsForPreset(
  presetId: string,
  width: number,
  height: number,
  depth: number,
): FurniturePart[] | undefined {
  const preset = getPresetById(presetId);
  if (!preset) return undefined;
  return preset.buildParts({ width, height, depth });
}
