"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text, Cylinder, Sparkles, Billboard } from "@react-three/drei";
import { useGame, ALL_COLORS, ColorData } from "@/context/GameContext";
import { audio } from "@/utils/audio";
import { useXR, XROrigin } from "@react-three/xr";
import ChromaBot3D from "./ChromaBot3D";
import ColorMixer3D from "./ColorMixer3D";
import * as THREE from "three";

// Color mixing recipes
const MIX_RECIPES: Record<string, string> = {
  "red+yellow": "orange",
  "yellow+red": "orange",
  "blue+yellow": "green",
  "yellow+blue": "green",
  "blue+red": "purple",
  "red+blue": "purple",

  // Tertiary recipes
  "red+orange": "red-orange",
  "orange+red": "red-orange",
  "yellow+orange": "yellow-orange",
  "orange+yellow": "yellow-orange",
  "yellow+green": "yellow-green",
  "green+yellow": "yellow-green",
  "blue+green": "blue-green",
  "green+blue": "blue-green",
  "blue+purple": "blue-purple",
  "purple+blue": "blue-purple",
  "red+purple": "red-purple",
  "purple+red": "red-purple",
};

interface SphereState {
  id: string;
  colorId: string;
  hex: string;
  symbol: string;
  position: [number, number, number];
  spawnPosition: [number, number, number];
  status: "table" | "slot1" | "slot2" | "placed";
  isPrimary: boolean;
}

