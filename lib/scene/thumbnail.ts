import * as THREE from "three";
import type { FurniturePreset } from "./presets";

/**
 * Génère une miniature PNG (data URL) pour un preset de meuble en
 * effectuant un rendu Three.js one-shot, mis en cache à vie du module.
 *
 * Renvoie `null` côté serveur ou si WebGL n'est pas disponible — le
 * composant appelant doit gérer ce fallback.
 */

const CACHE = new Map<string, string>();
let renderer: THREE.WebGLRenderer | null = null;
let rendererBroken = false;

function getRenderer(): THREE.WebGLRenderer | null {
  if (typeof window === "undefined") return null;
  if (rendererBroken) return null;
  if (!renderer) {
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch {
      rendererBroken = true;
      return null;
    }
  }
  return renderer;
}

type Box = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color?: string;
};

export function renderPresetThumbnail(
  preset: FurniturePreset,
  width = 320,
  height = 240,
): string | null {
  const key = `${preset.id}-${width}x${height}`;
  const cached = CACHE.get(key);
  if (cached) return cached;

  const r = getRenderer();
  if (!r) return null;

  const w = preset.defaultWidth;
  const h = preset.defaultHeight;
  const d = preset.defaultDepth;
  const parts =
    preset.buildParts({ width: w, height: h, depth: d }) ??
    [{ x: 0, y: 0, z: 0, width: w, height: h, depth: d } satisfies Box];

  r.setSize(width, height, false);
  r.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key1 = new THREE.DirectionalLight(0xffffff, 0.8);
  key1.position.set(5, 8, 4);
  scene.add(key1);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  for (const p of parts) {
    const geom = new THREE.BoxGeometry(p.width, p.height, p.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.color ?? preset.defaultColor),
      roughness: 0.7,
      metalness: 0.05,
    });
    const m = new THREE.Mesh(geom, mat);
    m.position.set(p.x, p.y, p.z);
    group.add(m);
    meshes.push(m);
  }
  scene.add(group);

  // Caméra orthographique cadrée pile sur la projection des coins.
  const camera = fitOrthoCamera(parts, width, height);

  r.render(scene, camera);
  let dataUrl = "";
  try {
    dataUrl = r.domElement.toDataURL("image/png");
  } catch {
    // SecurityError dans certains environnements ⇒ on abandonne pour ce preset.
    cleanup(meshes);
    return null;
  }

  cleanup(meshes);
  CACHE.set(key, dataUrl);
  return dataUrl;
}

function cleanup(meshes: THREE.Mesh[]) {
  for (const m of meshes) {
    m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
    else mat.dispose();
  }
}

/**
 * Cadre une caméra orthographique sur la bounding-box projetée des
 * pièces, vue depuis un angle 3/4. Garantit que tout est visible avec
 * un peu de marge, peu importe les dimensions du meuble.
 */
function fitOrthoCamera(
  parts: Box[],
  canvasW: number,
  canvasH: number,
): THREE.OrthographicCamera {
  // Direction caméra (depuis l'avant droit en hauteur, regard vers l'origine).
  const dir = new THREE.Vector3(0.85, 0.6, 1).normalize();
  const forward = dir.clone().negate();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();

  let minU = Infinity,
    maxU = -Infinity;
  let minV = Infinity,
    maxV = -Infinity;
  let radius = 0;
  for (const p of parts) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const c = new THREE.Vector3(
            p.x + (sx * p.width) / 2,
            p.y + (sy * p.height) / 2,
            p.z + (sz * p.depth) / 2,
          );
          const u = c.dot(right);
          const v = c.dot(up);
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
          radius = Math.max(radius, c.length());
        }
      }
    }
  }

  const projW = maxU - minU;
  const projH = maxV - minV;
  const padding = Math.max(projW, projH) * 0.08;
  let halfW = projW / 2 + padding;
  let halfH = projH / 2 + padding;
  const aspect = canvasW / canvasH;
  // Étend l'axe le plus court pour respecter le ratio du canvas.
  if (halfW / halfH > aspect) halfH = halfW / aspect;
  else halfW = halfH * aspect;

  const cu = (minU + maxU) / 2;
  const cv = (minV + maxV) / 2;
  const center = right
    .clone()
    .multiplyScalar(cu)
    .add(up.clone().multiplyScalar(cv));

  const camDist = radius * 4 + 5;
  const camera = new THREE.OrthographicCamera(
    -halfW,
    halfW,
    halfH,
    -halfH,
    0.1,
    1000,
  );
  camera.position.copy(center).add(dir.clone().multiplyScalar(camDist));
  camera.lookAt(center);
  return camera;
}
