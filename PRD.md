# PRD — WebForge 3D
### Browser-Based 3D Scene Editor (Blender-inspired UI, Three.js powered)

---

## 1. Product Overview

**WebForge 3D** is a browser-based 3D modeling and scene editor that mirrors Blender's interface layout and workflow conventions. Built on Three.js, it gives creators a Blender-like experience without installing anything — targeting students, hobbyists, and designers who want fast 3D iteration in the browser.

**Tagline:** *Blender's feel. No install. Right now.*

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| Feel like Blender to existing users | Users identify UI regions by Blender names on first use |
| Enable real 3D scene creation | Users can build, light, and export a scene in < 10 min |
| Performant in-browser | 60fps on a scene with up to 50 objects, modern GPU |
| Accessible entry point | Non-Blender users can add and transform an object in < 2 min |

---

## 3. Target Users

- **Blender beginners** who want to learn concepts before committing to the desktop app
- **Designers / UI devs** needing quick 3D assets without a full DCC tool
- **Students** in 3D design courses with limited access to powerful hardware
- **Prototypers** building 3D mockups for games, AR, or product visualization

---

## 4. Interface Layout (Blender-Faithful)

The UI is divided into Blender's canonical regions. All regions use Blender's dark theme color system.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOPBAR  — App name | File | Edit | Render | Window | Help          │
├──────────┬──────────────────────────────────────┬───────────────────┤
│          │                                      │                   │
│ TOOLBAR  │         3D VIEWPORT                  │   PROPERTIES      │
│ (T Panel)│         (main canvas)                │   PANEL           │
│          │                                      │   (N Panel)       │
│ Add      │   [Viewport Gizmo — top right]        │                   │
│ Select   │   [Viewport Overlays toggle]          │  Object / Material│
│ Move     │   [Shading buttons: Solid/Material/  │  / Light / Scene  │
│ Rotate   │    Rendered/Wireframe]               │  tabs             │
│ Scale    │                                      │                   │
│ Extrude  │                                      │                   │
│ Bevel    │                                      │                   │
│          │                                      │                   │
├──────────┴──────────────────────────────────────┴───────────────────┤
│  OUTLINER (top right panel) — Scene hierarchy, object list          │
├─────────────────────────────────────────────────────────────────────┤
│  TIMELINE (bottom) — Frame range, playhead (Phase 2)                │
└─────────────────────────────────────────────────────────────────────┘
```

### Color System (Blender Dark Theme)

| Token | Hex | Usage |
|---|---|---|
| `--bg-deep` | `#1A1A1A` | Main background, viewport surround |
| `--bg-panel` | `#252525` | Panel backgrounds |
| `--bg-header` | `#1D1D1D` | Topbar, region headers |
| `--border` | `#3A3A3A` | Panel dividers |
| `--accent-orange` | `#E67E22` | Selection highlight, active element |
| `--accent-blue` | `#4772B3` | X/Y/Z gizmo X-axis, active tool indicator |
| `--text-primary` | `#CCCCCC` | Labels, values |
| `--text-dim` | `#888888` | Dimmed labels, hints |
| `--grid` | `#2A2A2A` | Viewport floor grid |

### Typography