export default function VRScene() {
  const {
    level,
    setLevel,
    gameMode,
    setGameMode,
    gameState,
    setGameState,
    isVRActive,
    placedColors,
    placeColor,
    removeColor,
    targetColors,
    isLevelComplete,
    nextLevel,
    resetGame,
    isColorBlindMode,
    setIsColorBlindMode,
    setIsVRActive,
    soundOn,
    setSoundOn,
    score,
    showVideoModal,
    setShowVideoModal,
    showColorChart,
    setShowColorChart
  } = useGame();

  const { gl } = useThree();

  const session = useXR((state) => state.session);
  const isPresenting = !!session;
  const originReferenceSpace = useXR((state) => state.originReferenceSpace);

  useEffect(() => {
    setIsVRActive(isPresenting);
  }, [isPresenting, setIsVRActive]);

  // ── Core sphere & mixer state (declared early so useFrame/useEffects can reference them) ─
  const [spheres, setSpheres] = useState<SphereState[]>([]);
  const spheresRef = useRef<SphereState[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null); // always-current ref for VR/useFrame closures
  useEffect(() => { draggedIdRef.current = draggedId; }, [draggedId]);

  const [mixerSlot1, setMixerSlot1] = useState<SphereState | null>(null);
  const [mixerSlot2, setMixerSlot2] = useState<SphereState | null>(null);
  const mixerSlot1Ref = useRef<SphereState | null>(null);
  const mixerSlot2Ref = useRef<SphereState | null>(null);
  const [isMixing, setIsMixing] = useState(false);
  const isMixingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { spheresRef.current = spheres; }, [spheres]);
  useEffect(() => { mixerSlot1Ref.current = mixerSlot1; }, [mixerSlot1]);
  useEffect(() => { mixerSlot2Ref.current = mixerSlot2; }, [mixerSlot2]);
  useEffect(() => { isMixingRef.current = isMixing; }, [isMixing]);

  // ── VR Locomotion ref ──────────────────────────────────────────────────────
  const xrOriginRef = useRef<THREE.Group>(null);
  const snapTurnCooldown = useRef(false);
  const MOVE_SPEED = 1.8;
  const SNAP_ANGLE = Math.PI / 4;

  // ── VR Grab: fully ref-based, zero setState per frame ─────────────────────
  // Map of sphere id → live THREE.Vector3 position (mutated directly in useFrame)
  const vrSpherePos = useRef<Map<string, THREE.Vector3>>(new Map());
  // Map of sphere id → Three.js Group ref (set by InteractiveSphere)
  const vrSphereObjects = useRef<Map<string, THREE.Group>>(new Map());

  // Controller state refs
  const vrGrabbedId   = useRef<string | null>(null);
  const vrGrabbedHand = useRef<"left" | "right" | null>(null);
  const vrTriggerPrev = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const vrGripPrev    = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const buttonAPrev   = useRef(false);
  const buttonBPrev   = useRef(false);

  // Keep vrSpherePos in sync with sphere state (only on state changes, not per frame)
  useEffect(() => {
    spheres.forEach((s) => {
      // Only update if NOT currently grabbed (don't overwrite live position)
      if (vrGrabbedId.current !== s.id) {
        let vec = vrSpherePos.current.get(s.id);
        if (!vec) {
          vec = new THREE.Vector3(...s.position);
          vrSpherePos.current.set(s.id, vec);
        } else {
          vec.set(...s.position);
        }
      }
    });
    // Clean up removed spheres
    const ids = new Set(spheres.map((s) => s.id));
    vrSpherePos.current.forEach((_, id) => {
      if (!ids.has(id)) vrSpherePos.current.delete(id);
    });
  }, [spheres]);

  // Helper: get world position of a controller's grip/ray space
  const getCtrlWorldPos = (
    inputSource: XRInputSource,
    xrFrame: XRFrame | null,
    refSpace: XRReferenceSpace | XRBoundedReferenceSpace | null
  ): THREE.Vector3 => {
    const pos = new THREE.Vector3();
    if (xrFrame && refSpace) {
      const space = inputSource.gripSpace ?? inputSource.targetRaySpace;
      if (space) {
        const pose = xrFrame.getPose(space, refSpace as XRReferenceSpace);
        if (pose) {
          pos.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
          );
        }
      }
    }
    return pos;
  };

  useFrame((state, delta) => {
    if (!session) return;
    const xrFrame: XRFrame | null = (state.gl.xr as any).getFrame?.() ?? null;
    const refSpace = originReferenceSpace ?? (state.gl.xr as any).getReferenceSpace?.() ?? null;

    let buttonAPressed = false;
    let buttonBPressed = false;

    const inputs = Array.from(session.inputSources);

    inputs.forEach((inputSource: XRInputSource) => {
      const gp = inputSource.gamepad;
      if (!gp) return;

      const hand = inputSource.handedness as "left" | "right";

      // ── Menu buttons ────────────────────────────────────────────────────────
      if (gp.buttons[4]?.pressed) buttonAPressed = true; // A/X → colour chart
      if (gp.buttons[5]?.pressed) buttonBPressed = true; // B/Y → main menu

      // ── Grab / Move / Release (only while playing) ──────────────────────────
      if (gameState !== "playing" || isMixingRef.current) return;

      const triggerPressed = !!(gp.buttons[0]?.pressed);
      const gripPressed    = !!(gp.buttons[1]?.pressed);
      const isPressed  = triggerPressed || gripPressed;
      const prevPressed = vrTriggerPrev.current[hand] || vrGripPrev.current[hand];

      vrTriggerPrev.current[hand] = triggerPressed;
      vrGripPrev.current[hand]    = gripPressed;

      const ctrlPos = getCtrlWorldPos(inputSource, xrFrame, refSpace);
      const ctrlIsValid = ctrlPos.lengthSq() > 0;

      // ── GRAB (leading edge) ─────────────────────────────────────────────────
      if (isPressed && !prevPressed && vrGrabbedId.current === null) {
        let closestId: string | null = null;
        let closestDist = 0.20; // grab radius (metres)

        spheresRef.current.forEach((s) => {
          if (s.status === "placed") return;
          const sVec = vrSpherePos.current.get(s.id);
          if (!sVec) return;
          const dist = ctrlPos.distanceTo(sVec);
          if (dist < closestDist) { closestDist = dist; closestId = s.id; }
        });

        if (closestId) {
          audio.playGrab();
          vrGrabbedId.current   = closestId;
          vrGrabbedHand.current = hand;
          setDraggedId(closestId); // ← only setState on grab

          // Release from mixer if needed (setState OK here, not per-frame)
          if (mixerSlot1Ref.current?.id === closestId) setMixerSlot1(null);
          if (mixerSlot2Ref.current?.id === closestId) setMixerSlot2(null);

          setSpheres((prev) =>
            prev.map((s) => (s.id === closestId ? { ...s, status: "table" } : s))
          );
        }
      }

      // ── MOVE (per frame: mutate object3D directly, NO setState) ─────────────
      if (isPressed && vrGrabbedId.current && vrGrabbedHand.current === hand && ctrlIsValid) {
        const id = vrGrabbedId.current;
        const newX = ctrlPos.x;
        const newY = Math.max(0.74, ctrlPos.y);
        const newZ = THREE.MathUtils.clamp(ctrlPos.z, -1.3, -0.2);

        // Update live position ref
        const posVec = vrSpherePos.current.get(id);
        if (posVec) posVec.set(newX, newY, newZ);

        // Directly move the 3D object — zero React re-renders
        const obj = vrSphereObjects.current.get(id);
        if (obj) obj.position.set(newX, newY, newZ);
      }

      // ── RELEASE (trailing edge) ─────────────────────────────────────────────
      if (!isPressed && prevPressed && vrGrabbedId.current && vrGrabbedHand.current === hand) {
        // Sync final position back into React state before releasing
        const id = vrGrabbedId.current;
        const posVec = vrSpherePos.current.get(id);
        if (posVec) {
          setSpheres((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, position: [posVec.x, posVec.y, posVec.z] as [number, number, number] }
                : s
            )
          );
        }
        vrGrabbedId.current   = null;
        vrGrabbedHand.current = null;
        // handlePointerUp reads draggedId from state; call after position sync
        handlePointerUp();
      }
    });

    // ── Joystick locomotion ────────────────────────────────────────────────────
    if (isPresenting && xrOriginRef.current) {
      const origin = xrOriginRef.current;
      const camera = state.camera;

      inputs.forEach((inputSource: XRInputSource) => {
        const gp = inputSource.gamepad;
        if (!gp) return;
        const hand = inputSource.handedness;

        if (hand === "left") {
          const stickX = gp.axes[2] ?? gp.axes[0] ?? 0;
          const stickY = gp.axes[3] ?? gp.axes[1] ?? 0;
          const deadzone = 0.15;
          if (Math.abs(stickX) > deadzone || Math.abs(stickY) > deadzone) {
            const forward = new THREE.Vector3();
            const right   = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0; forward.normalize();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            const move = new THREE.Vector3();
            move.addScaledVector(forward, -stickY * MOVE_SPEED * delta);
            move.addScaledVector(right,    stickX * MOVE_SPEED * delta);

            origin.position.x = THREE.MathUtils.clamp(origin.position.x + move.x, -8,  8);
            origin.position.z = THREE.MathUtils.clamp(origin.position.z + move.z, -10, 3);
          }
        }

        if (hand === "right") {
          const stickX = gp.axes[2] ?? gp.axes[0] ?? 0;
          const snapDeadzone = 0.6;
          if (!snapTurnCooldown.current) {
            if (stickX > snapDeadzone) {
              origin.rotation.y -= SNAP_ANGLE;
              snapTurnCooldown.current = true;
            } else if (stickX < -snapDeadzone) {
              origin.rotation.y += SNAP_ANGLE;
              snapTurnCooldown.current = true;
            }
          }
          if (Math.abs(stickX) < snapDeadzone * 0.5) snapTurnCooldown.current = false;
        }
      });
    }

    // ── Button A/X → toggle colour chart ────────────────────────────────────
    if (buttonAPressed && !buttonAPrev.current) {
      audio.playClick();
      setShowColorChart((prev) => !prev);
    }
    buttonAPrev.current = buttonAPressed;

    // ── Button B/Y → open main menu ──────────────────────────────────────────
    if (buttonBPressed && !buttonBPrev.current) {
      audio.playClick();
      setGameState("menu");
    }
    buttonBPrev.current = buttonBPressed;

    // ── MOVE: dedicated step, runs once per frame ─────────────────────────────
    // Updates vrSpherePos; InteractiveSphere.useFrame reads it and sets its own position.
    if (vrGrabbedId.current && vrGrabbedHand.current && gameState === "playing") {
      const grabbingSource = inputs.find(
        (src) => src.handedness === vrGrabbedHand.current
      );
      if (grabbingSource?.gamepad) {
        const gp = grabbingSource.gamepad;
        const stillHeld = !!(gp.buttons[0]?.pressed) || !!(gp.buttons[1]?.pressed);
        if (stillHeld) {
          const ctrlPos = getCtrlWorldPos(grabbingSource, xrFrame, refSpace);
          if (ctrlPos.lengthSq() > 0) {
            const id   = vrGrabbedId.current;
            const newX = ctrlPos.x;
            const newY = Math.max(0.74, ctrlPos.y);
            const newZ = THREE.MathUtils.clamp(ctrlPos.z, -1.3, -0.2);
            // Write to vrSpherePos — child InteractiveSphere.useFrame reads this each frame
            const posVec = vrSpherePos.current.get(id);
            if (posVec) posVec.set(newX, newY, newZ);
          }
        }
      }
    }
  });

  // Animated canvas texture for VR Video Tutorial (avoids CORS issues with external video URLs)
  const [videoCanvasTexture, setVideoCanvasTexture] = useState<THREE.CanvasTexture | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoAnimFrameRef = useRef<number>(0);
  const videoPlayingRef = useRef(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Build canvas texture once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 288;
    videoCanvasRef.current = canvas;
    const tex = new THREE.CanvasTexture(canvas);
    setVideoCanvasTexture(tex);
    // Initial paint
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 512, 288);
    return () => { cancelAnimationFrame(videoAnimFrameRef.current); };
  }, []);

  // Animate the canvas when video modal is open
  useEffect(() => {
    if (!videoCanvasRef.current || !videoCanvasTexture) return;
    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    const paint = () => {
      if (!videoPlayingRef.current) return;
      t += 0.012;
      // Swirling paint animation
      ctx.fillStyle = `hsl(${(t * 30) % 360}, 70%, 8%)`;
      ctx.fillRect(0, 0, 512, 288);
      for (let i = 0; i < 6; i++) {
        const hue = (t * 60 + i * 60) % 360;
        const x = 256 + Math.sin(t + i * 1.05) * 160;
        const y = 144 + Math.cos(t * 0.7 + i * 0.9) * 90;
        const r = 60 + Math.sin(t * 0.5 + i) * 30;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.8)`);
        grad.addColorStop(1, `hsla(${hue}, 90%, 30%, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      // Title overlay
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 220, 512, 68);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("HƯỚNG DẪN PHA MÀU SẮC", 256, 252);
      ctx.font = "14px Arial";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Dùng Controller Trigger / Grip để nhặt bóng", 256, 275);
      videoCanvasTexture.needsUpdate = true;
      videoAnimFrameRef.current = requestAnimationFrame(paint);
    };

    if (showVideoModal) {
      videoPlayingRef.current = true;
      setVideoPlaying(true);
      paint();
    } else {
      videoPlayingRef.current = false;
      setVideoPlaying(false);
      cancelAnimationFrame(videoAnimFrameRef.current);
      // Draw pause screen
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 512, 288);
      ctx.fillStyle = "#475569";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("▶  Nhấn để xem hướng dẫn", 256, 144);
      videoCanvasTexture.needsUpdate = true;
    }
    return () => { cancelAnimationFrame(videoAnimFrameRef.current); };
  }, [showVideoModal, videoCanvasTexture]);

  const toggleVideoPlay = () => {
    if (!videoCanvasRef.current || !videoCanvasTexture) return;
    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext("2d")!;
    if (videoPlayingRef.current) {
      videoPlayingRef.current = false;
      setVideoPlaying(false);
      cancelAnimationFrame(videoAnimFrameRef.current);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 512, 288);
      ctx.fillStyle = "#475569";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⏸  Đã tạm dừng", 256, 144);
      videoCanvasTexture.needsUpdate = true;
    } else {
      // restart animation loop
      setShowVideoModal(true); // triggers the useEffect above
    }
  };

  // Dispensers positions
  const DISPENSERS = [
    { colorId: "red", hex: "#EF4444", pos: [-0.16, 0.77, -0.48] },
    { colorId: "yellow", hex: "#FBBF24", pos: [0.0, 0.77, -0.48] },
    { colorId: "blue", hex: "#3B82F6", pos: [0.16, 0.77, -0.48] },
  ];

  // Clear color is set in VRCanvas onCreated — do not set here to avoid overriding XR framebuffer setup

  // Re-initialize spheres when level changes or game restarts
  useEffect(() => {
    if (gameState !== "playing") {
      setSpheres([]);
      setMixerSlot1(null);
      setMixerSlot2(null);
      return;
    }

    // Clear mixer
    setMixerSlot1(null);
    setMixerSlot2(null);

    // Initialize with primary colors sitting in their dispensers
    const initialSpheres: SphereState[] = [];
    DISPENSERS.forEach((disp, index) => {
      const colorInfo = ALL_COLORS.find((c) => c.id === disp.colorId)!;
      initialSpheres.push({
        id: `primary-${disp.colorId}-${Date.now()}-${index}`,
        colorId: disp.colorId,
        hex: disp.hex,
        symbol: colorInfo.symbol,
        position: [...disp.pos] as [number, number, number],
        spawnPosition: [...disp.pos] as [number, number, number],
        status: "table",
        isPrimary: true,
      });
    });

    // In Level 2 & 3, if players are in Easy mode, we also spawn the other colors on the table
    // so they can choose to place them directly or use the mixer.
    if (gameMode === "easy") {
      if (level >= 2) {
        // Spawn secondary colors on the table
        const secondaries = ALL_COLORS.filter((c) => c.level === 2);
        secondaries.forEach((col, index) => {
          initialSpheres.push({
            id: `secondary-${col.id}-${Date.now()}-${index}`,
            colorId: col.id,
            hex: col.hex,
            symbol: col.symbol,
            position: [-0.16 + index * 0.16, 0.77, -0.38] as [number, number, number],
            spawnPosition: [-0.16 + index * 0.16, 0.77, -0.38] as [number, number, number],
            status: "table",
            isPrimary: false,
          });
        });
      }
      if (level === 3) {
        // Spawn tertiary colors on the table
        const tertiaries = ALL_COLORS.filter((c) => c.level === 3);
        tertiaries.forEach((col, index) => {
          initialSpheres.push({
            id: `tertiary-${col.id}-${Date.now()}-${index}`,
            colorId: col.id,
            hex: col.hex,
            symbol: col.symbol,
            position: [-0.25 + index * 0.1, 0.77, -0.32] as [number, number, number],
            spawnPosition: [-0.25 + index * 0.1, 0.77, -0.32] as [number, number, number],
            status: "table",
            isPrimary: false,
          });
        });
      }
    }

    setSpheres(initialSpheres);
  }, [level, gameState, gameMode]);

  // Get basket positions dynamically based on level (hung on the wooden rack at the back of the table)
  const getSlotPosition = (index: number, totalSlots: number) => {
    if (totalSlots === 3) {
      // Level 1: 3 columns, 1 row
      const x = -0.22 + index * 0.22;
      return new THREE.Vector3(x, 0.92, -0.7);
    } else if (totalSlots === 6) {
      // Level 2: 3 columns, 2 rows
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = -0.22 + col * 0.22;
      const y = 1.02 - row * 0.14;
      return new THREE.Vector3(x, y, -0.7);
    } else {
      // Level 3: 4 columns, 3 rows
      const row = Math.floor(index / 4);
      const col = index % 4;
      const x = -0.3 + col * 0.2;
      const y = 1.03 - row * 0.125;
      return new THREE.Vector3(x, y, -0.7);
    }
  };

  // Global event listener to release grabbed spheres on pointerup/touchend
  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent | TouchEvent) => {
      if (draggedId) {
        handlePointerUp(e);
      }
    };
    const dom = gl.domElement;
    dom.addEventListener("pointerup", handleGlobalUp);
    dom.addEventListener("touchend", handleGlobalUp);
    return () => {
      dom.removeEventListener("pointerup", handleGlobalUp);
      dom.removeEventListener("touchend", handleGlobalUp);
    };
  }, [gl, draggedId]);

  // Drag handlers
  const handlePointerDown = (id: string, e: any) => {
    e.stopPropagation();
    if (gameState !== "playing" || isMixing) return;
    
    // Check if the sphere is already placed
    const sphere = spheres.find((s) => s.id === id);
    if (sphere && sphere.status === "placed") return;

    audio.playGrab();
    setDraggedId(id);

    // If it was in a mixer slot, release it
    if (mixerSlot1 && mixerSlot1.id === id) setMixerSlot1(null);
    if (mixerSlot2 && mixerSlot2.id === id) setMixerSlot2(null);

    setSpheres((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "table" } : s))
    );
  };

  const handlePointerMove = (e: any) => {
    if (!draggedId || gameState !== "playing") return;
    e.stopPropagation();

    // Project input position onto a virtual flat vertical plane at z = -0.65 (where table spheres reside)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.65);
    const intersectPoint = new THREE.Vector3();
    
    if (e.raycaster) {
      e.raycaster.ray.intersectPlane(plane, intersectPoint);
    } else if (e.point) {
      intersectPoint.copy(e.point);
    } else {
      return;
    }

    setSpheres((prev) =>
      prev.map((s) =>
        s.id === draggedId
          ? {
              ...s,
              position: [
                intersectPoint.x,
                Math.max(0.74, intersectPoint.y), // Keep above the table level
                THREE.MathUtils.clamp(intersectPoint.z, -1.3, -0.2), // Constrain depth
              ],
            }
          : s
      )
    );
  };

  const handlePointerUp = (e?: any) => {
    // Read from ref so VR-triggered release always gets the live value
    const activeId = draggedIdRef.current;
    if (!activeId || gameState !== "playing") return;

    if (e) {
      e.stopPropagation();
    }

    const activeSphere = spheresRef.current.find((s) => s.id === activeId);
    if (!activeSphere) {
      setDraggedId(null);
      return;
    }

    // For VR grab, use the live position from vrSpherePos (already synced before release)
    const livePosVec = vrSpherePos.current.get(activeId);
    const spherePos = livePosVec
      ? livePosVec.clone()
      : new THREE.Vector3(...activeSphere.position);

    // 1. Check Basket slots (hollow wood paint buckets)
    let snappedToWheel = false;
    for (let i = 0; i < targetColors.length; i++) {
      const color = targetColors[i];
      // Only place color in its correct designated slot
      if (color.id === activeSphere.colorId) {
        const slotPos = getSlotPosition(i, targetColors.length);
        const distance = spherePos.distanceTo(slotPos);

        // Larger, more forgiving snap thresholds (magnet effect) to prevent clipping or drop failures
        const snapThreshold = targetColors.length === 3 ? 0.35 : 0.25;
        if (distance < snapThreshold) {
          // Correct placement!
          const success = placeColor(color.id, activeSphere.colorId);
          if (success) {
            audio.playSnap();
            setSpheres((prev) =>
              prev.map((s) =>
                s.id === activeId
                  ? {
                      ...s,
                      position: [slotPos.x, slotPos.y + 0.045, slotPos.z],
                      status: "placed" as const,
                    }
                  : s
              )
            );
            snappedToWheel = true;

            // If it was a primary dispenser sphere, spawn a new one in the dispenser
            if (activeSphere.isPrimary) {
              spawnNewPrimary(activeSphere.colorId);
            }
            break;
          }
        }
      }
    }

    if (snappedToWheel) {
      setDraggedId(null);
      return;
    }

    // 2. Check Mixer Slots (only if level >= 2)
    if (level >= 2) {
      // Mixer machine at [-0.45, 0.77, -0.48]; slots at local offsets:
      //   Slot A: [-0.07, 0.01, -0.04] → world [-0.52, 0.78, -0.52]
      //   Slot B: [+0.07, 0.01, -0.04] → world [-0.38, 0.78, -0.52]
      const slot1Pos = new THREE.Vector3(-0.52, 0.78, -0.52);
      const slot2Pos = new THREE.Vector3(-0.38, 0.78, -0.52);

      const distSlot1 = spherePos.distanceTo(slot1Pos);
      const distSlot2 = spherePos.distanceTo(slot2Pos);

      // Snap to Mixer Slot 1
      if (distSlot1 < 0.18 && !mixerSlot1Ref.current) {
        audio.playClick();
        setMixerSlot1(activeSphere);
        setSpheres((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? {
                  ...s,
                  position: [slot1Pos.x, slot1Pos.y, slot1Pos.z],
                  status: "slot1" as const,
                }
              : s
          )
        );
        if (activeSphere.isPrimary) {
          spawnNewPrimary(activeSphere.colorId);
        }
        setDraggedId(null);
        return;
      }

      // Snap to Mixer Slot 2
      if (distSlot2 < 0.18 && !mixerSlot2Ref.current) {
        audio.playClick();
        setMixerSlot2(activeSphere);
        setSpheres((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? {
                  ...s,
                  position: [slot2Pos.x, slot2Pos.y, slot2Pos.z],
                  status: "slot2" as const,
                }
              : s
          )
        );
        if (activeSphere.isPrimary) {
          spawnNewPrimary(activeSphere.colorId);
        }
        setDraggedId(null);
        return;
      }
    }

    // 3. Reset position if not snapped
    // If it's a primary dispenser sphere, it just floats back to the dispenser
    if (activeSphere.isPrimary) {
      audio.playFail();
      setSpheres((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? { ...s, position: [...s.spawnPosition] as [number, number, number] }
            : s
        )
      );
    } else {
      // If it's a mixed sphere, float it back to the table surface
      audio.playFail();
      setSpheres((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? { ...s, position: [s.spawnPosition[0], 0.77, s.spawnPosition[2]] as [number, number, number] }
            : s
        )
      );
    }
    setDraggedId(null);
  };

  // Spawn a fresh primary color sphere on the dispenser
  const spawnNewPrimary = (colorId: string) => {
    const disp = DISPENSERS.find((d) => d.colorId === colorId)!;
    const colorInfo = ALL_COLORS.find((c) => c.id === colorId)!;
    
    // Tiny delay to make it feel like spawning
    setTimeout(() => {
      setSpheres((prev) => [
        ...prev,
        {
          id: `primary-${colorId}-${Date.now()}`,
          colorId,
          hex: disp.hex,
          symbol: colorInfo.symbol,
          position: [...disp.pos] as [number, number, number],
          spawnPosition: [...disp.pos] as [number, number, number],
          status: "table",
          isPrimary: true,
        },
      ]);
    }, 400);
  };

  // Perform mixing action
  const handleMix = () => {
    if (!mixerSlot1 || !mixerSlot2 || isMixing) return;

    // Check recipe
    const comboKey1 = `${mixerSlot1.colorId}+${mixerSlot2.colorId}`;
    const comboKey2 = `${mixerSlot2.colorId}+${mixerSlot1.colorId}`;
    const outputColorId = MIX_RECIPES[comboKey1] || MIX_RECIPES[comboKey2];

    setIsMixing(true);

    if (outputColorId) {
      // Success Mix!
      audio.playGrab(); // Whirring mix start
      setTimeout(() => {
        audio.playSnap(); // Boom chime finished
        
        // Remove input spheres
        setSpheres((prev) =>
          prev.filter((s) => s.id !== mixerSlot1.id && s.id !== mixerSlot2.id)
        );

        const colorInfo = ALL_COLORS.find((c) => c.id === outputColorId)!;
        const outputPos: [number, number, number] = [-0.45, 0.77, -0.38]; // front of mixer

        // Add mixed color sphere to the table
        setSpheres((prev) => [
          ...prev,
          {
            id: `mixed-${outputColorId}-${Date.now()}`,
            colorId: outputColorId,
            hex: colorInfo.hex,
            symbol: colorInfo.symbol,
            position: outputPos,
            spawnPosition: outputPos,
            status: "table",
            isPrimary: false,
          },
        ]);

        setMixerSlot1(null);
        setMixerSlot2(null);
        setIsMixing(false);
      }, 1500); // 1.5s reaction animation
    } else {
      // Failed recipe
      audio.playFail();
      setTimeout(() => {
        // Return spheres to table
        setSpheres((prev) =>
          prev.map((s) => {
            if (s.id === mixerSlot1.id) {
              return { ...s, position: [s.spawnPosition[0], 0.77, s.spawnPosition[2]], status: "table" };
            }
            if (s.id === mixerSlot2.id) {
              return { ...s, position: [s.spawnPosition[0], 0.77, s.spawnPosition[2]], status: "table" };
            }
            return s;
          })
        );
        setMixerSlot1(null);
        setMixerSlot2(null);
        setIsMixing(false);
      }, 1000);
    }
  };

  return (
    <>
      <color attach="background" args={["#7dd3fc"]} />
      <XROrigin ref={xrOriginRef} position={[0, 0, 0.6]} />
      {/* Volumetric sky-blue meadow fog */}
      <fog attach="fog" args={["#bae6fd", 8, 22]} />

      {/* PC Orbit Camera Controls - disabled the moment XR session starts (isPresenting) */}
      {!isPresenting && (
        <OrbitControls
          enableZoom={true}
          minDistance={0.5}
          maxDistance={3.0}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
          target={[0, 1.1, -0.6]}
        />
      )}

      {/* Giant Glowing Sun (Mặt trời tỏa nắng) */}
      <mesh position={[8, 12, -18]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>

      {/* Fluffy White Clouds (Mây trắng trôi bồng bềnh) */}
      <group position={[0, 4, -8]}>
        {[
          [-3.5, 1.2, -2, 0.65],
          [-2.6, 0.9, -2, 0.48],
          [-4.4, 0.9, -2, 0.48],
          [3.5, 1.6, -4, 0.8],
          [2.4, 1.3, -4, 0.58],
          [4.6, 1.3, -4, 0.58],
        ].map(([cx, cy, cz, cs], idx) => (
          <mesh key={idx} position={[cx, cy, cz]} scale={cs}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={1.0} metalness={0.0} flatShading />
          </mesh>
        ))}
      </group>

      {/* Distant Green Hills (Đồi xanh bát ngát ở phía xa) */}
      <group position={[0, 0, -12]}>
        <mesh position={[-6, -1.5, 0]} scale={[12, 6, 6]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#4ade80" roughness={0.9} metalness={0.0} flatShading />
        </mesh>
        <mesh position={[6, -2.5, -2]} scale={[14, 7, 7]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#22c55e" roughness={0.9} metalness={0.0} flatShading />
        </mesh>
        <mesh position={[0, -3.5, -4]} scale={[18, 9, 9]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.9} metalness={0.0} flatShading />
        </mesh>
      </group>

      {/* Green Grassy Ground Plane (Thảm cỏ xanh) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#86efac" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Low-Poly Trees (Cây cối ngoại cảnh) */}
      {[
        [-3.8, -0.6],
        [-4.8, -1.8],
        [3.8, -0.8],
        [4.8, -2.0]
      ].map(([tx, tz], idx) => (
        <group key={idx} position={[tx, 0, tz]}>
          {/* Trunk */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.1, 0.9, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, 1.1, 0]} scale={idx % 2 === 0 ? 0.55 : 0.65} castShadow>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color={idx % 2 === 0 ? "#15803d" : "#166534"} roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}

      {/* Wooden Fences (Hàng rào gỗ mộc mạc) */}
      <group position={[0, 0, -2.2]}>
        {/* Horizontal rails */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[8, 0.04, 0.04]} />
          <meshStandardMaterial color="#a16207" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[8, 0.04, 0.04]} />
          <meshStandardMaterial color="#a16207" roughness={0.9} />
        </mesh>
        {/* Vertical posts */}
        {[-3, -1.5, 0, 1.5, 3].map((px) => (
          <mesh key={px} position={[px, 0.4, 0]} castShadow>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color="#a16207" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Ambient golden sun dust particles (Hạt nắng lấp lánh) */}
      <Sparkles count={40} scale={[6, 3, 6]} size={1.2} speed={0.3} color="#fef08a" position={[0, 1.2, -0.6]} />

      {/* Warm Sunlight System */}
      <ambientLight intensity={0.6} color="#f0fdfa" />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.2}
        color="#fef08a"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Soft fill light */}
      <pointLight position={[0, 1.2, -0.6]} intensity={0.2} color="#ffffff" />

      {/* Huge invisible interaction plane to map drag positioning */}
      {draggedId && (
        <mesh
          position={[0, 1.1, -0.65]}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* Rustic Wooden Table (Bàn gỗ mộc mạc) */}
      <group position={[0, 0.38, -0.6]}>
        {/* Table Top */}
        <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.05, 0.55]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} metalness={0.05} />
        </mesh>
        {/* Table Legs */}
        {[
          [-0.58, 0.3, -0.22],
          [0.58, 0.3, -0.22],
          [-0.58, 0.3, 0.22],
          [0.58, 0.3, 0.22]
        ].map(([lx, ly, lz], idx) => (
          <mesh key={idx} position={[lx, -0.025 + ly / 2, lz]} castShadow>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Primary Ball Spawn Bases */}
      {DISPENSERS.map((disp, i) => (
        <mesh key={i} position={[disp.pos[0], 0.745, disp.pos[2]]} receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.002, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>
      ))}

      {/* 3D Baskets System (Hệ thống giỏ đựng màu - Thùng sơn gỗ treo) */}
      <group>
        {/* Wooden Rack (Giá treo gỗ) */}
        <group position={[0, 0.762, -0.72]}>
          {/* Vertical support posts */}
          <mesh position={[-0.4, 0.35, 0]} castShadow>
            <boxGeometry args={[0.03, 0.7, 0.03]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[0.4, 0.35, 0]} castShadow>
            <boxGeometry args={[0.03, 0.7, 0.03]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Top crossbeam */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[0.84, 0.03, 0.03]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Sign board */}
          <mesh position={[0, 0.58, 0.015]} castShadow>
            <boxGeometry args={[0.55, 0.09, 0.015]} />
            <meshStandardMaterial color="#d97706" roughness={0.8} />
          </mesh>
          <Text
            position={[0, 0.58, 0.024]}
            fontSize={0.022}
            color="#fef3c7"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            COLOR SORTING STATION
          </Text>
        </group>

        {targetColors.map((color, index) => {
          const slotPos = getSlotPosition(index, targetColors.length);
          const isPlaced = placedColors[color.id] === color.id;

          // Wire height helper: from slotPos.y + 0.08 (handle) up to crossbeam at y = 0.762 + 0.65 = 1.412
          const wireHeight = 1.412 - (slotPos.y + 0.08);

          return (
            <group key={color.id} position={[slotPos.x, slotPos.y, slotPos.z]}>
              {/* Hanging Wire */}
              <mesh position={[0, 0.08 + wireHeight / 2, 0]}>
                <cylinderGeometry args={[0.002, 0.002, wireHeight, 4]} />
                <meshStandardMaterial color="#334155" />
              </mesh>

              {/* Bucket Body (Wooden paint bucket) - HOLLOW */}
              <group position={[0, 0.04, 0]}>
                {/* Outer Wall */}
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[0.05, 0.038, 0.08, 16, 1, true]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} metalness={0.0} side={THREE.FrontSide} />
                </mesh>
                
                {/* Inner Wall */}
                <mesh receiveShadow>
                  <cylinderGeometry args={[0.046, 0.034, 0.078, 16, 1, true]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} metalness={0.0} side={THREE.BackSide} />
                </mesh>

                {/* Top Rim */}
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.046, 0.05, 16]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} metalness={0.0} side={THREE.DoubleSide} />
                </mesh>

                {/* Paint on the top rim (stain/wet paint facing player) */}
                <mesh position={[0, 0.0405, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.046, 0.05, 16, 1, Math.PI / 4, Math.PI / 2]} />
                  <meshStandardMaterial
                    color={color.hex}
                    roughness={0.2}
                    emissive={color.hex}
                    emissiveIntensity={0.2}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                {/* Paint drip 1 (main drip down the front) */}
                <group>
                  {/* Tapered drip body starting from rim (y = 0.04 down to y = 0.01) */}
                  <mesh position={[0, 0.025, 0.048]} rotation={[0.15, 0, 0]}>
                    <cylinderGeometry args={[0.006, 0.0035, 0.03, 8]} />
                    <meshStandardMaterial
                      color={color.hex}
                      roughness={0.2}
                      emissive={color.hex}
                      emissiveIntensity={0.2}
                    />
                  </mesh>
                  {/* Teardrop bulb at the bottom tip of drip 1 */}
                  <mesh position={[0, 0.01, 0.0465]} castShadow>
                    <sphereGeometry args={[0.0055, 16, 16]} />
                    <meshStandardMaterial
                      color={color.hex}
                      roughness={0.2}
                      emissive={color.hex}
                      emissiveIntensity={0.2}
                    />
                  </mesh>
                </group>

                {/* Paint drip 2 (secondary smaller drip) */}
                <group>
                  {/* Tapered drip body starting from rim (y = 0.04 down to y = 0.02) */}
                  <mesh position={[0.014, 0.03, 0.047]} rotation={[0.15, 0, 0]}>
                    <cylinderGeometry args={[0.004, 0.002, 0.02, 8]} />
                    <meshStandardMaterial
                      color={color.hex}
                      roughness={0.2}
                      emissive={color.hex}
                      emissiveIntensity={0.2}
                    />
                  </mesh>
                  {/* Teardrop bulb at the bottom tip of drip 2 */}
                  <mesh position={[0.014, 0.02, 0.0455]} castShadow>
                    <sphereGeometry args={[0.0035, 16, 16]} />
                    <meshStandardMaterial
                      color={color.hex}
                      roughness={0.2}
                      emissive={color.hex}
                      emissiveIntensity={0.2}
                    />
                  </mesh>
                </group>

                {/* Bottom Inside Floor */}
                <mesh position={[0, -0.038, 0]}>
                  <cylinderGeometry args={[0.034, 0.034, 0.002, 16]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} metalness={0.0} />
                </mesh>
              </group>

              {/* Metallic bucket rings */}
              <mesh position={[0, 0.065, 0]}>
                <cylinderGeometry args={[0.051, 0.051, 0.005, 16, 1, true]} />
                <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.015, 0]}>
                <cylinderGeometry args={[0.041, 0.041, 0.005, 16, 1, true]} />
                <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Bucket Handle */}
              <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.08, 0]}>
                <torusGeometry args={[0.05, 0.004, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Paint Fluid Inside (Emissive surface at the bottom of the bucket) */}
              <mesh position={[0, 0.004, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.002, 16]} />
                <meshStandardMaterial
                  color={color.hex}
                  emissive={color.hex}
                  emissiveIntensity={isPlaced ? 0.35 : 0.05}
                  roughness={0.15}
                />
              </mesh>

              {/* Bucket Label (Vietnamese name) */}
              <Text
                position={[0, 0.115, 0]}
                fontSize={0.015}
                color={isPlaced ? "#15803d" : "#020617"}
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
                font="/Outfit-Regular.ttf"
              >
                {color.nameVi}
              </Text>

              {/* Colorblind symbol label */}
              {isColorBlindMode && (
                <Text
                  position={[0, 0.04, 0.052]}
                  fontSize={0.013}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  font="/Outfit-Regular.ttf"
                >
                  {color.symbol}
                </Text>
              )}
            </group>
          );
        })}
      </group>

      {/* Color Synthesizer / Mixer machine (Available in level 2 & 3) */}
      {level >= 2 && (
        <ColorMixer3D
          position={[-0.45, 0.77, -0.48]}
          slot1Color={mixerSlot1 ? mixerSlot1.hex : null}
          slot2Color={mixerSlot2 ? mixerSlot2.hex : null}
          onMixClick={handleMix}
          isMixing={isMixing}
        />
      )}

      {/* ChromaBot floating companion */}
      <ChromaBot3D />

      {/* Render Spheres */}
      {spheres.map((sphere) => (
        <InteractiveSphere
          key={sphere.id}
          sphere={sphere}
          draggedId={draggedId}
          vrGrabbedIdRef={vrGrabbedId}
          vrSpherePosRef={vrSpherePos}
          handlePointerDown={handlePointerDown}
          gameState={gameState}
          isMixing={isMixing}
          isColorBlindMode={isColorBlindMode}
        />
      ))}

      {/* Floating 3D VR Level Up / Reset Button */}
      {isLevelComplete && (
        <group 
          position={[0, 1.15, -0.45]}
          onClick={() => {
            audio.playLevelUp();
            nextLevel();
          }}
        >
          {/* Plate */}
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.08, 0.02]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} roughness={0.2} />
          </mesh>
          {/* Button Text */}
          <Text
            position={[0, 0, 0.012]}
            fontSize={0.02}
            color="#020617"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            {level < 3 ? "LÊN LỚP TIẾP THEO" : "HOÀN THÀNH ĐỒ ÁN"}
          </Text>
        </group>
      )}

      {/* Floating 3D VR 12-Color Mixing Chart Board */}
      {showColorChart && (
        <group position={[0, 1.25, -0.45]}>
          {/* Transparent Holographic Glass Panel */}
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.48, 0.015]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={0.8}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>
          {/* Glowing Border Frame */}
          <mesh>
            <boxGeometry args={[0.71, 0.49, 0.016]} />
            <meshStandardMaterial
              color="#f59e0b"
              transparent
              opacity={0.3}
              roughness={0.2}
              emissive="#f59e0b"
              emissiveIntensity={0.6}
              wireframe
            />
          </mesh>

          {/* Title */}
          <Text
            position={[0, 0.2, 0.01]}
            fontSize={0.022}
            color="#fef3c7"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            BẢNG PHỐI MÀU 12 SẮC ĐỘ
          </Text>

          {/* Left Side: Visual 12-Color Circle */}
          <group position={[-0.17, -0.04, 0.01]}>
            {/* Draw 12 colored spheres in a circle */}
            {ALL_COLORS.map((col, index) => {
              const angle = (index * 2 * Math.PI) / 12 - Math.PI / 2;
              const radius = 0.11;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <group key={col.id} position={[x, y, 0]}>
                  {/* Color Sphere */}
                  <mesh>
                    <sphereGeometry args={[0.013, 16, 16]} />
                    <meshStandardMaterial
                      color={col.hex}
                      emissive={col.hex}
                      emissiveIntensity={0.25}
                      roughness={0.2}
                    />
                  </mesh>
                  {/* Mini label for colors */}
                  <Text
                    position={[0, -0.02, 0.005]}
                    fontSize={0.007}
                    color="#f1f5f9"
                    fontWeight="bold"
                    anchorX="center"
                    anchorY="middle"
                    font="/Outfit-Regular.ttf"
                  >
                    {col.nameVi}
                  </Text>
                </group>
              );
            })}
            
            {/* Decorative Central Text */}
            <Text
              position={[0, 0, 0.005]}
              fontSize={0.01}
              color="#94a3b8"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
              font="/Outfit-Regular.ttf"
            >
              VÒNG MÀU RYB
            </Text>
          </group>

          {/* Right Side: Text Recipe Guide */}
          <group position={[0.16, 0.11, 0.01]}>
            {[
              "CÔNG THỨC PHA MÀU CHÍNH:",
              "Đỏ + Vàng ➔ Cam",
              "Vàng + Lam ➔ Lục",
              "Lam + Đỏ ➔ Tím",
              "Đỏ + Cam ➔ Đỏ-Cam",
              "Vàng + Cam ➔ Vàng-Cam",
              "Vàng + Lục ➔ Vàng-Lục",
              "Lam + Lục ➔ Lam-Lục",
              "Lam + Tím ➔ Lam-Tím",
              "Đỏ + Tím ➔ Đỏ-Tím",
            ].map((text, idx) => {
              const isHeader = idx === 0;
              return (
                <Text
                  key={idx}
                  position={[0, -idx * 0.026, 0]}
                  fontSize={isHeader ? 0.012 : 0.0105}
                  color={isHeader ? "#f59e0b" : "#f1f5f9"}
                  fontWeight={isHeader ? "bold" : "normal"}
                  anchorX="left"
                  anchorY="middle"
                  font="/Outfit-Regular.ttf"
                >
                  {text}
                </Text>
              );
            })}
          </group>
        </group>
      )}

      {/* Floating 3D VR Video Tutorial Board */}
      {showVideoModal && (
        <group position={[0, 1.25, -0.42]}>
          {/* Main Panel Background */}
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.55, 0.015]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={0.85}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>
          {/* Border Frame */}
          <mesh>
            <boxGeometry args={[0.81, 0.56, 0.016]} />
            <meshStandardMaterial
              color="#ec4899"
              transparent
              opacity={0.3}
              roughness={0.2}
              emissive="#ec4899"
              emissiveIntensity={0.6}
              wireframe
            />
          </mesh>

          {/* Title */}
          <Text
            position={[0, 0.22, 0.01]}
            fontSize={0.024}
            color="#fdf2f8"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            HƯỚNG DẪN HỌC MÀU SẮC & CÁCH CHƠI
          </Text>

          {/* Left Side: Video Player Screen */}
          <group position={[-0.18, -0.02, 0.01]}>
            {/* Screen Frame */}
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.24, 0.01]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} />
            </mesh>
            {/* Screen: Animated canvas texture (CORS-safe, works in WebXR) */}
            {videoCanvasTexture ? (
              <mesh position={[0, 0, 0.006]}>
                <planeGeometry args={[0.36, 0.22]} />
                <meshBasicMaterial map={videoCanvasTexture} toneMapped={false} />
              </mesh>
            ) : (
              <Text
                position={[0, 0, 0.006]}
                fontSize={0.012}
                color="#64748b"
                anchorX="center"
                anchorY="middle"
                font="/Outfit-Regular.ttf"
              >
                Đang khởi tạo...
              </Text>
            )}
            {/* Play/Pause indicator */}
            <Text
              position={[0, -0.14, 0.005]}
              fontSize={0.01}
              color="#94a3b8"
              anchorX="center"
              anchorY="middle"
              font="/Outfit-Regular.ttf"
            >
              {videoPlaying ? "⏸ HOẠT CẢNH ĐANG CHẠY" : "▶ NHẤN ĐỂ PHÁT"}
            </Text>
          </group>

          {/* Right Side: Text Instructions */}
          <group position={[0.05, 0.12, 0.01]}>
            {[
              "🎨 CẤP ĐỘ MÀU SẮC:",
              "• Màu cơ bản: Đỏ, Vàng, Lam",
              "• Màu thứ cấp: Cam, Lục, Tím",
              "  (Tạo bằng cách trộn 2 màu cơ bản)",
              "• Màu bậc ba: Đỏ-Cam, Vàng-Lục...",
              "  (Trộn 1 màu cơ bản + 1 màu thứ cấp)",
              "",
              "🎮 CÁCH TƯƠNG TÁC:",
              "• Controller: Hướng tia laser, nhấn giữ",
              "  nút Trigger (Cò) hoặc Grip để nhặt bóng.",
              "• Hand Tracking: Pinch (ngón cái + trỏ)",
              "  để nhặt bóng màu và thả vào giỏ.",
            ].map((text, idx) => {
              const isHeader = text.startsWith("🎨") || text.startsWith("🎮");
              return (
                <Text
                  key={idx}
                  position={[0, -idx * 0.02, 0]}
                  fontSize={isHeader ? 0.011 : 0.009}
                  color={isHeader ? "#ec4899" : "#f1f5f9"}
                  fontWeight={isHeader ? "bold" : "normal"}
                  anchorX="left"
                  anchorY="middle"
                  font="/Outfit-Regular.ttf"
                >
                  {text}
                </Text>
              );
            })}
          </group>

          {/* Control Buttons */}
          <VRButton
            position={[-0.2, -0.2, 0.01]}
            width={0.16}
            height={0.045}
            text={videoPlaying ? "TẠM DỪNG" : "PHÁT VIDEO"}
            color="#475569"
            hoverColor="#334155"
            onClick={toggleVideoPlay}
          />
          <VRButton
            position={[0.2, -0.2, 0.01]}
            width={0.16}
            height={0.045}
            text="ĐÓNG HƯỚNG DẪN"
            color="#ec4899"
            hoverColor="#db2777"
            onClick={() => setShowVideoModal(false)}
          />
        </group>
      )}

      {/* Floating 3D VR Main Menu */}
      {gameState === "menu" && (
        <group position={[0, 1.25, -0.5]}>
          {/* Main Panel Background */}
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.62, 0.015]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={0.85}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>
          {/* Border Frame */}
          <mesh>
            <boxGeometry args={[0.81, 0.63, 0.016]} />
            <meshStandardMaterial
              color="#06b6d4"
              transparent
              opacity={0.3}
              roughness={0.2}
              emissive="#06b6d4"
              emissiveIntensity={0.6}
              wireframe
            />
          </mesh>

          {/* Title */}
          <Text
            position={[0, 0.24, 0.01]}
            fontSize={0.035}
            color="#06b6d4"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            VR COLOR CIRCLE
          </Text>
          <Text
            position={[0, 0.2, 0.01]}
            fontSize={0.015}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            PHÒNG THÍ NGHIỆM MÀU SẮC 3D
          </Text>

          {/* SECTION 1: LEVEL */}
          <Text
            position={[-0.35, 0.12, 0.01]}
            fontSize={0.014}
            color="#94a3b8"
            fontWeight="bold"
            anchorX="left"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            1. CHỌN CẤP ĐỘ (LEVEL)
          </Text>
          <VRButton
            position={[-0.22, 0.06, 0.01]}
            width={0.18}
            height={0.045}
            text="Lớp 1"
            isActive={level === 1}
            activeColor="#06b6d4"
            onClick={() => setLevel(1)}
          />
          <VRButton
            position={[0, 0.06, 0.01]}
            width={0.18}
            height={0.045}
            text="Lớp 2"
            isActive={level === 2}
            activeColor="#06b6d4"
            onClick={() => setLevel(2)}
          />
          <VRButton
            position={[0.22, 0.06, 0.01]}
            width={0.18}
            height={0.045}
            text="Lớp 3"
            isActive={level === 3}
            activeColor="#06b6d4"
            onClick={() => setLevel(3)}
          />

          {/* SECTION 2: MODE */}
          <Text
            position={[-0.35, -0.01, 0.01]}
            fontSize={0.014}
            color="#94a3b8"
            fontWeight="bold"
            anchorX="left"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            2. CHẾ ĐỘ CHƠI (MODE)
          </Text>
          <VRButton
            position={[-0.15, -0.07, 0.01]}
            width={0.25}
            height={0.05}
            text="Dễ (Easy)"
            isActive={gameMode === "easy"}
            activeColor="#8b5cf6"
            onClick={() => setGameMode("easy")}
          />
          <VRButton
            position={[0.15, -0.07, 0.01]}
            width={0.25}
            height={0.05}
            text="Khó (Hard)"
            isActive={gameMode === "hard"}
            activeColor="#f43f5e"
            onClick={() => setGameMode("hard")}
          />

          {/* SECTION 3: OPTIONS */}
          <Text
            position={[-0.35, -0.14, 0.01]}
            fontSize={0.014}
            color="#94a3b8"
            fontWeight="bold"
            anchorX="left"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            3. HỖ TRỢ NGƯỜI CHƠI
          </Text>
          <VRButton
            position={[-0.15, -0.19, 0.01]}
            width={0.25}
            height={0.045}
            text={isColorBlindMode ? "Mù màu: BẬT" : "Mù màu: TẮT"}
            isActive={isColorBlindMode}
            activeColor="#f59e0b"
            onClick={() => setIsColorBlindMode(!isColorBlindMode)}
          />
          <VRButton
            position={[0.15, -0.19, 0.01]}
            width={0.25}
            height={0.045}
            text={soundOn ? "Âm thanh: BẬT" : "Âm thanh: TẮT"}
            isActive={soundOn}
            activeColor="#10b981"
            onClick={() => setSoundOn(!soundOn)}
          />

          {/* SECTION 4: ACTIONS */}
          <VRButton
            position={[-0.22, -0.265, 0.01]}
            width={0.22}
            height={0.055}
            text="BẮT ĐẦU CHƠI"
            color="#10b981"
            hoverColor="#059669"
            onClick={() => {
              audio.startBGM();
              setGameState("playing");
            }}
          />
          <VRButton
            position={[0, -0.265, 0.01]}
            width={0.18}
            height={0.055}
            text="HỌC MÀU SẮC"
            color="#ec4899"
            hoverColor="#db2777"
            onClick={() => setShowVideoModal(true)}
          />
          <VRButton
            position={[0.22, -0.265, 0.01]}
            width={0.18}
            height={0.055}
            text="BẢNG PHA MÀU"
            color="#eab308"
            hoverColor="#ca8a04"
            onClick={() => setShowColorChart(true)}
          />
        </group>
      )}

      {/* Floating 3D VR Victory / Game Over Screen */}
      {(gameState === "victory" || gameState === "gameover") && (
        <group position={[0, 1.25, -0.5]}>
          {/* Main Panel Background */}
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.42, 0.015]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={0.9}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>
          {/* Border Frame */}
          <mesh>
            <boxGeometry args={[0.61, 0.43, 0.016]} />
            <meshStandardMaterial
              color={gameState === "victory" ? "#10b981" : "#ef4444"}
              transparent
              opacity={0.3}
              roughness={0.2}
              emissive={gameState === "victory" ? "#10b981" : "#ef4444"}
              emissiveIntensity={0.6}
              wireframe
            />
          </mesh>

          {/* Title */}
          <Text
            position={[0, 0.14, 0.01]}
            fontSize={0.028}
            color={gameState === "victory" ? "#10b981" : "#ef4444"}
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            {gameState === "victory" ? "THÍ NGHIỆM THÀNH CÔNG!" : "HẾT THỜI GIAN!"}
          </Text>

          {/* Subtext */}
          <Text
            position={[0, 0.07, 0.01]}
            fontSize={0.012}
            color="#94a3b8"
            maxWidth={0.5}
            anchorX="center"
            anchorY="middle"
            font="/Outfit-Regular.ttf"
          >
            {gameState === "victory"
              ? "Bạn đã xuất sắc phân loại chính xác toàn bộ màu sắc trong phòng thí nghiệm!"
              : "Thời gian đã hết! Hãy thử sức lại để rèn luyện kỹ năng phối màu."}
          </Text>

          {/* Stats Box */}
          <group position={[0, -0.04, 0.01]}>
            <mesh>
              <boxGeometry args={[0.4, 0.08, 0.005]} />
              <meshStandardMaterial color="#020617" roughness={0.5} />
            </mesh>
            <Text
              position={[-0.1, 0.01, 0.005]}
              fontSize={0.01}
              color="#64748b"
              anchorX="center"
              anchorY="middle"
              font="/Outfit-Regular.ttf"
            >
              CẤP ĐỘ ĐẠT ĐƯỢC
            </Text>
            <Text
              position={[-0.1, -0.015, 0.005]}
              fontSize={0.014}
              color="#f1f5f9"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
              font="/Outfit-Regular.ttf"
            >
              Lớp {level}/3
            </Text>

            <Text
              position={[0.1, 0.01, 0.005]}
              fontSize={0.01}
              color="#64748b"
              anchorX="center"
              anchorY="middle"
              font="/Outfit-Regular.ttf"
            >
              TỔNG ĐIỂM SỐ
            </Text>
            <Text
              position={[0.1, -0.015, 0.005]}
              fontSize={0.018}
              color="#fbbf24"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
              font="/Outfit-Regular.ttf"
            >
              {score}
            </Text>
          </group>

          {/* Action button */}
          <VRButton
            position={[0, -0.13, 0.01]}
            width={0.3}
            height={0.05}
            text="QUAY LẠI PHÒNG CHỜ"
            color={gameState === "victory" ? "#10b981" : "#ef4444"}
            hoverColor={gameState === "victory" ? "#059669" : "#dc2626"}
            onClick={() => {
              resetGame();
            }}
          />
        </group>
      )}
    </>
  );
}

