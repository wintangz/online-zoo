# Online Zoo Art Style Guide

**Status**: Active Foundation Guide (established in `world-zones`, enforced across all assets in `art-style-unification`)

## 1. Visual Direction: Flat-Shaded Cozy Low-Poly

Online Zoo uses a unified **flat-shaded low-poly** aesthetic across all scenes (`zoo-lobby`, `panda-forest`, and future zones), props, avatars, and animals:
- **Flat Shading Only**: Every 3D mesh and GLB material uses flat normals (`flatShading: true` in Three.js `MeshStandardMaterial` / `MeshLambertMaterial` orfaceted GLB geometry normals). Smooth-shaded primitive spheres/capsules with ad-hoc hex colors are prohibited once unified.
- **No Photographic Textures**: Surfaces obtain color exclusively from the shared named palette (`ZOO_PALETTE` in `@online-zoo/game-assets`) or vertex colors sampled from the palette.
- **Readable Silhouette & Scale**: Props, gates, signage, benches, and animals use clean geometric bevels and distinct silhouettes readable from both desktop third-person orbit camera (`5.5m` distance) and mobile viewports.

## 2. Shared ~20-Color Named Palette (`ZOO_PALETTE`)

All materials and vertex colors must draw from this fixed 20-color palette:

| Palette Key | Hex | Role |
|-------------|-----|------|
| `leafCanopy` | `#3a7d44` | Primary foliage, bamboo leaves, topiary |
| `meadowGrass` | `#68a357` | Ground turf, lawn, grassy mounds |
| `mossShadow` | `#254d32` | Deep foliage accents, pine needles, hedges |
| `bambooStalk` | `#8fc93a` | Fresh bamboo culms, spring shoots |
| `stonePath` | `#d6cfc2` | Plaza flagstones, paved walkways |
| `graniteSlate` | `#7d8491` | Rock boulders, lantern pedestals, curbs |
| `charcoalFur` | `#22272e` | Panda dark patches, penguin backs, wrought iron |
| `snowCream` | `#f7f5fb` | Panda white fur, penguin bellies, clouds |
| `warmTimber` | `#8c5a3c` | Bench slats, signage posts, wooden beams |
| `cedarBark` | `#5c3a21` | Tree trunks, dark wood trim, roofs |
| `terracottaRoof` | `#c85a32` | Ticket booth roofs, gateway tiles, lanterns |
| `sunflowerGold` | `#f4b942` | Signage highlights, ticket booth trim, badges |
| `lanternAmber` | `#ff9f1c` | Warm emissive lantern glow, Brass bells |
| `pondTeal` | `#2ec4b6` | Shallow water, fountain basins, lobby pool |
| `deepWater` | `#1a659e` | Deep pond water, penguin pool, signage backing |
| `blossomPink` | `#ff8fa3` | Cherry blossom petals, seasonal accents |
| `otterCinnamon` | `#9c6644` | Otter coat, warm earth banks |
| `otterBuff` | `#e0b084` | Otter muzzle/underbelly, sand |
| `sky Mist` | `#cfe8ef` | Horizon fog, glass panes |
| `coralAccent` | `#e76f51` | Wayfinding arrows, meeting point banner |

## 3. Scene Construction Rules (`ZooLobbyScene` & Zone Scenes)

- **Code-Built Geometry**: Used only for terrain slabs, paths, water basins, and perimeter fences/archways using shared palette materials.
- **Zoo Lobby (`ZooLobbyScene.tsx`)**:
  - Welcoming entrance plaza (`[-24, 24]` X/Z bounds) with paved stone paths (`stonePath`), grassy borders (`meadowGrass`), ticket booths (`terracottaRoof`, `warmTimber`, `sunflowerGold`), a central Meeting Point compass fountain (`pondTeal`, `graniteSlate`, `coralAccent`), zone directory signage, benches, and the North Gate archway leading to `Panda Forest`.
  - Contains **no animals** so it remains lightweight and fast to load for every visitor.