- **UI Font:** `Inter` — matches Blender's clean sans-serif readability at small sizes
- **Monospace / values:** `JetBrains Mono` — numeric fields, coordinates, transform inputs
- **Scale:** 11px base (matching Blender's dense UI); 13px for panel headers

---

## 5. Feature Scope

### Phase 1 — Core Editor (MVP)

#### 5.1 Viewport

- Three.js `WebGLRenderer` canvas filling the center region
- `OrbitControls` — middle mouse drag to orbit, Shift+MMB to pan, scroll to zoom
- Numpad shortcuts: `1` front, `3` right, `7` top, `5` toggle ortho/persp (keyboard)
- Viewport shading modes: **Solid**, **Wireframe**, **Material Preview**
- Floor grid + world axes display (toggle via Overlays)
- Viewport gizmo (X/Y/Z axis indicator, clickable for view alignment) — top right corner
- Header overlay buttons: Viewport Shading switcher, Overlays toggle, Gizmo toggle

#### 5.2 Object Management

- **Add Menu** (`Shift+A` or toolbar button):
  - Mesh: Cube, Sphere (UV Sphere), Cylinder, Cone, Torus, Plane, Circle, Icosphere
  - Light: Point, Sun (Directional), Spot, Area
  - Camera (view indicator only in Phase 1)
- **Delete** selected object (`X` or `Delete` key with confirmation popover)
- **Duplicate** (`Shift+D`)
- Object **rename** (double-click in Outliner)
- Object **visibility** toggle (eye icon in Outliner)

#### 5.3 Selection & Transform

- Left-click to select; Shift+click to multi-select; `A` to select all / deselect all
- Active object highlighted with orange outline (using `OutlinePass`)
- **Transform Gizmo** (Three.js `TransformControls`):
  - `G` — Grab/Move (red/green/blue axis arrows)
  - `R` — Rotate (red/green/blue rings)
  - `S` — Scale (red/green/blue squares)
  - Axis constraint: `G X`, `G Y`, `G Z` to constrain to axis
- Numeric input field in Properties N-Panel:
  - Location X / Y / Z
  - Rotation X / Y / Z (degrees)
  - Scale X / Y / Z

#### 5.4 Extrude & Bevel (Signature Feature)

- **Shape-to-Extrude Workflow:**
  1. User enters **Shape Draw Mode** from the toolbar
  2. Draws a 2D polygon on the XZ plane (click to add points, close to finish)
  3. Shape extrudes along Y-axis using `THREE.ExtrudeGeometry`
  4. Extrude depth controlled via slider in Properties panel (range: 0.01 → 10)
- **Bevel controls** (applied at extrude time):
  - Bevel Enabled toggle
  - Bevel Thickness slider
  - Bevel Size slider
  - Bevel Segments (1–5)
- Result merges into scene as a named mesh object

#### 5.5 Material Editor

Properties panel → Material tab (when object selected):
- **Base Color** — color picker (hex input + hue/saturation wheel)
- **Metalness** — 0.0 → 1.0 slider
- **Roughness** — 0.0 → 1.0 slider
- **Opacity / Transparent** toggle + alpha slider
- **Wireframe** toggle
- **Emissive Color** + emissive intensity
- Material preview updates live in viewport

#### 5.6 Lighting

- Default scene: one Sun light + ambient
- Add lights via Add Menu
- Per-light properties in Properties panel → Light tab:
  - Color picker
  - Intensity slider
  - **Point light:** Radius / Distance
  - **Spot light:** Angle, Penumbra
  - **Sun:** Direction (auto from rotation)
- Shadow toggle per light (PCF soft shadows)

#### 5.7 Outliner

- Top-right panel listing all scene objects
- Icon per type: mesh (triangle), light (bulb), camera (camera)
- Click to select / active in viewport
- Eye icon to hide/show
- Lock icon to prevent accidental selection
- Hierarchy indentation for parented objects (Phase 1: flat list, Phase 2: hierarchy)

#### 5.8 Properties Panel (N-Panel, right side)

Tabs (matching Blender icons):
1. **Item** — Name, Location, Rotation, Scale
2. **Tool** — Active tool settings (extrude depth, bevel params when in shape mode)
3. **View** — Clip start/end, focal length
4. **Object** — Visibility, display as (solid/bounds/wire)
5. **Material** — All material properties (see 5.5)
6. **Light** — Appears only when a light is selected

#### 5.9 Scene Settings

- Background: Solid Color (color picker) or Gradient
- Fog: toggle, density slider, color
- Ambient Occlusion: toggle

#### 5.10 Import / Export

- **Export:** Download scene as `.glb` (via `THREE.GLTFExporter`)
- **Import:** Upload `.glb`, `.gltf`, `.obj` files — object added to scene

---

### Phase 2 — Post-MVP

| Feature | Notes |
|---|---|
| Basic Keyframe Animation | Set location/rotation/scale keys, play back in timeline |
| Boolean Operations | Union / Subtract / Intersect via `three-bvh-csg` |
| Edge / Face Selection Mode | Custom raycasting; `E` to extrude face |
| Mirror Modifier | Mirror on X/Y/Z axis with live preview |
| HDRI Background | Upload or choose from preset environments |
| Subdivision (Basic) | Loop subdivision, 1–3 levels |
| Snap to Grid | Toggle, configurable increment |
| Multiple Cameras + Render Preview | Render viewport to image download |
| Collaboration (real-time) | WebSocket-based shared sessions |

---

## 6. Keyboard Shortcuts (Phase 1)

Matching Blender conventions wherever possible.

| Shortcut | Action |
|---|---|
| `Shift+A` | Add object menu |
| `X` / `Delete` | Delete selected |
| `Shift+D` | Duplicate |
| `G` | Grab (move) |
| `R` | Rotate |
| `S` | Scale |
| `G X/Y/Z` | Constrain to axis |
| `A` | Select all / deselect all |
| `1` / `3` / `7` | Front / Right / Top view |
| `5` | Toggle orthographic / perspective |
| `Numpad 0` | Camera view |
| `Tab` | Toggle edit mode (shape draw) |
| `N` | Toggle N-Panel (Properties) |
| `T` | Toggle T-Panel (Toolbar) |
| `Z` | Shading pie menu (Solid / Wire / Material) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `F` | Focus on selected object |
| `.` (period) | Frame selected in viewport |

---

## 7. Technical Architecture

### Stack

| Layer | Choice | Reason |
|---|---|---|
| 3D Engine | `Three.js r165+` | Best-in-class browser 3D, rich ecosystem |
| Transform Gizmo | `THREE.TransformControls` | Built-in, Blender-like feel |
| Post-processing | `THREE.EffectComposer` + `OutlinePass` | Selection highlight |
| UI Framework | `React` + `Tailwind CSS` (dark theme) | Panel system, state management |
| 3D State | `Zustand` | Lightweight, reactive scene state |
| Export | `THREE.GLTFExporter` | Industry standard format |
| Import | `THREE.GLTFLoader` + `THREE.OBJLoader` | Wide file support |
| Build | `Vite` | Fast HMR, tree-shaking |

### Scene State Model

```typescript
interface SceneObject {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera'
  visible: boolean
  locked: boolean
  position: Vector3
  rotation: Euler
  scale: Vector3
  material?: MaterialConfig
  lightConfig?: LightConfig
  geometry?: GeometryType
}

interface SceneState {
  objects: SceneObject[]
  selected: string[]          // active object IDs
  mode: 'object' | 'shape'   // object mode vs shape draw mode
  camera: CameraConfig
  scene: { background, fog, ambientOcclusion }
}
```

### Key Constraints

- No server required in Phase 1 — fully static, runs in browser
- Target: 60fps with up to 50 mesh objects on mid-range GPU
- No WebGPU in Phase 1 (broader compatibility with WebGL2)
- Mobile: viewable but not primary target; full UX requires mouse

---

## 8. Design Principles

1. **Blender-first conventions** — if a Blender user sits down, nothing should feel foreign
2. **Progressive disclosure** — basic controls visible, advanced settings in panels on demand
3. **Live feedback** — every change reflects in the viewport instantly, no Apply buttons
4. **Dense UI is intentional** — Blender's compact panel style is a feature, not a bug; don't over-pad
5. **Never modal when avoidable** — operations that require modes (shape draw) are clearly indicated with a header bar mode indicator (matching Blender's mode selector)

---

## 9. Out of Scope (Explicit Non-Goals)

- Mesh sculpting
- UV unwrapping / texture painting
- Rigging and armatures
- Physics simulation
- Shader node editor
- Video editing
- Geometry nodes
- Cycles/EEVEE-quality path tracing
- Cloud save / accounts (Phase 1)

---

## 10. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | Should shape draw mode work on arbitrary faces or only XZ ground plane? | Design | High |
| 2 | What's the undo stack depth limit? | Eng | Medium |
| 3 | Do we bundle any default HDRI environments for Phase 2? | Design | Low |
| 4 | Should `.blend` import be a Phase 2 goal (via Blender's GLTF export)? | Product | Low |
| 5 | Viewport performance: use instanced meshes for duplicate objects? | Eng | Medium |

---

*Document version: 1.0 — Phase 1 MVP scope*
*Next review: After prototype viewport is built*