interface VRButtonProps {
  position: [number, number, number];
  width: number;
  height: number;
  text: string;
  color?: string;
  hoverColor?: string;
  textColor?: string;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  activeColor?: string;
}

function VRButton({
  position,
  width,
  height,
  text,
  color = "#1e293b",
  hoverColor = "#334155",
  textColor = "#ffffff",
  onClick,
  disabled = false,
  isActive = false,
  activeColor = "#06b6d4",
}: VRButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          audio.playClick();
          onClick();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!disabled) setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        if (!disabled) setHovered(false);
      }}
      scale={hovered ? 1.05 : 1.0}
    >
      {/* Background Plate */}
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.015]} />
        <meshStandardMaterial
          color={disabled ? "#475569" : isActive ? activeColor : hovered ? hoverColor : color}
          emissive={isActive ? activeColor : "#000000"}
          emissiveIntensity={isActive ? 0.2 : 0}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>
      {/* Text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={height * 0.35}
        color={disabled ? "#94a3b8" : isActive ? "#0f172a" : textColor}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
        font="/Outfit-Regular.ttf"
      >
        {text}
      </Text>
    </group>
  );
}

interface InteractiveSphereProps {
  sphere: SphereState;
  draggedId: string | null;
  vrGrabbedIdRef: React.MutableRefObject<string | null>;
  vrSpherePosRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  handlePointerDown: (id: string, e: any) => void;
  gameState: string;
  isMixing: boolean;
  isColorBlindMode: boolean;
}

function InteractiveSphere({
  sphere,
  draggedId,
  vrGrabbedIdRef,
  vrSpherePosRef,
  handlePointerDown,
  gameState,
  isMixing,
  isColorBlindMode,
}: InteractiveSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const velocityY = useRef(0);
  const isDropped = useRef(false);

  // Use refs to avoid stale closures in useFrame
  const sphereRef = useRef(sphere);
  sphereRef.current = sphere;
  const draggedIdRef = useRef(draggedId);
  draggedIdRef.current = draggedId;

  const isGrabbed = sphere.id === draggedId;
  const colorName = ALL_COLORS.find((c) => c.id === sphere.colorId)?.nameVi || "";

  // Initialize position on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...sphere.position);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sphere.id]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const currentSphere = sphereRef.current;
    const currentDraggedId = draggedIdRef.current;
    const currentIsGrabbed = currentSphere.id === currentDraggedId;

    // VR-grabbed: read the live position from vrSpherePos (written by parent useFrame MOVE step)
    // The child owns groupRef, so it's the only one that sets its position.
    if (vrGrabbedIdRef.current === currentSphere.id) {
      const livePos = vrSpherePosRef.current.get(currentSphere.id);
      if (livePos) {
        groupRef.current.position.set(livePos.x, livePos.y, livePos.z);
      }
      velocityY.current = 0;
      isDropped.current = false;
      return;
    }

    // If being dragged via mouse/touch (PC mode), match target position instantly
    if (currentIsGrabbed) {
      groupRef.current.position.set(...currentSphere.position);
      velocityY.current = 0;
      isDropped.current = false;
      return;
    }

    const [targetX, targetY, targetZ] = currentSphere.position;
    const currentPos = groupRef.current.position;

    if (currentSphere.status === "placed") {
      // Initialize the drop position from 15cm above the bucket floor
      if (!isDropped.current) {
        currentPos.set(targetX, targetY + 0.15, targetZ);
        velocityY.current = 0;
        isDropped.current = true;
        return;
      }

      // 1. Horizontal snap (very fast)
      currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetX, 0.25);
      currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetZ, 0.25);

      // 2. Vertical fall with bounce physics
      if (Math.abs(velocityY.current) > 0.005 || currentPos.y > targetY) {
        velocityY.current -= 0.6 * delta; // Gravity acceleration
        currentPos.y += velocityY.current;

        // Hit the bottom floor of the bucket
        if (currentPos.y <= targetY) {
          currentPos.y = targetY;
          velocityY.current = -velocityY.current * 0.35; // Bounce back up with damping
        }
      } else {
        // Settle exactly at target position
        currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetY, 0.2);
        velocityY.current = 0;
      }
    } else {
      // Smooth interpolation for all other states (e.g. returning to dispenser or snapping to mixer)
      currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetX, 0.15);
      currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetY, 0.15);
      currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetZ, 0.15);
      velocityY.current = 0;
      isDropped.current = false;
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(e) => handlePointerDown(sphere.id, e)}
      onPointerOver={() => {
        if (gameState === "playing" && !isMixing && sphere.status !== "placed") {
          document.body.style.cursor = "grab";
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Main sphere geometry */}
      <mesh castShadow>
        <sphereGeometry args={[0.042, 32, 32]} />
        <meshStandardMaterial
          color={sphere.hex}
          roughness={0.15}
          metalness={0.1}
          emissive={isGrabbed ? sphere.hex : "#000000"}
          emissiveIntensity={isGrabbed ? 0.3 : 0}
        />
      </mesh>

      {/* Glowing ring under grabbed sphere */}
      {isGrabbed && (
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.048, 0.052, 24]} />
          <meshBasicMaterial color={sphere.hex} />
        </mesh>
      )}

      {/* Text label on the sphere */}
      <Billboard>
        <Text
          position={[0, 0, 0.043]}
          fontSize={0.012}
          color={sphere.colorId === "yellow" ? "#1e293b" : "#ffffff"}
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          font="/Outfit-Regular.ttf"
        >
          {colorName}
        </Text>
      </Billboard>

      {/* Accessibility text overlay (ColorADD shapes) */}
      {isColorBlindMode && sphere.status !== "placed" && (
        <Text
          position={[0, 0.055, 0]}
          fontSize={0.016}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/Outfit-Regular.ttf"
        >
          {sphere.symbol}
        </Text>
      )}
    </group>
  );
}
