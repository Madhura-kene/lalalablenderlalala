import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { useSceneStore } from '../store/useSceneStore'
import { Eye, Compass } from 'lucide-react'

export const Viewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    objects,
    selectedIds,
    activeTool,
    mode,
    editSubMode,
    viewportSettings,
    sceneSettings,
    selectObject,
    deselectAll,
    updateObject,
    addObject,
    setMode,
    setEditSubMode,
    updateViewportSettings
  } = useSceneStore()

  // Keep references to Three.js elements
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const outlinePassRef = useRef<OutlinePass | null>(null)
  
  // Track 3D objects in the scene mapping id -> 3D Object
  const sceneObjectsMapRef = useRef<Map<string, THREE.Object3D>>(new Map())
  
  // Local state for Shape Drawing
  const [drawingPoints, setDrawingPoints] = useState<THREE.Vector3[]>([])
  const drawingHelpersRef = useRef<THREE.Group | null>(null)
  const mousePlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseVecRef = useRef<THREE.Vector2>(new THREE.Vector2())

  // Local state for Extrude Mode (E key)
  const [extrudeMode, setExtrudeMode] = useState(false)
  const [extrudeValue, setExtrudeValue] = useState(0)
  const extrudeStartYRef = useRef<number | null>(null)
  const extrudeBaseScaleRef = useRef<[number, number, number]>([1, 1, 1])
  const extrudeObjectIdRef = useRef<string | null>(null)

  // Modal Transform (Blender-style G/S/R + X/Y/Z axis constraint)
  type ModalTransform = {
    type: 'move' | 'scale' | 'rotate'
    axis: 'x' | 'y' | 'z' | null
    startX: number; startY: number
    startPos: [number,number,number]
    startScale: [number,number,number]
    startRot: [number,number,number]
    objId: string
  }
  const modalRef = useRef<ModalTransform | null>(null)
  const [modalDisplay, setModalDisplay] = useState<{ type: string; axis: string|null; value: number } | null>(null)

  // Version counter — incremented every time the Three.js scene is (re)created
  // so the objects effect always re-runs after a fresh scene init.
  const [sceneVersion, setSceneVersion] = useState(0)

  // Track mouse-down position to distinguish click from drag
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null)

  // Floating Add Menu (Blender-like Shift+A menu)
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null)
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Edit Mode helpers
  const editHelperGroupRef = useRef<THREE.Group | null>(null)
  const faceHighlightRef = useRef<THREE.Object3D | null>(null)
  const vertHighlightRef = useRef<THREE.Points | null>(null)
  const editSelRef = useRef<{ type: 'face'|'vertex'|'edge'; index: number; faceNormal?: THREE.Vector3 } | null>(null)
  const [editSelCount, setEditSelCount] = useState(0)
  const stateRef = useRef({ objects, selectedIds, activeTool, mode })
  useEffect(() => {
    stateRef.current = { objects, selectedIds, activeTool, mode }
  }, [objects, selectedIds, activeTool, mode])

  // Ref so the animate loop always reads current viewport settings (avoids stale closure)
  const viewportSettingsRef = useRef(viewportSettings)
  useEffect(() => {
    viewportSettingsRef.current = viewportSettings
  }, [viewportSettings])

  // --- EDIT MODE HELPERS: wireframe overlay + vertex points ---
  useEffect(() => {
    const scene = sceneRef.current

    // Always clean up previous helpers first
    if (editHelperGroupRef.current) { scene?.remove(editHelperGroupRef.current); editHelperGroupRef.current = null }
    if (faceHighlightRef.current)   { scene?.remove(faceHighlightRef.current);   faceHighlightRef.current = null }
    if (vertHighlightRef.current)   { scene?.remove(vertHighlightRef.current);   vertHighlightRef.current = null }
    editSelRef.current = null
    setEditSelCount(0)

    if (mode !== 'edit' || !scene) return
    const selId = selectedIds[0]
    if (!selId) return
    const threeObj = sceneObjectsMapRef.current.get(selId)
    if (!threeObj || !(threeObj instanceof THREE.Mesh)) return

    threeObj.updateMatrixWorld(true)
    const geo = threeObj.geometry
    const group = new THREE.Group()
    group.name = 'edit-helpers'

    // Wireframe overlay
    const wfGeo = new THREE.WireframeGeometry(geo)
    const wfLines = new THREE.LineSegments(wfGeo, new THREE.LineBasicMaterial({
      color: 0xaaaaaa, depthTest: false, transparent: true, opacity: 0.7
    }))
    wfLines.matrix.copy(threeObj.matrixWorld)
    wfLines.matrixAutoUpdate = false
    group.add(wfLines)

    // Vertex points (deduplicated)
    const posAttr = geo.getAttribute('position')
    const seen = new Map<string, [number, number, number]>()
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i)
      const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
      if (!seen.has(key)) seen.set(key, [x, y, z])
    }
    const vtxArr = new Float32Array([...seen.values()].flat())
    const vtxGeo = new THREE.BufferGeometry()
    vtxGeo.setAttribute('position', new THREE.BufferAttribute(vtxArr, 3))
    const vtxPts = new THREE.Points(vtxGeo, new THREE.PointsMaterial({
      color: 0xdddddd, size: 7, sizeAttenuation: false, depthTest: false
    }))
    vtxPts.matrix.copy(threeObj.matrixWorld)
    vtxPts.matrixAutoUpdate = false
    vtxPts.name = 'edit-vtx'
    group.add(vtxPts)

    scene.add(group)
    editHelperGroupRef.current = group
    return () => { scene.remove(group) }
  }, [mode, selectedIds[0] ?? '', sceneVersion])

  // --- INITIALIZE THREE.JS ---
  useEffect(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(sceneSettings.backgroundColor)
    sceneRef.current = scene
    // Bump version so objects effect knows to re-add everything to the fresh scene
    setSceneVersion(v => v + 1)

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
    camera.position.set(7, 6, 9)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    renderer.shadowMap.type = THREE.PCFShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(
      sceneSettings.ambientColor,
      sceneSettings.ambientIntensity
    )
    ambientLight.name = 'ambient-light'
    scene.add(ambientLight)

    // Floor Grid (Blender style)
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x2c2c2c)
    gridHelper.position.y = 0
    gridHelper.name = 'floor-grid'
    scene.add(gridHelper)

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(5)
    axesHelper.position.set(0, 0.01, 0) // slightly above grid to avoid z-fighting
    axesHelper.name = 'axes-helper'
    // Style axes colors
    const axesGeo = axesHelper.geometry
    const colors = axesGeo.attributes.color
    if (colors) {
      // X = Red, Y = Green, Z = Blue (standard Three.js)
      // Blender has X = Red, Y = Green, Z = Blue too, but Z is UP.
      // In Three.js, Y is UP. We'll stick to Three.js orientation for simplicity.
    }
    scene.add(axesHelper)

    // Orbit Controls — left drag to rotate, right drag to pan, scroll to zoom
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,   // left-drag = orbit
      MIDDLE: THREE.MOUSE.ROTATE, // middle-drag = orbit (Blender style)
      RIGHT: THREE.MOUSE.PAN      // right-drag = pan
    }
    controls.update()
    controlsRef.current = controls

    // Transform Controls
    const transformControls = new TransformControls(camera, renderer.domElement)
    transformControls.size = 0.75
    transformControls.addEventListener('change', () => renderer.render(scene, camera))
    transformControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value
    })
    
    // On transform completion (mouse release), update state store
    transformControls.addEventListener('mouseUp', () => {
      const activeObj = transformControls.object
      if (activeObj) {
        const id = activeObj.name
        
        // Convert Euler back to array
        const pos: [number, number, number] = [
          activeObj.position.x,
          activeObj.position.y,
          activeObj.position.z
        ]
        const rot: [number, number, number] = [
          activeObj.rotation.x,
          activeObj.rotation.y,
          activeObj.rotation.z
        ]
        const scl: [number, number, number] = [
          activeObj.scale.x,
          activeObj.scale.y,
          activeObj.scale.z
        ]
        
        updateObject(id, { position: pos, rotation: rot, scale: scl })
      }
    })
    scene.add(transformControls.getHelper())
    transformControlsRef.current = transformControls

    // Post Processing (OutlinePass for selection highlight)
    const composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera
    )
    outlinePass.edgeStrength = 3.0
    outlinePass.edgeThickness = 1.0
    outlinePass.visibleEdgeColor.set('#E67E22') // Blender orange selection
    outlinePass.hiddenEdgeColor.set('#E67E22')
    composer.addPass(outlinePass)

    const outputPass = new OutputPass()
    composer.addPass(outputPass)
    composerRef.current = composer
    outlinePassRef.current = outlinePass

    // Shape drawing helpers container
    const drawGroup = new THREE.Group()
    drawGroup.name = 'draw-helpers'
    scene.add(drawGroup)
    drawingHelpersRef.current = drawGroup

    // Animation / Render loop
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()

      // Use ref so we always get current viewport settings (not stale closure)
      const vps = viewportSettingsRef.current
      gridHelper.visible = vps.showGrid && vps.showOverlays
      axesHelper.visible = vps.showOverlays

      // Always render via renderer to ensure objects are visible.
      // Composer (OutlinePass) can fail in some environments; use it as overlay only.
      renderer.render(scene, camera)
    }
    animate()

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current || !composerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      
      if (cameraRef.current instanceof THREE.PerspectiveCamera) {
        cameraRef.current.aspect = w / h
        cameraRef.current.updateProjectionMatrix()
      }
      rendererRef.current.setSize(w, h)
      composerRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      renderer.dispose()
      sceneRef.current = null
      sceneObjectsMapRef.current.clear()
    }
  }, [])

  // --- RESPOND TO SCENE SETTINGS (BACKGROUND, FOG, AMBIENT LIGHT) ---
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Background Color
    scene.background = new THREE.Color(sceneSettings.backgroundColor)

    // Fog
    if (sceneSettings.fogEnabled) {
      scene.fog = new THREE.FogExp2(sceneSettings.fogColor, sceneSettings.fogDensity)
    } else {
      scene.fog = null
    }

    // Ambient Light
    const ambient = scene.getObjectByName('ambient-light') as THREE.AmbientLight
    if (ambient) {
      ambient.color.set(sceneSettings.ambientColor)
      ambient.intensity = sceneSettings.ambientIntensity
    }
  }, [sceneSettings])

  // --- REBUILD SCENE OBJECTS WHEN STATE STORES UPDATES ---
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const currentMap = sceneObjectsMapRef.current
    const nextMap = new Map<string, THREE.Object3D>()

    // Check which objects were deleted
    currentMap.forEach((threeObj, id) => {
      if (!objects.some(o => o.id === id)) {
        scene.remove(threeObj)
        // Dispose geometries & materials to avoid memory leaks
        threeObj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
    })

    // Add or update objects
    objects.forEach((obj) => {
      let threeObj = currentMap.get(obj.id)
      let needsRebuild = false

      // Check if we need to rebuild the mesh due to type or geometry params change
      if (threeObj) {
        const cachedType = threeObj.userData.type
        const cachedGeoType = threeObj.userData.geometryType
        const cachedExtrudeDepth = threeObj.userData.extrudeDepth
        const cachedBevelEnabled = threeObj.userData.bevelEnabled
        const cachedBevelThickness = threeObj.userData.bevelThickness
        const cachedBevelSize = threeObj.userData.bevelSize
        const cachedBevelSegments = threeObj.userData.bevelSegments

        if (
          cachedType !== obj.type ||
          cachedGeoType !== obj.geometryType ||
          cachedExtrudeDepth !== obj.extrudeDepth ||
          cachedBevelEnabled !== obj.bevelEnabled ||
          cachedBevelThickness !== obj.bevelThickness ||
          cachedBevelSize !== obj.bevelSize ||
          cachedBevelSegments !== obj.bevelSegments
        ) {
          scene.remove(threeObj)
          needsRebuild = true
        }
      }

      if (!threeObj || needsRebuild) {
        // Create 3D Object
        if (obj.type === 'mesh') {
          let geometry: THREE.BufferGeometry

          if (obj.geometryType === 'extrude' && obj.shapeVertices) {
            // Draw shape on XZ plane, extruded upwards
            const shape2d = new THREE.Shape()
            obj.shapeVertices.forEach((pt, index) => {
              if (index === 0) shape2d.moveTo(pt[0], pt[1])
              else shape2d.lineTo(pt[0], pt[1])
            })
            // Close shape
            if (obj.shapeVertices.length > 2) {
              shape2d.closePath()
            }

            const extrudeSettings = {
              depth: obj.extrudeDepth ?? 1,
              bevelEnabled: obj.bevelEnabled ?? false,
              bevelThickness: obj.bevelThickness ?? 0.05,
              bevelSize: obj.bevelSize ?? 0.05,
              bevelSegments: obj.bevelSegments ?? 3,
            }

            geometry = new THREE.ExtrudeGeometry(shape2d, extrudeSettings)
            // Center the geometry origin to coordinates
            geometry.center()
          } else {
            // Standard geometries
            switch (obj.geometryType) {
              case 'cube':
                geometry = new THREE.BoxGeometry(1, 1, 1)
                break
              case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 32, 16)
                break
              case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
                break
              case 'cone':
                geometry = new THREE.ConeGeometry(0.5, 1, 32)
                break
              case 'torus':
                geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 100)
                break
              case 'plane':
                geometry = new THREE.PlaneGeometry(1, 1)
                break
              case 'circle':
                geometry = new THREE.CircleGeometry(0.5, 32)
                break
              case 'icosphere':
                geometry = new THREE.IcosahedronGeometry(0.5, 2)
                break
              default:
                geometry = new THREE.BoxGeometry(1, 1, 1)
            }
          }

          const mat = obj.materialConfig || {
            color: '#808080',
            metalness: 0.0,
            roughness: 0.5,
            opacity: 1.0,
            transparent: false,
            wireframe: false,
            emissive: '#000000',
            emissiveIntensity: 1.0
          }

          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(mat.color),
            metalness: mat.metalness,
            roughness: mat.roughness,
            opacity: mat.opacity,
            transparent: mat.transparent,
            wireframe: mat.wireframe,
            emissive: new THREE.Color(mat.emissive),
            emissiveIntensity: mat.emissiveIntensity
          })

          threeObj = new THREE.Mesh(geometry, material)
          threeObj.castShadow = true
          threeObj.receiveShadow = true

          // Rotation adjustment for Extrude shape so depth goes along Y axis
          if (obj.geometryType === 'extrude') {
            // ExtrudeGeometry extrudes along Z, rotate to extrude along Y (upwards)
            threeObj.rotation.x = -Math.PI / 2
          }
        } 
        else if (obj.type === 'light' && obj.lightConfig) {
          const lgt = obj.lightConfig
          let light: THREE.Light

          switch (lgt.type) {
            case 'point':
              light = new THREE.PointLight(lgt.color, lgt.intensity, lgt.distance ?? 10)
              break
            case 'sun':
              light = new THREE.DirectionalLight(lgt.color, lgt.intensity)
              break
            case 'spot':
              light = new THREE.SpotLight(
                lgt.color,
                lgt.intensity,
                lgt.distance ?? 10,
                lgt.angle ?? Math.PI / 6,
                lgt.penumbra ?? 0.5
              )
              break
            default:
              light = new THREE.PointLight(lgt.color, lgt.intensity)
          }

          light.castShadow = lgt.castShadow
          ;(light as any).shadow.mapSize.width = 1024
          ;(light as any).shadow.mapSize.height = 1024
          
          // Visual helper representation for light sources in viewport
          const lightGroup = new THREE.Group()
          lightGroup.add(light)

          // Add simple visual wireframe sphere helper for point lights, cone for spot
          let helper: THREE.Object3D
          if (lgt.type === 'sun') {
            helper = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
              new THREE.MeshBasicMaterial({ color: '#ffcc00', wireframe: true })
            )
            helper.rotation.x = Math.PI / 2
          } else if (lgt.type === 'spot') {
            helper = new THREE.Mesh(
              new THREE.ConeGeometry(0.25, 0.5, 8),
              new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true })
            )
            helper.rotation.x = Math.PI / 2
          } else {
            helper = new THREE.Mesh(
              new THREE.SphereGeometry(0.15, 8, 8),
              new THREE.MeshBasicMaterial({ color: '#ffcc00', wireframe: true })
            )
          }
          lightGroup.add(helper)
          threeObj = lightGroup
        }

        if (threeObj) {
          threeObj.name = obj.id
          // Save metadata
          threeObj.userData = {
            type: obj.type,
            geometryType: obj.geometryType,
            extrudeDepth: obj.extrudeDepth,
            bevelEnabled: obj.bevelEnabled,
            bevelThickness: obj.bevelThickness,
            bevelSize: obj.bevelSize,
            bevelSegments: obj.bevelSegments
          }
          console.log("Adding object to Three.js scene:", obj.name, "(id:", obj.id, ")", threeObj)
          scene.add(threeObj)
        }
      }

      // Update position, rotation, and scale dynamically
      if (threeObj) {
        threeObj.position.set(obj.position[0], obj.position[1], obj.position[2])
        
        // Extrude shapes are pre-rotated on X axis, add local rotation
        if (obj.geometryType === 'extrude') {
          threeObj.rotation.set(
            -Math.PI / 2 + obj.rotation[0],
            obj.rotation[1],
            obj.rotation[2]
          )
        } else {
          threeObj.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2])
        }

        threeObj.scale.set(obj.scale[0], obj.scale[1], obj.scale[2])
        threeObj.visible = obj.visible

        // Update materials live (non-rebuilding updates)
        if (obj.type === 'mesh' && threeObj instanceof THREE.Mesh) {
          try {
            const mat = obj.materialConfig
            const threeMat = threeObj.material
            if (mat && threeMat) {
              if ('color' in threeMat && (threeMat as any).color && typeof (threeMat as any).color.set === 'function') {
                (threeMat as any).color.set(mat.color)
              }
              if ('metalness' in threeMat) {
                (threeMat as any).metalness = mat.metalness
              }
              if ('roughness' in threeMat) {
                (threeMat as any).roughness = mat.roughness
              }
              threeMat.opacity = mat.opacity
              threeMat.transparent = mat.transparent
              threeMat.wireframe = viewportSettings.shadingMode === 'wireframe' || mat.wireframe
              if ('emissive' in threeMat && (threeMat as any).emissive && typeof (threeMat as any).emissive.set === 'function') {
                (threeMat as any).emissive.set(mat.emissive)
                (threeMat as any).emissiveIntensity = mat.emissiveIntensity
              }
              
              // Solid mode: use actual material color (no clay override)
              threeMat.wireframe = viewportSettings.shadingMode === 'wireframe' || mat.wireframe
            }
          } catch (err) {
            console.error("Error updating material for object:", obj.name, "ID:", obj.id, "Error:", err, "Material:", threeObj.material)
          }
        }

        // Update lights live
        if (obj.type === 'light') {
          const lgt = obj.lightConfig
          const lightObj = threeObj.children[0] as THREE.Light
          if (lgt && lightObj) {
            lightObj.color.set(lgt.color)
            lightObj.intensity = lgt.intensity
            lightObj.castShadow = lgt.castShadow
            if (lightObj instanceof THREE.PointLight || lightObj instanceof THREE.SpotLight) {
              lightObj.distance = lgt.distance ?? 10
            }
            if (lightObj instanceof THREE.SpotLight) {
              lightObj.angle = lgt.angle ?? Math.PI / 6
              lightObj.penumbra = lgt.penumbra ?? 0.5
            }
          }
        }

        nextMap.set(obj.id, threeObj)
      }
    })

    sceneObjectsMapRef.current = nextMap
    console.log("Current Three.js scene children after rebuild:", scene.children.map(c => ({ name: c.name, type: c.type, visible: c.visible })))
  }, [objects, viewportSettings.shadingMode, sceneVersion])

  // --- RESPOND TO SELECTION & GIZMO PLACEMENT ---
  useEffect(() => {
    const transformControls = transformControlsRef.current
    const outlinePass = outlinePassRef.current
    if (!transformControls || !outlinePass) return

    const activeObj = sceneObjectsMapRef.current.get(selectedIds[0] || '')
    const selectedObjState = objects.find(o => o.id === selectedIds[0])

    if (activeObj && selectedObjState && !selectedObjState.locked && activeTool !== 'select' && activeTool !== 'shape-draw') {
      transformControls.attach(activeObj)
      
      // Update transform control mode
      if (activeTool === 'move') transformControls.setMode('translate')
      if (activeTool === 'rotate') transformControls.setMode('rotate')
      if (activeTool === 'scale') transformControls.setMode('scale')
    } else {
      transformControls.detach()
    }

    // Update outline highlighting
    const outlineObjects: THREE.Object3D[] = []
    selectedIds.forEach((id) => {
      const o = sceneObjectsMapRef.current.get(id)
      if (o) {
        // Outline Pass needs meshes. For lights (which are groups), highlight their child helpers
        if (o instanceof THREE.Group) {
          outlineObjects.push(...o.children)
        } else {
          outlineObjects.push(o)
        }
      }
    })
    outlinePass.selectedObjects = outlineObjects
  }, [selectedIds, activeTool, objects])

  // --- RESPOND TO WINDOW CUSTOM EVENTS (KEYBOARD COMMANDS) ---
  useEffect(() => {
    const handleAlignCamera = (e: Event) => {
      const view = (e as CustomEvent).detail.view
      const camera = cameraRef.current
      const controls = controlsRef.current
      if (!camera || !controls) return

      const target = controls.target.clone()
      const dist = 10

      // Align camera presets focused on active target
      if (view === 'front') {
        camera.position.set(target.x, target.y, target.z + dist)
      } else if (view === 'right') {
        camera.position.set(target.x + dist, target.y, target.z)
      } else if (view === 'top') {
        camera.position.set(target.x, target.y + dist, target.z)
      }
      
      camera.lookAt(target)
      controls.update()
    }

    const handleToggleOrtho = () => {
      const camera = cameraRef.current
      const scene = sceneRef.current
      const renderer = rendererRef.current
      const controls = controlsRef.current
      if (!camera || !scene || !renderer || !controls) return

      const w = containerRef.current?.clientWidth ?? 800
      const h = containerRef.current?.clientHeight ?? 600
      const aspect = w / h

      if (camera instanceof THREE.PerspectiveCamera) {
        // Switch to orthographic camera
        const frustumSize = 10
        const orthoCamera = new THREE.OrthographicCamera(
          (frustumSize * aspect) / -2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          frustumSize / -2,
          0.1,
          1000
        )
        orthoCamera.position.copy(camera.position)
        orthoCamera.rotation.copy(camera.rotation)
        
        controls.object = orthoCamera
        cameraRef.current = orthoCamera
      } else {
        // Switch back to perspective camera
        const perspCamera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000)
        perspCamera.position.copy(camera.position)
        perspCamera.rotation.copy(camera.rotation)
        
        controls.object = perspCamera
        cameraRef.current = perspCamera
      }
      controls.update()
    }

    const handleFocusCamera = () => {
      const camera = cameraRef.current
      const controls = controlsRef.current
      if (!camera || !controls) return

      const selId = stateRef.current.selectedIds[0]
      const activeObj = sceneObjectsMapRef.current.get(selId || '')
      if (activeObj) {
        const box = new THREE.Box3().setFromObject(activeObj)
        const center = new THREE.Vector3()
        box.getCenter(center)
        
        controls.target.copy(center)
        camera.position.copy(center).add(new THREE.Vector3(4, 3, 5))
        controls.update()
      }
    }

    const handleSetTransformAxis = (e: Event) => {
      const axis = (e as CustomEvent).detail.axis.toLowerCase() // x, y, z
      const transformControls = transformControlsRef.current
      if (!transformControls) return
      
      // Restrict TransformControls axis constraint dynamically
      if (transformControls.dragging) {
        transformControls.showX = axis === 'x'
        transformControls.showY = axis === 'y'
        transformControls.showZ = axis === 'z'
      }
    }

    const handleShowAddMenuAtCursor = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.x === 'number') {
        // Position at details, or last tracked cursor coordinates
        setAddMenuPos({
          x: lastMousePosRef.current.x > 0 ? lastMousePosRef.current.x : detail.x,
          y: lastMousePosRef.current.y > 0 ? lastMousePosRef.current.y : detail.y
        })
      } else {
        setAddMenuPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      }
    }

    window.addEventListener('align-camera', handleAlignCamera)
    window.addEventListener('toggle-ortho', handleToggleOrtho)
    window.addEventListener('focus-camera', handleFocusCamera)
    window.addEventListener('set-transform-axis', handleSetTransformAxis)
    window.addEventListener('show-add-menu-at-cursor', handleShowAddMenuAtCursor)
    window.addEventListener('click', () => setAddMenuPos(null))

    return () => {
      window.removeEventListener('align-camera', handleAlignCamera)
      window.removeEventListener('toggle-ortho', handleToggleOrtho)
      window.removeEventListener('focus-camera', handleFocusCamera)
      window.removeEventListener('set-transform-axis', handleSetTransformAxis)
      window.removeEventListener('show-add-menu-at-cursor', handleShowAddMenuAtCursor)
    }
  }, [])

  // --- MOUSE HANDLERS FOR SELECTION AND DRAW MODE ---
  // Selection is moved to mouseUp so it doesn't conflict with left-drag-to-orbit.
  // We only select if the pointer barely moved (< 5px) = it was a click not a drag.
  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleViewportMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return
    if (e.button !== 0) return

    // Ignore if extrude mode handled the click
    if (extrudeMode) return

    // Ignore if this was a drag (orbit), not a click
    const down = mouseDownPosRef.current
    if (down) {
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (Math.sqrt(dx * dx + dy * dy) > 5) return // was a drag, not a click
    }
    mouseDownPosRef.current = null

    // Don't interact if user clicked on Transform controls gizmo handles
    const transformControls = transformControlsRef.current
    if (transformControls && (transformControls as any).pointerIsOver) return

    // Calculate normalized device coordinates
    const rect = rendererRef.current.domElement.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const x = (mx / rect.width) * 2 - 1
    const y = -(my / rect.height) * 2 + 1
    mouseVecRef.current.set(x, y)

    raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current)

    // EDIT MODE: route to geometry selection
    if (mode === 'edit') {
      handleEditModeSelection(e, mx, my, rect)
      return
    }


    // SHAPE DRAW MODE: ADD POINT
    if (stateRef.current.mode === 'shape') {
      const intersects = raycasterRef.current.ray.intersectPlane(mousePlaneRef.current, new THREE.Vector3())
      if (intersects) {
        const newPt = new THREE.Vector3(intersects.x, 0, intersects.z)
        if (drawingPoints.length > 2 && newPt.distanceTo(drawingPoints[0]) < 0.3) {
          completeDrawing()
        } else {
          const nextPoints = [...drawingPoints, newPt]
          setDrawingPoints(nextPoints)
          updateDrawingHelpers(nextPoints)
        }
      }
      return
    }

    // OBJECT MODE: SELECTION RAYCASTING
    const interactableObjects: THREE.Object3D[] = []
    sceneObjectsMapRef.current.forEach((obj) => {
      const objState = objects.find(o => o.id === obj.name)
      if (objState && !objState.locked) {
        if (obj instanceof THREE.Group) {
          interactableObjects.push(...obj.children)
        } else {
          interactableObjects.push(obj)
        }
      }
    })

    const hits = raycasterRef.current.intersectObjects(interactableObjects, true)

    if (hits.length > 0) {
      let hitObj = hits[0].object
      while (hitObj.parent && hitObj.parent !== sceneRef.current) {
        hitObj = hitObj.parent
      }
      selectObject(hitObj.name, e.shiftKey)
    } else {
      deselectAll()
    }
  }

  // --- REAL-TIME DRAW MODE PREVIEW + MODAL TRANSFORM ---
  const handleViewportMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Keep track of cursor coordinates for Shift+A placement
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }

    // --- MODAL TRANSFORM: live axis-constrained move/scale/rotate ---
    if (modalRef.current) {
      const mt = modalRef.current
      // Init start position to first mouse position
      if (mt.startX === window.innerWidth / 2) {
        mt.startX = e.clientX
        mt.startY = e.clientY
      }
      const dx = e.clientX - mt.startX
      const dy = e.clientY - mt.startY
      // Sensitivity: 0.01 world-units per pixel
      const S = 0.01

      if (mt.type === 'move') {
        const p = [...mt.startPos] as [number,number,number]
        if (mt.axis === 'x')      p[0] = mt.startPos[0] + dx * S
        else if (mt.axis === 'y') p[1] = mt.startPos[1] - dy * S
        else if (mt.axis === 'z') p[2] = mt.startPos[2] + dx * S
        else { p[0] = mt.startPos[0] + dx * S; p[2] = mt.startPos[2] + dy * S } // free XZ
        updateObject(mt.objId, { position: p })
        const val = mt.axis === 'y' ? (-dy * S) : (dx * S)
        setModalDisplay({ type: 'MOVE', axis: mt.axis, value: parseFloat(val.toFixed(3)) })
      } else if (mt.type === 'scale') {
        const dist = Math.sqrt(dx*dx + dy*dy) * (dx + dy > 0 ? 1 : -1)
        const factor = 1 + dist * 0.005
        const sc = [...mt.startScale] as [number,number,number]
        if (mt.axis === 'x')      sc[0] = Math.max(0.01, mt.startScale[0] * factor)
        else if (mt.axis === 'y') sc[1] = Math.max(0.01, mt.startScale[1] * factor)
        else if (mt.axis === 'z') sc[2] = Math.max(0.01, mt.startScale[2] * factor)
        else {
          sc[0] = Math.max(0.01, mt.startScale[0] * factor)
          sc[1] = Math.max(0.01, mt.startScale[1] * factor)
          sc[2] = Math.max(0.01, mt.startScale[2] * factor)
        }
        updateObject(mt.objId, { scale: sc })
        setModalDisplay({ type: 'SCALE', axis: mt.axis, value: parseFloat(factor.toFixed(3)) })
      } else if (mt.type === 'rotate') {
        const angleDeg = dx * 0.5
        const angleRad = angleDeg * (Math.PI / 180)
        const r = [...mt.startRot] as [number,number,number]
        if (mt.axis === 'x')      r[0] = mt.startRot[0] + angleRad
        else if (mt.axis === 'y') r[1] = mt.startRot[1] + angleRad
        else if (mt.axis === 'z') r[2] = mt.startRot[2] + angleRad
        else                      r[1] = mt.startRot[1] + angleRad // default Y
        updateObject(mt.objId, { rotation: r })
        setModalDisplay({ type: 'ROTATE', axis: mt.axis, value: parseFloat(angleDeg.toFixed(1)) })
      }
      return
    }

    // --- EXTRUDE MODE: update scale preview ---
    if (extrudeMode) {
      if (extrudeStartYRef.current === null) extrudeStartYRef.current = e.clientY
      const deltaPixels = extrudeStartYRef.current - e.clientY
      const delta = deltaPixels * 0.01
      const base = extrudeBaseScaleRef.current
      const id = extrudeObjectIdRef.current
      setExtrudeValue(parseFloat(delta.toFixed(3)))
      if (id) updateObject(id, { scale: [base[0], Math.max(0.01, base[1] + delta), base[2]] })
      return
    }

    if (stateRef.current.mode !== 'shape' || drawingPoints.length === 0) return
    if (!rendererRef.current || !cameraRef.current) return

    const rect = rendererRef.current.domElement.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    mouseVecRef.current.set(x, y)

    raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current)
    const intersects = raycasterRef.current.ray.intersectPlane(mousePlaneRef.current, new THREE.Vector3())
    
    if (intersects) {
      const activePoints = [...drawingPoints, new THREE.Vector3(intersects.x, 0, intersects.z)]
      updateDrawingHelpers(activePoints, true)
    }
  }

  // Update line renderer and circular points in draw mode
  const updateDrawingHelpers = (points: THREE.Vector3[], hasCursorPreview = false) => {
    const drawGroup = drawingHelpersRef.current
    if (!drawGroup) return

    // Clear old visual elements
    while(drawGroup.children.length > 0) {
      const child = drawGroup.children[0]
      drawGroup.remove(child)
      if (child instanceof THREE.Line) child.geometry.dispose()
      if (child instanceof THREE.Mesh) child.geometry.dispose()
    }

    if (points.length === 0) return

    // Render Lines
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4772B3, // active accent blue
      linewidth: 2,
      depthTest: false
    })
    const line = new THREE.Line(lineGeo, lineMat)
    drawGroup.add(line)

    // Render Circle points at vertices
    const vertexMat = new THREE.MeshBasicMaterial({ color: 0xE67E22, depthTest: false })
    points.forEach((pt, index) => {
      // Highlight the first point in green to indicate close shape trigger
      const mat = index === 0 ? new THREE.MeshBasicMaterial({ color: 0x2ecc71, depthTest: false }) : vertexMat
      
      // Skip cursor preview index
      if (hasCursorPreview && index === points.length - 1) return

      const dotGeo = new THREE.SphereGeometry(0.08, 8, 8)
      const dot = new THREE.Mesh(dotGeo, mat)
      dot.position.copy(pt)
      drawGroup.add(dot)
    })
  }

  const completeDrawing = () => {
    if (drawingPoints.length < 3) {
      // Not enough points to make polygon shape
      cancelDrawing()
      return
    }

    // Map XZ coordinates to 2D Shape vertices.
    // In THREE.Shape we draw 2D coords. Let's map X -> X and Z -> Y.
    const shapeVertices: [number, number][] = drawingPoints.map(pt => [pt.x, pt.z])

    addObject({
      name: 'Extrusion',
      type: 'mesh',
      visible: true,
      locked: false,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      geometryType: 'extrude',
      shapeVertices,
      extrudeDepth: 1.0,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    })

    // Reset draw states
    cancelDrawing()
  }

  const cancelDrawing = () => {
    setDrawingPoints([])
    updateDrawingHelpers([])
    setMode('object')
  }

  // --- EDIT MODE SELECTION HANDLER ---
  const handleEditModeSelection = (e: React.MouseEvent, mx: number, my: number, rect: DOMRect) => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!scene || !camera) return
    const selId = selectedIds[0]
    if (!selId) return
    const mesh = sceneObjectsMapRef.current.get(selId)
    if (!mesh || !(mesh instanceof THREE.Mesh)) return
    mesh.updateMatrixWorld(true)

    const clearHighlights = () => {
      if (faceHighlightRef.current) { scene.remove(faceHighlightRef.current); faceHighlightRef.current = null }
      if (vertHighlightRef.current) { scene.remove(vertHighlightRef.current); vertHighlightRef.current = null }
      editSelRef.current = null
      setEditSelCount(0)
    }

    if (editSubMode === 'face' || editSubMode === 'edge') {
      const hits = raycasterRef.current.intersectObject(mesh, false)
      if (!hits.length) { clearHighlights(); return }
      const hit = hits[0]
      const face = hit.face!
      const faceIndex = hit.faceIndex!
      const posAttr = mesh.geometry.getAttribute('position')
      const indBuf = mesh.geometry.getIndex()
      const getWV = (i: number) =>
        new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(mesh.matrixWorld)

      const va = getWV(face.a), vb = getWV(face.b), vc = getWV(face.c)

      // World-space face normal for extrude
      const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
      const worldNormal = face.normal.clone().applyMatrix3(nm).normalize()
      editSelRef.current = { type: editSubMode, index: faceIndex, faceNormal: worldNormal }

      if (faceHighlightRef.current) scene.remove(faceHighlightRef.current)

      if (editSubMode === 'face') {
        // Try to get the 4th vertex of the quad (sibling triangle)
        let triVerts = [va, vb, vc]
        if (indBuf) {
          const sib = faceIndex % 2 === 0 ? faceIndex + 1 : faceIndex - 1
          const sa = indBuf.getX(sib*3), sb = indBuf.getX(sib*3+1), sc = indBuf.getX(sib*3+2)
          const fourth = [sa, sb, sc].find(v => v !== face.a && v !== face.b && v !== face.c)
          if (fourth !== undefined) {
            const v3 = getWV(fourth)
            triVerts = [va, vb, vc, vc, v3, va] // 2 triangles covering the quad
          }
        }
        const posArr = new Float32Array(triVerts.flatMap(v => [v.x, v.y, v.z]))
        const hGeo = new THREE.BufferGeometry()
        hGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
        const hMesh = new THREE.Mesh(hGeo, new THREE.MeshBasicMaterial({
          color: 0xE67E22, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthTest: false
        }))
        hMesh.renderOrder = 2
        hMesh.name = 'face-highlight'
        scene.add(hMesh)
        faceHighlightRef.current = hMesh
      } else {
        // Edge mode: highlight the 3 edges of the triangle
        const eArr = new Float32Array([
          va.x, va.y, va.z, vb.x, vb.y, vb.z,
          vb.x, vb.y, vb.z, vc.x, vc.y, vc.z,
          vc.x, vc.y, vc.z, va.x, va.y, va.z,
        ])
        const eGeo = new THREE.BufferGeometry()
        eGeo.setAttribute('position', new THREE.BufferAttribute(eArr, 3))
        const eLines = new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({ color: 0xE67E22, depthTest: false }))
        eLines.renderOrder = 2
        eLines.name = 'edge-highlight'
        scene.add(eLines)
        faceHighlightRef.current = eLines
      }
      setEditSelCount(c => c + 1)

    } else if (editSubMode === 'vertex') {
      const posAttr = mesh.geometry.getAttribute('position')
      let nearestDist = Infinity, nearestIdx = -1
      const THRESHOLD_PX = 22
      for (let i = 0; i < posAttr.count; i++) {
        const wp = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(mesh.matrixWorld)
        const ndc = wp.clone().project(camera)
        const sx = (ndc.x + 1) / 2 * rect.width
        const sy = (1 - ndc.y) / 2 * rect.height
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2)
        if (dist < THRESHOLD_PX && dist < nearestDist) { nearestDist = dist; nearestIdx = i }
      }
      if (nearestIdx < 0) { clearHighlights(); return }
      editSelRef.current = { type: 'vertex', index: nearestIdx }
      const wp = new THREE.Vector3(posAttr.getX(nearestIdx), posAttr.getY(nearestIdx), posAttr.getZ(nearestIdx)).applyMatrix4(mesh.matrixWorld)
      if (vertHighlightRef.current) scene.remove(vertHighlightRef.current)
      const vGeo = new THREE.BufferGeometry()
      vGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([wp.x, wp.y, wp.z]), 3))
      const vPts = new THREE.Points(vGeo, new THREE.PointsMaterial({ color: 0xE67E22, size: 14, sizeAttenuation: false, depthTest: false }))
      vPts.name = 'vert-highlight'
      scene.add(vPts)
      vertHighlightRef.current = vPts
      setEditSelCount(c => c + 1)
    }
  }

  // Helper: start a modal transform
  const startModalTransform = (type: 'move'|'scale'|'rotate', e?: KeyboardEvent) => {
    const { selectedIds: selIds, objects: objs } = stateRef.current
    if (selIds.length === 0) return
    const selObj = objs.find(o => o.id === selIds[0])
    if (!selObj) return
    modalRef.current = {
      type, axis: null,
      startX: window.innerWidth / 2, startY: window.innerHeight / 2, // updated on first mousemove
      startPos: [...selObj.position] as [number,number,number],
      startScale: [...selObj.scale] as [number,number,number],
      startRot: [...selObj.rotation] as [number,number,number],
      objId: selObj.id,
    }
    setModalDisplay({ type: type.toUpperCase(), axis: null, value: 0 })
    // Disable orbit controls during transform
    if (controlsRef.current) controlsRef.current.enabled = false
    e?.preventDefault()
  }

  const confirmModalTransform = () => {
    modalRef.current = null
    setModalDisplay(null)
    if (controlsRef.current) controlsRef.current.enabled = true
  }

  const cancelModalTransform = () => {
    const mt = modalRef.current
    if (!mt) return
    // Restore original state
    updateObject(mt.objId, { position: mt.startPos, scale: mt.startScale, rotation: mt.startRot })
    modalRef.current = null
    setModalDisplay(null)
    if (controlsRef.current) controlsRef.current.enabled = true
  }

  // Handle keydown: shape drawing + E extrude + Tab mode toggle + 1/2/3 sub-mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      // Tab: toggle Object ↔ Edit mode
      if (e.key === 'Tab') {
        e.preventDefault()
        const { mode: curMode, selectedIds: selIds, objects: objs } = stateRef.current
        if (curMode === 'edit') {
          setMode('object')
        } else if (curMode === 'object' && selIds.length > 0) {
          const selObj = objs.find(o => o.id === selIds[0] && o.type === 'mesh')
          if (selObj) setMode('edit')
        }
        return
      }

      // --- AXIS CONSTRAINT: X/Y/Z while in modal transform ---
      if (modalRef.current && (e.key === 'x' || e.key === 'X')) {
        modalRef.current.axis = 'x'
        setModalDisplay(d => d ? { ...d, axis: 'x' } : d)
        return
      }
      if (modalRef.current && (e.key === 'y' || e.key === 'Y')) {
        modalRef.current.axis = 'y'
        setModalDisplay(d => d ? { ...d, axis: 'y' } : d)
        return
      }
      if (modalRef.current && (e.key === 'z' || e.key === 'Z')) {
        modalRef.current.axis = 'z'
        setModalDisplay(d => d ? { ...d, axis: 'z' } : d)
        return
      }

      // --- MODAL TRANSFORMS: G / S / R ---
      if (!extrudeMode && !modalRef.current) {
        if (e.key === 'g' || e.key === 'G') { startModalTransform('move', e); return }
        if (e.key === 's' || e.key === 'S') { startModalTransform('scale', e); return }
        if (e.key === 'r' || e.key === 'R') { startModalTransform('rotate', e); return }
      }

      // Confirm / cancel modal transform
      if (e.key === 'Enter' && modalRef.current) { confirmModalTransform(); return }
      if (e.key === 'Escape' && modalRef.current) { cancelModalTransform(); return }

      // 1/2/3: sub-mode while in Edit Mode
      if (stateRef.current.mode === 'edit') {
        if (e.key === '1') setEditSubMode('vertex')
        if (e.key === '2') setEditSubMode('edge')
        if (e.key === '3') setEditSubMode('face')
      }

      if (mode === 'shape' && e.key === 'Enter') completeDrawing()
      if (mode === 'shape' && e.key === 'Escape') cancelDrawing()

      // E KEY: extrude
      if (e.key === 'e' || e.key === 'E') {
        if (extrudeMode) return
        const { selectedIds: selIds, objects: objs } = stateRef.current
        if (selIds.length === 0) return
        const selObj = objs.find(o => o.id === selIds[0] && o.type === 'mesh')
        if (!selObj) return
        extrudeObjectIdRef.current = selObj.id
        extrudeBaseScaleRef.current = [...selObj.scale] as [number, number, number]
        extrudeStartYRef.current = null
        setExtrudeValue(0)
        setExtrudeMode(true)
        e.preventDefault()
      }

      if (e.key === 'Enter' && extrudeMode) confirmExtrude()
      if (e.key === 'Escape' && extrudeMode) cancelExtrude()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [drawingPoints, mode, extrudeMode, editSubMode])

  const confirmExtrude = () => {
    const id = extrudeObjectIdRef.current
    const base = extrudeBaseScaleRef.current
    if (id) {
      const delta = extrudeValue
      // Apply final scale on Y axis
      updateObject(id, {
        scale: [base[0], Math.max(0.01, base[1] + delta), base[2]]
      })
    }
    setExtrudeMode(false)
    extrudeObjectIdRef.current = null
    extrudeStartYRef.current = null
  }

  const cancelExtrude = () => {
    const id = extrudeObjectIdRef.current
    const base = extrudeBaseScaleRef.current
    // Restore original scale
    if (id) {
      updateObject(id, { scale: base })
    }
    setExtrudeMode(false)
    extrudeObjectIdRef.current = null
    extrudeStartYRef.current = null
    setExtrudeValue(0)
  }

  // --- SCENE EXPORT HANDLER ---
  useEffect(() => {
    const handleExport = () => {
      const scene = sceneRef.current
      if (!scene) return

      // Clean up transform controls helper handles before exporting
      const transformControls = transformControlsRef.current
      const attached = transformControls?.object
      if (attached) {
        transformControls.detach()
      }

      // Temporarily hide helpers
      const grid = scene.getObjectByName('floor-grid')
      const axes = scene.getObjectByName('axes-helper')
      const drawHelpers = scene.getObjectByName('draw-helpers')
      
      if (grid) grid.visible = false
      if (axes) axes.visible = false
      if (drawHelpers) drawHelpers.visible = false

      // Export
      const exporter = new GLTFExporter()
      exporter.parse(
        scene,
        (gltf) => {
          const output = JSON.stringify(gltf, null, 2)
          const blob = new Blob([output], { type: 'application/json' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = 'scene.glb'
          link.click()

          // Restore helpers visibility
          if (grid) grid.visible = viewportSettings.showGrid
          if (axes) axes.visible = viewportSettings.showOverlays
          if (drawHelpers) drawHelpers.visible = true
          if (attached) transformControls.attach(attached)
        },
        (error) => {
          console.error('Error parsing GLTF exporter:', error)
        },
        { binary: false } // Export as GLTF JSON format for text download
      )
    }

    window.addEventListener('export-scene', handleExport)
    return () => window.removeEventListener('export-scene', handleExport)
  }, [viewportSettings])

  // --- SCENE IMPORT HANDLER ---
  useEffect(() => {
    const handleImport = (e: Event) => {
      const file = (e as CustomEvent).detail.file as File
      if (!file) return

      const scene = sceneRef.current
      if (!scene) return

      const reader = new FileReader()
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'glb' || ext === 'gltf') {
        reader.onload = async (event) => {
          const contents = event.target?.result
          if (!contents) return
          
          const loader = new GLTFLoader()
          loader.parse(contents as ArrayBuffer, '', (gltf) => {
            // Traverse import group and insert into Zustand store
            gltf.scene.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                // Read coordinates
                const pos: [number, number, number] = [child.position.x, child.position.y, child.position.z]
                const rot: [number, number, number] = [child.rotation.x, child.rotation.y, child.rotation.z]
                const scl: [number, number, number] = [child.scale.x, child.scale.y, child.scale.z]
                
                // Read material color
                const color = child.material instanceof THREE.MeshStandardMaterial 
                  ? '#' + child.material.color.getHexString() 
                  : '#808080'
                
                addObject({
                  name: child.name || 'Imported Mesh',
                  type: 'mesh',
                  visible: true,
                  locked: false,
                  position: pos,
                  rotation: rot,
                  scale: scl,
                  geometryType: 'cube', // fallback, actual custom meshes will retain default cube loader params but load geometry buffer directly if needed. 
                  materialConfig: {
                    color,
                    metalness: 0,
                    roughness: 0.5,
                    opacity: 1,
                    transparent: false,
                    wireframe: false,
                    emissive: '#000000',
                    emissiveIntensity: 1
                  }
                })
              }
            })
          }, (err) => {
            console.error('Error parsing GLTF file:', err)
          })
        }
        reader.readAsArrayBuffer(file)
      } else if (ext === 'obj') {
        reader.onload = (event) => {
          const contents = event.target?.result as string
          if (!contents) return

          const loader = new OBJLoader()
          const obj = loader.parse(contents)
          
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              addObject({
                name: child.name || 'Imported Mesh',
                type: 'mesh',
                visible: true,
                locked: false,
                position: [child.position.x, child.position.y, child.position.z],
                rotation: [child.rotation.x, child.rotation.y, child.rotation.z],
                scale: [child.scale.x, child.scale.y, child.scale.z],
                geometryType: 'cube'
              })
            }
          })
        }
        reader.readAsText(file)
      }
    }

    window.addEventListener('import-file', handleImport)
    return () => window.removeEventListener('import-file', handleImport)
  }, [addObject])

  return (
    <div className="flex-grow h-full flex flex-col relative overflow-hidden bg-bg-deep select-none">
      {/* Viewport Header Bar */}
      <div className="h-7 bg-bg-header border-b border-border flex items-center justify-between px-3 shrink-0 select-none text-[11px]">
        {/* Left: Mode Dropdown + Sub-mode + Shading */}
        <div className="flex items-center space-x-2">

          {/* Mode Dropdown (Object / Edit) */}
          <div className="relative group">
            <button
              onClick={() => {
                if (mode === 'edit') {
                  setMode('object')
                } else if (selectedIds.length > 0 && objects.find(o => o.id === selectedIds[0])?.type === 'mesh') {
                  setMode('edit')
                }
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-all font-medium ${
                mode === 'edit'
                  ? 'text-accent-orange border border-accent-orange/60 bg-accent-orange/10'
                  : 'text-text-primary hover:text-white hover:bg-border/30 border border-transparent'
              }`}
            >
              <span>{mode === 'edit' ? 'Edit Mode' : 'Object Mode'}</span>
              <span className="text-text-dim text-[9px]">▼</span>
            </button>
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-0.5 hidden group-hover:flex flex-col bg-bg-panel border border-border rounded shadow-xl z-50 min-w-[120px] overflow-hidden">
              <button onClick={() => setMode('object')} className={`px-3 py-1.5 text-left hover:bg-border/30 cursor-pointer ${mode === 'object' ? 'text-white' : 'text-text-dim'}`}>
                Object Mode
              </button>
              <button onClick={() => {
                const selObj = objects.find(o => o.id === selectedIds[0] && o.type === 'mesh')
                if (selObj) setMode('edit')
              }} className={`px-3 py-1.5 text-left hover:bg-border/30 cursor-pointer ${mode === 'edit' ? 'text-accent-orange' : 'text-text-dim'}`}>
                Edit Mode
              </button>
            </div>
          </div>

          <span className="text-border/60">|</span>

          {/* Edit Sub-mode Buttons */}
          {mode === 'edit' && (
            <div className="flex items-center bg-bg-deep/80 p-0.5 rounded border border-accent-orange/40">
              {([
                { id: 'vertex' as const, label: '●', title: 'Vertex [1]' },
                { id: 'edge'   as const, label: '─', title: 'Edge [2]'   },
                { id: 'face'   as const, label: '■', title: 'Face [3]'   },
              ]).map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setEditSubMode(sub.id)}
                  title={sub.title}
                  className={`px-2.5 py-0.5 rounded text-[11px] cursor-pointer transition-all ${
                    editSubMode === sub.id
                      ? 'bg-accent-orange text-white font-bold'
                      : 'text-text-dim hover:text-accent-orange'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Object Mode: shading buttons */}
          {mode !== 'edit' && (
            <>
              <span className="text-border/60">|</span>
              <div className="flex items-center bg-bg-deep/80 p-0.5 rounded border border-border/80">
                {(['solid', 'wireframe', 'material'] as const).map((modeName) => {
                  const isActive = viewportSettings.shadingMode === modeName
                  return (
                    <button
                      key={modeName}
                      onClick={() => updateViewportSettings({ shadingMode: modeName })}
                      className={`px-3 py-0.5 rounded-full capitalize text-[10px] cursor-pointer transition-all ${
                        isActive ? 'bg-[#3A3A3A] text-white font-medium' : 'text-text-dim hover:text-text-primary'
                      }`}
                    >
                      {modeName === 'wireframe' ? 'Wire' : modeName === 'material' ? 'Material' : 'Solid'}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Edit mode: selection hint */}
          {mode === 'edit' && editSelCount > 0 && (
            <span className="text-accent-orange/80 text-[10px] font-mono ml-1">
              {editSelRef.current?.type} selected · E to extrude
            </span>
          )}
        </div>


        {/* Right side: Overlays & Gizmo toggles */}
        <div className="flex items-center space-x-3">
          {/* Overlays toggle */}
          <button
            onClick={() => updateViewportSettings({ showOverlays: !viewportSettings.showOverlays })}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded cursor-pointer transition-all ${
              viewportSettings.showOverlays 
                ? 'text-white bg-[#3A3A3A]/60' 
                : 'text-text-dim hover:text-text-primary'
            }`}
          >
            <Eye size={12} className={viewportSettings.showOverlays ? 'text-accent-orange' : 'text-text-dim'} />
            <span>Overlays</span>
          </button>

          {/* Gizmo toggle */}
          <button
            onClick={() => updateViewportSettings({ showGizmo: !viewportSettings.showGizmo })}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded cursor-pointer transition-all ${
              viewportSettings.showGizmo 
                ? 'text-white bg-[#3A3A3A]/60' 
                : 'text-text-dim hover:text-text-primary'
            }`}
          >
            <Compass size={12} className={viewportSettings.showGizmo ? 'text-accent-orange' : 'text-text-dim'} />
            <span>Gizmo</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Area */}
      <div 
        ref={containerRef}
        onMouseDown={(e) => {
          // Confirm modal transform on left click
          if (modalRef.current && e.button === 0) {
            confirmModalTransform()
            return
          }
          // Confirm extrude on left click while in extrude mode
          if (extrudeMode && e.button === 0) {
            confirmExtrude()
            return
          }
          handleViewportMouseDown(e)
        }}
        onMouseUp={handleViewportMouseUp}
        onMouseMove={handleViewportMouseMove}
        className={`flex-grow w-full relative overflow-hidden outline-none ${
          extrudeMode || modalDisplay ? 'cursor-crosshair' : 'cursor-crosshair'
        }`}
        style={{ backgroundColor: sceneSettings.backgroundColor }}
      >
        {/* Top-left Overlay text */}
        <div className="absolute top-3 left-3 pointer-events-none text-text-dim text-[11px] font-mono select-none">
          User Perspective
        </div>

        {/* Bottom-left Overlay text */}
        <div className="absolute bottom-3 left-3 pointer-events-none text-text-dim/80 text-[10px] font-mono select-none">
          Perspective &middot; Scene
        </div>

        {/* Bottom-right Coordinate Gizmo */}
        {viewportSettings.showGizmo && (
          <div className="absolute bottom-3 right-3 pointer-events-none select-none z-20">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="28" y1="28" x2="14" y2="40" stroke="#4772B3" strokeWidth="2" />
              <line x1="28" y1="28" x2="44" y2="33" stroke="#e74c3c" strokeWidth="2" />
              <line x1="28" y1="28" x2="33" y2="10" stroke="#2ecc71" strokeWidth="2" />
              <circle cx="33" cy="10" r="5" fill="#2ecc71" />
              <text x="33" y="12" fontSize="6.5" fill="white" fontWeight="bold" textAnchor="middle">Y</text>
              <circle cx="44" cy="33" r="5" fill="#e74c3c" />
              <text x="44" y="35" fontSize="6.5" fill="white" fontWeight="bold" textAnchor="middle">X</text>
              <circle cx="14" cy="40" r="5" fill="#4772B3" />
              <text x="14" y="42" fontSize="6.5" fill="white" fontWeight="bold" textAnchor="middle">Z</text>
            </svg>
          </div>
        )}

        {/* Info indicator for draw mode vertices count */}
        {mode === 'shape' && drawingPoints.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-bg-panel/90 border border-accent-blue/80 text-accent-blue px-3 py-1 rounded shadow-md z-30 pointer-events-none text-[10px] font-mono font-semibold">
            Vertices: {drawingPoints.length} | Enter to complete | Escape to cancel
          </div>
        )}

        {/* Modal Transform HUD (G/S/R + X/Y/Z) */}
        {modalDisplay && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-bg-panel/95 border border-border px-4 py-1.5 rounded shadow-lg z-30 pointer-events-none text-[11px] font-mono flex items-center gap-3">
            <span className="font-bold text-white">{modalDisplay.type}</span>
            {modalDisplay.axis && (
              <span className={`font-bold text-[14px] ${
                modalDisplay.axis === 'x' ? 'text-red-400' :
                modalDisplay.axis === 'y' ? 'text-green-400' : 'text-blue-400'
              }`}>{modalDisplay.axis.toUpperCase()}</span>
            )}
            <span className="text-white font-bold">
              {modalDisplay.value >= 0 ? '+' : ''}{modalDisplay.value.toFixed(3)}
              {modalDisplay.type === 'ROTATE' ? '°' : ''}
            </span>
            <span className="text-text-dim">Move mouse · Click or Enter to confirm · Esc to cancel</span>
          </div>
        )}

        {/* Extrude mode HUD */}
        {extrudeMode && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-bg-panel/95 border border-accent-orange/80 text-accent-orange px-4 py-1.5 rounded shadow-lg z-30 pointer-events-none text-[11px] font-mono flex items-center gap-3">
            <span className="font-bold">EXTRUDE</span>
            <span className="text-text-primary">Y: <span className="text-white font-bold">{extrudeValue >= 0 ? '+' : ''}{extrudeValue.toFixed(3)}</span></span>
            <span className="text-text-dim">Move mouse ↑↓ · Click or Enter to confirm · Esc to cancel</span>
          </div>
        )}

        {/* Floating Blender-style Add Menu */}
        {addMenuPos && (() => {
          const menuWidth = 135
          const menuHeight = 240
          const adjustedX = Math.min(addMenuPos.x, window.innerWidth - menuWidth - 20)
          const adjustedY = Math.min(addMenuPos.y, window.innerHeight - menuHeight - 20)

          const addMesh = (geomType: string, name: string) => {
            addObject({
              name,
              type: 'mesh',
              visible: true,
              locked: false,
              position: [0, geomType === 'plane' || geomType === 'circle' ? 0 : 0.5, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              geometryType: geomType as any
            })
            setAddMenuPos(null)
          }

          const addLight = (lightType: 'point' | 'sun' | 'spot', name: string) => {
            addObject({
              name,
              type: 'light',
              visible: true,
              locked: false,
              position: [0, 3, 0],
              rotation: lightType === 'sun' ? [-Math.PI / 4, Math.PI / 4, 0] : [0, 0, 0],
              scale: [1, 1, 1],
              lightConfig: {
                type: lightType,
                color: '#ffffff',
                intensity: lightType === 'sun' ? 1.0 : 5.0,
                castShadow: true
              }
            })
            setAddMenuPos(null)
          }

          return (
            <div 
              style={{ left: adjustedX, top: adjustedY }}
              className="absolute bg-bg-panel border border-border/80 shadow-2xl rounded text-[10.5px] font-sans py-1 min-w-[130px] z-50 text-text-primary select-none cursor-default flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-0.5 text-[8.5px] text-text-dim/80 font-bold uppercase tracking-wider select-none border-b border-border/20 mb-1">Add Object</div>
              
              {/* Mesh Option with Submenu on hover */}
              <div className="relative group/mesh">
                <div className="px-3 py-1 hover:bg-accent-orange hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Mesh</span>
                  <span className="text-[8px] text-text-dim group-hover/mesh:text-white">▶</span>
                </div>
                <div className="absolute left-full top-0 ml-0.5 bg-bg-panel border border-border/80 shadow-2xl rounded py-1 min-w-[110px] hidden group-hover/mesh:flex flex-col z-50">
                  <button onClick={() => addMesh('plane', 'Plane')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Plane</button>
                  <button onClick={() => addMesh('cube', 'Cube')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Cube</button>
                  <button onClick={() => addMesh('circle', 'Circle')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Circle</button>
                  <button onClick={() => addMesh('sphere', 'Sphere')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">UV Sphere</button>
                  <button onClick={() => addMesh('cylinder', 'Cylinder')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Cylinder</button>
                  <button onClick={() => addMesh('cone', 'Cone')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Cone</button>
                  <button onClick={() => addMesh('torus', 'Torus')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Torus</button>
                  <button onClick={() => addMesh('icosphere', 'Icosphere')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Icosphere</button>
                </div>
              </div>

              {/* Light Option with Submenu on hover */}
              <div className="relative group/light border-b border-border/20 pb-1">
                <div className="px-3 py-1 hover:bg-accent-orange hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Light</span>
                  <span className="text-[8px] text-text-dim group-hover/light:text-white">▶</span>
                </div>
                <div className="absolute left-full top-0 ml-0.5 bg-bg-panel border border-border/80 shadow-2xl rounded py-1 min-w-[100px] hidden group-hover/light:flex flex-col z-50">
                  <button onClick={() => addLight('point', 'Point Light')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Point Light</button>
                  <button onClick={() => addLight('sun', 'Sun Light')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Sun Light</button>
                  <button onClick={() => addLight('spot', 'Spot Light')} className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white w-full">Spot Light</button>
                </div>
              </div>

              {/* Dismiss Option */}
              <button 
                onClick={() => setAddMenuPos(null)}
                className="px-3 py-1 text-left text-text-dim hover:text-white hover:bg-border/30 cursor-pointer mt-1 w-full"
              >
                Dismiss
              </button>
            </div>
          )
        })()}

        {/* Global window click dismissal for Add Menu */}
        {addMenuPos && (
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onMouseDown={() => setAddMenuPos(null)}
          />
        )}
      </div>
    </div>
  )
}
