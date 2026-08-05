# React Graph Visualization Library Comparison

## Context
OpenMem property graph visualization: entities (nodes) + relations (labeled directed edges).
Stack: Next.js 16.3 + React 19.2 + TanStack Query + Mantine + Tailwind.

## Data Sources
- npm registry for versions, dependencies, peer deps
- GitHub API for stars, forks, issues, last push
- Bundlephobia for bundle sizes

---

## 🏆 RANKED COMPARISON

### 1. 🥇 Cytoscape.js + cytoscape-react (RECOMMENDED)
**Bundle:** 430KB / 135KB gzip (+4KB wrapper)
**GitHub:** ⭐11,136 | 🐛19 open issues | Last push: Aug 4, 2026
**TypeScript:** Built-in `index.d.ts` + `@types/cytoscape@3.31.0`
**React 19:** ✅ `cytoscape-react@5.0.4` peers `react ^17 || ^18 || ^19`

| Feature | Score |
|---------|-------|
| Labeled directed edges | ✅ Native support |
| Node types/shapes/colors | ✅ Extensive (12+ shapes, full styling) |
| Force-directed layout | ✅ Built-in (cola, spread, cose, etc.) |
| Interactive (click/hover/drag/zoom) | ✅ Full support |
| Performance 100-1000 nodes | ✅ Excellent (WebGL via canvas) |
| Customization | ⭐⭐⭐⭐⭐ Maximum flexibility |
| Ease of use | ⭐⭐⭐ Steep learning curve, API is complex |
| Active maintenance | ✅ Very active |

**Verdict:** Industry standard for property graphs. Most complete graph library.
Used by Neo4j, Gephi web. Best for your use case.

---

### 2. 🥈 @xyflow/react (ReactFlow)
**Bundle:** 184KB / 59KB gzip
**GitHub:** ⭐37,923 | 🐛137 open issues | Last push: Aug 5, 2026
**TypeScript:** Built-in `.d.ts`
**React 19:** ✅ peers `react >=17`

| Feature | Score |
|---------|-------|
| Labeled directed edges | ✅ Custom edge labels supported |
| Node types/shapes/colors | ✅ Custom node components |
| Force-directed layout | ⚠️ No built-in; add d3-force manually |
| Interactive (click/hover/drag/zoom) | ✅ Excellent (designed for this) |
| Performance 100-1000 nodes | ✅ Good (WebGL mode available) |
| Customization | ⭐⭐⭐⭐⭐ Everything is a component |
| Ease of use | ⭐⭐⭐⭐⭐ Excellent DX, great docs |
| Active maintenance | ✅ Most active |

**Verdict:** Beautiful DX and React integration, but designed for node editors, not graph viz.
Would need manual force layout via d3-force. Overkill for read-only graph display.

---

### 3. 🥉 Sigma.js + @react-sigma/core + graphology
**Bundle:** 96KB + 10KB + 66KB = 172KB / 39KB gzip
**GitHub:** ⭐12,125 (sigma) + ⭐1,717 (graphology) + ⭐239 (react-sigma)
**TypeScript:** Built-in for sigma + graphology
**React 19:** ✅ `@react-sigma/core@5.0.6` peers `react ^18 || ^19`

| Feature | Score |
|---------|-------|
| Labeled directed edges | ⚠️ Requires custom renderer |
| Node types/shapes/colors | ✅ Via graphology programs |
| Force-directed layout | ✅ Via graphology-layout-forceatlas2 |
| Interactive (click/hover/drag/zoom) | ✅ WebGL, smooth |
| Performance 100-1000 nodes | ✅✅ Excellent (WebGL, handles 100K+) |
| Customization | ⭐⭐⭐ Good but limited to WebGL shaders |
| Ease of use | ⭐⭐⭐ Three libraries to learn |
| Active maintenance | ✅ Active |

**Verdict:** Best performance for large graphs. Edge labels require custom WebGL work.
Good choice if you need 1000+ node performance.

---

### 4. vis-network
**Bundle:** 396KB / 111KB gzip
**GitHub:** ⭐3,609 | 🐛348 open issues | Last push: Aug 3, 2026
**TypeScript:** Built-in `declarations/index.d.ts`
**React 19:** ⚠️ No React peer dep (vanilla JS, works via refs)

| Feature | Score |
|---------|-------|
| Labeled directed edges | ✅ Native support |
| Node types/shapes/colors | ✅ Shapes: dot, diamond, star, etc. |
| Force-directed layout | ✅ Built-in physics engine |
| Interactive (click/hover/drag/zoom) | ✅ Full support |
| Performance 100-1000 nodes | ⚠️ Canvas-based, struggles >2000 |
| Customization | ⭐⭐⭐ Good options API |
| Ease of use | ⭐⭐⭐⭐ Easy config-based API |
| Active maintenance | ⚠️ Slow (348 issues open) |

**Verdict:** Easy to use but dated. Good for quick prototypes.
Performance degrades at scale. Large open issue count.

---

