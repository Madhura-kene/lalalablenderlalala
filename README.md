#  La Blender — Blender in the Web

**La Blender** is a premium, lightweight, browser-based 3D modeling environment built with **React**, **TypeScript**, and **Three.js**. It replicates standard Blender 3D UI, navigation controls, and hotkey workflows right inside a modern web interface.

---

##  Features

### 1.  Target-Relative Viewport Navigation
*   **Intuitive Camera Controls**: Orbit, Pan, and Zoom smoothly using mouse clicks and drags.
    *   **Left-Click Drag**: Orbit / Rotate view (distinguishes drag from single-click selection)
    *   **Middle-Click Drag**: Orbit / Rotate (Blender style)
    *   **Right-Click Drag**: Pan view
    *   **Scroll Wheel**: Zoom in/out
*   **Camera Preset Alignment**: Quickly snap view orientations relative to the active selection or orbit target:
    *   `1`: Front View
    *   `3`: Right View
    *   `7`: Top View
    *   `5`: Toggle Orthographic / Perspective projection
    *   `Period (.)` or `F`: Focus camera on selection

### 2.  Edit Mode (Vertex, Edge, Face)
*   Toggle between **Object Mode** and **Edit Mode** using `Tab` (or the top header dropdown).
*   Switch Edit Sub-modes:
    *   `1`: **Vertex Mode** (Highlight and select vertices by proximity)
    *   `2`: **Edge Mode** (Highlight and select edges)
    *   `3`: **Face Mode** (Highlight and select individual faces)
*   **Visual Highlights**: Selected elements glow orange to provide clean visual feedback.

### 3. Blender-Style Modal Transforms (G/S/R)
Perform transforms dynamically by hitting the hotkey, dragging the mouse, and optionally constraining to an axis:
*   **G (Grab/Move)**: Moves the selected object.
*   **S (Scale)**: Scales the selected object.
*   **R (Rotate)**: Rotates the selected object.
*   **Axis Constraints (`X` / `Y` / `Z`)**: Pressing `X`, `Y`, or `Z` after starting a transform locks the operation to that axis.
*   **Real-time HUD**: Displays active axis, transform operation, and live value changes at the bottom center.
*   **Confirm/Cancel**: Left-click or press `Enter` to commit, press `Esc` to restore original transform state.

### 4.  Floating Add Object Menu (`Shift + A`)
*   Pressing `Shift + A` anywhere in the viewport pops open a nested dropdown context menu at the mouse cursor.
*   **Mesh**: Plane, Cube, Circle, UV Sphere, Cylinder, Cone, Torus, Icosphere.
*   **Light**: Point Light, Sun Light, Spot Light.

### 5. ✒️ Custom Shape Extrusion
*   Enable **Draw Shape (Tab)** tool.
*   Left-click on the floor grid to draw points.
*   Press `Enter` to complete the polygon shape and instantly extrude it into 3D space.

---

##  Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Madhura-kene/lalalablenderlalala.git
   cd lalalablenderlalala
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173/`.

---

##  Tech Stack
*   **Core**: React 19, TypeScript
*   **3D Engine**: Three.js
*   **Styling**: Vanilla CSS with Tailwind CSS utilities
*   **Icons**: Lucide React
*   **Bundler**: Vite
