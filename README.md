# Room3D — Éditeur 3D de pièces

Application web permettant de modéliser une pièce en 3D (murs, sol, fenêtres,
portes, étagères encastrées) et d'y placer des meubles paramétrables (forme,
dimensions, couleur), avec une vue 2D plan et une vue 3D commutables.

## Stack

- **Framework** : Next.js 15 (App Router) + React 19 + TypeScript
- **3D** : `three` + `@react-three/fiber` + `@react-three/drei`
- **2D** : SVG natif (pan + zoom + drag)
- **UI** : Tailwind CSS (palette sombre sobre)
- **State éditeur** : Zustand
- **Validation** : Zod
- **Base de données** : SQLite via Prisma (`prisma/dev.db`)
- **Auth** : faite main, `bcryptjs` + JWT (`jose`) en cookie httpOnly

## Démarrage

Pré-requis : Node.js ≥ 20.

```bash
npm install
npx prisma db push     # crée le fichier SQLite et la table
npm run dev
```

Ouvrir http://localhost:3000.

## Variables d'environnement

Voir `.env` (créé par défaut) :

- `DATABASE_URL` : chemin de la base SQLite (`file:./dev.db`)
- `JWT_SECRET` : secret pour signer les JWT (≥ 32 caractères en production)

## Scripts NPM

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run start` — démarre le build de production
- `npm run db:push` — applique le schéma Prisma à SQLite
- `npm run db:studio` — ouvre Prisma Studio

## Architecture

```
app/
  (auth)/login,/register     pages d'authentification
  (app)/projects             dashboard + éditeur
  api/auth/*                 register / login / logout / me
  api/projects/*             CRUD projets
components/
  editor/EditorShell.tsx     enveloppe Toolbar + Sidebar + Viewport + Properties
  editor/Toolbar.tsx         titre, switch 2D/3D, état de sauvegarde
  editor/Sidebar.tsx         navigation par sections
  editor/PropertiesPanel.tsx formulaires d'édition
  editor/views/Scene3D.tsx   canvas R3F (caméra perspective + OrbitControls)
  editor/views/Scene2D.tsx   plan SVG zénithal (pan, zoom, drag furniture)
  editor/three/*             primitives 3D (murs avec ouvertures, étagères, meubles)
lib/
  prisma.ts                  singleton Prisma
  auth.ts                    bcrypt + cookie + lecture user
  session.ts                 helpers JWT (isolés pour middleware Edge)
  scene/schema.ts            types Zod du SceneState
  scene/geometry.ts          transformations murs <-> monde
store/editor.ts              store Zustand (scene, selection, viewMode, …)
prisma/schema.prisma         User + Project (data = JSON sérialisé)
middleware.ts                protection /projects/**
```

## Modèle de scène

Un projet = un `SceneState` JSON validé par Zod, persisté dans la colonne
`Project.data`. Structure :

- **room** : largeur, profondeur, hauteur sous plafond, couleur sol, couleur
  des murs (par défaut)
- **walls** : surcharges de couleur par mur (Nord / Est / Sud / Ouest)
- **openings** : fenêtres et portes ancrées à un mur, avec position locale
  (`x`, `y`) et dimensions
- **shelves** : étagères encastrées ancrées à un mur, avec profondeur
  rentrante dans la pièce
- **furniture** : boîtes paramétrables (largeur × hauteur × profondeur,
  couleur, position monde, rotation Y)

Les murs sont rendus via `THREE.ExtrudeGeometry` à partir d'un `Shape` 2D
avec des trous (`Path`) pour les ouvertures, ce qui évite toute opération
CSG coûteuse.

## Raccourcis dans le viewport

**Vue 3D** : OrbitControls — clic gauche : rotation, clic droit : pan,
molette : zoom. Cliquer sur un objet pour le sélectionner ; un meuble
sélectionné affiche un gizmo de translation avec snap à 5 cm.

**Vue 2D** : molette pour zoomer, `Maj+drag` ou clic-milieu pour panner,
glisser un meuble pour le déplacer (snap à 5 cm).

## Sauvegarde

L'éditeur enregistre automatiquement les modifications 800 ms après la
dernière action (debounce). Le bouton « Enregistrer » force un envoi
immédiat. L'état de sauvegarde est visible dans la barre d'outils.