### 5. react-force-graph-2d
**Bundle:** 173KB / 54KB gzip
**GitHub:** ⭐3,259 | 🐛218 open issues | Last push: Feb 4, 2026
**TypeScript:** Built-in `.d.ts`
**React 19:** ✅ peers `react *`

| Feature | Score |
|---------|-------|
| Labeled directed edges | ✅ Via linkCanvasObject custom |
| Node types/shapes/colors | ✅ Via nodeCanvasObject custom |
| Force-directed layout | ✅ Built-in (d3-force) |
| Interactive (click/hover/drag/zoom) | ✅ Full support |
| Performance 100-1000 nodes | ✅ Good (Canvas) |
| Customization | ⭐⭐⭐⭐ Canvas-based customization |
| Ease of use | ⭐⭐⭐⭐ Simple React component |
| Active maintenance | ⚠️ Slow (218 issues, last push Feb) |

**Verdict:** Good all-rounder for 2D force graphs. Canvas-based.
Stale maintenance (last push 6 months ago). 218 open issues.

---

### 6. @react-sigma/core (standalone)
**Bundle:** 10KB / 3KB gzip (wrapper only; needs sigma + graphology)
**GitHub:** ⭐239 | Last push: Dec 5, 2025
**React 19:** ✅ peers `react ^18 || ^19`

**Verdict:** Thin React wrapper. See #3 for full Sigma stack.

---

### 7. react-force-graph-3d
**Bundle:** 1.3MB / 345KB gzip ⚠️ TOO HEAVY
**GitHub:** ⭐3,259 (same repo as 2D)

**Verdict:** Same as 2D but in 3D. Massive bundle. Only if 3D is required.

---

### 8. d3-force (layout only)
**Bundle:** 15KB / 6KB gzip
**GitHub:** ⭐1,993 | Last push: Dec 2023 ❌

**Verdict:** Only force layout, no rendering. Use as complement, not standalone.

---

### 9. graphology (data structure only)
**Bundle:** 66KB / 13KB gzip
**GitHub:** ⭐1,717 | Last push: Jul 21, 2026

**Verdict:** Graph data structure library. Use with Sigma for visualization.

---

### 10. react-d3-graph
**Bundle:** 143KB / 40KB gzip
**GitHub:** ⭐825 | Last push: Dec 2023 ❌
**React 19:** ❌ peers `react ^16.4.1` (OUTDATED)

**Verdict:** ❌ ABANDONED. Not React 19 compatible. Do not use.

---

### 11. cytoscape-react
**Bundle:** 4KB / 2KB gzip (wrapper only; needs cytoscape)
**GitHub:** ⭐16 | Last push: Jun 29, 2026
**React 19:** ✅ peers `react ^17 || ^18 || ^19`

**Verdict:** Thin wrapper for DOM-backed Cytoscape nodes. Use with #1.

---

### ❌ ELIMINATED
- **@react-force-graph/core** - Does not exist on npm
- **@cytoscape/react-cytoscapejs** - Does not exist on npm
- **sigma.js** - Correct package name is `sigma` (covered in #3)

---

## RECOMMENDATION FOR OPENMEM

### Primary: Cytoscape.js + cytoscape-react
```
npm install cytoscape cytoscape-react cytoscape-dom-node @types/cytoscape
```
**Why:**
- Native property graph support (labeled directed edges)
- 12+ node shapes, full CSS-like styling
- Built-in force-directed layouts (cola, cose, spread)
- Excellent TypeScript support
- React 19 compatible via cytoscape-react
- Industry standard (used by Neo4j Browser, Gephi web)
- Performance handles 1000+ nodes well

### Fallback: @xyflow/react
**If:** You want better React integration and DX, don't mind adding d3-force for layout.
```
npm install @xyflow/react d3-force
```

### Performance Edge: Sigma.js stack
**If:** You need to handle 10,000+ nodes or need WebGL rendering.
```
npm install sigma graphology @react-sigma/core graphology-layout-forceatlas2
```

---

## QUICK REFERENCE TABLE

| Library | Bundle(gzip) | React 19 | TypeScript | Force Layout | Labeled Edges | Stars | Active |
|---------|-------------|----------|------------|-------------|---------------|-------|--------|
| cytoscape + react | 139KB | ✅ | ✅ | ✅ | ✅ | 11K | ✅ |
| @xyflow/react | 59KB | ✅ | ✅ | ⚠️ manual | ✅ | 38K | ✅ |
| sigma stack | 39KB | ✅ | ✅ | ✅ | ⚠️ custom | 14K | ✅ |
| vis-network | 111KB | ⚠️ | ✅ | ✅ | ✅ | 3.6K | ⚠️ |
| react-force-graph-2d | 54KB | ✅ | ✅ | ✅ | ✅ | 3.3K | ⚠️ |
| d3-force | 6KB | N/A | ✅ | ✅ | N/A | 2K | ❌ |
| graphology | 13KB | N/A | ✅ | N/A | N/A | 1.7K | ✅ |
| react-d3-graph | 40KB | ❌ | ✅ | ✅ | ✅ | 825 | ❌ |
