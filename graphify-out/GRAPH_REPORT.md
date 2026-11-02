# Graph Report - capital-tile-studio  (2026-10-24)

## Corpus Check
- 27 files · ~14,665 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .jsonc 1)

## Summary
- 171 nodes · 291 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71db0c3d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scene.ts
- package.json
- site.ts
- Layout.astro
- QuoteForm.tsx
- tiles.ts
- tsconfig.json
- scripts
- Astro Starter Kit: Minimal

## God Nodes (most connected - your core abstractions)
1. `createScene()` - 21 edges
2. `site` - 9 edges
3. `update()` - 7 edges
4. `scripts` - 6 edges
5. `TilePattern` - 6 edges
6. `TilePalette` - 6 edges
7. `frame()` - 6 edges
8. `QuoteForm()` - 5 edges
9. `clamp01()` - 5 edges
10. `rng()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `createScene()` --calls--> `glazeTexture()`  [EXTRACTED]
  src/lib/scene.ts → src/lib/textures.ts
- `createScene()` --calls--> `marbleTexture()`  [EXTRACTED]
  src/lib/scene.ts → src/lib/textures.ts
- `createScene()` --calls--> `perTileUv()`  [EXTRACTED]
  src/lib/scene.ts → src/lib/textures.ts
- `createScene()` --calls--> `rippleNormalTexture()`  [EXTRACTED]
  src/lib/scene.ts → src/lib/textures.ts
- `createScene()` --calls--> `streakGlazeTexture()`  [EXTRACTED]
  src/lib/scene.ts → src/lib/textures.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "scene.ts"
Cohesion: 0.12
Nodes (36): BG, clamp01(), createScene(), adapt(), frame(), place(), resize(), update() (+28 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (34): dependencies, astro@^7.4.2, @astrojs/react@^7.1.1, @astrojs/sitemap@^3.7.4, @fontsource-variable/inter@^5.3.0, motion@^14.6.0, react-dom@^19.3.1, tailwindcss@^4.3.3 (+26 more)

### Community 2 - "site.ts"
Cohesion: 0.12
Nodes (21): Props, Props, spots, Props, art, Props, canvas, chapters (+13 more)

### Community 3 - "Layout.astro"
Cohesion: 0.13
Nodes (9): Props, nav, canonical, menu, motionOk, ogImage, Props, schema (+1 more)

### Community 4 - "QuoteForm.tsx"
Cohesion: 0.16
Nodes (12): react@^19.3.1, react, aud, Props, Errors, jobTypes, Props, QuoteForm() (+4 more)

### Community 5 - "tiles.ts"
Cohesion: 0.24
Nodes (9): art, tiles, intersects(), layout(), palettes, Poly, rect(), renderTiles() (+1 more)

### Community 6 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): astro/tsconfigs/strict, compilerOptions, jsx, jsxImportSource, exclude, extends, include

### Community 7 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, astro, build, deploy, dev, preview

### Community 8 - "Astro Starter Kit: Minimal"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Minimal, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 71 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `package.json` to `scene.ts`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scene.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1166429587482219 - nodes in this community are weakly interconnected._
- **Why does `@fontsource-variable/inter` connect `package.json` to `Layout.astro`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07807807807807808 - nodes in this community are weakly interconnected._
- **Why does `motion` connect `package.json` to `Layout.astro`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `site.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._