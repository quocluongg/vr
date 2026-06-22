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
    gameMode,
    gameState,
    isVRActive,
    placedColors,
    placeColor,
    removeColor,
    targetColors,
    isLevelComplete,
    nextLevel,
    resetGame,
    isColorBlindMode,
    setIsVRActive,
    showVideoModal,
    setShowVideoModal,
    showColorChart,
    setShowColorChart
  } = useGame();

  const { gl } = useThree();

  const session = useXR((state) => state.session);
  const isPresenting = !!session;

  useEffect(() => {
    setIsVRActive(isPresenting);
  }, [isPresenting, setIsVRActive]);

  // Track controller buttons A/X and B/Y state
  const buttonAPrevState = useRef(false);
  const buttonBPrevState = useRef(false);

  useFrame(() => {
    if (session) {
      let buttonAPressedThisFrame = false;
      let buttonBPressedThisFrame = false;
      const inputs = Array.from(session.inputSources);
      inputs.forEach((inputSource) => {
        const gamepad = inputSource.gamepad;
        if (gamepad) {
          // A or X button (Index 4)
          const buttonA = gamepad.buttons[4];
          if (buttonA && buttonA.pressed) {
            buttonAPressedThisFrame = true;
          }
          // B or Y button (Index 5)
          const buttonB = gamepad.buttons[5];
          if (buttonB && buttonB.pressed) {
            buttonBPressedThisFrame = true;
          }
        }
      });

      // Detect button A press transition (press down)
      if (buttonAPressedThisFrame && !buttonAPrevState.current) {
        audio.playClick();
        setShowColorChart((prev) => !prev);
      }
      buttonAPrevState.current = buttonAPressedThisFrame;

      // Detect button B press transition (press down)
      if (buttonBPressedThisFrame && !buttonBPrevState.current) {
        audio.playClick();
        setShowVideoModal((prev) => !prev);
      }
      buttonBPrevState.current = buttonBPressedThisFrame;
    }
  });

  // Active spheres on the table/mixer
  const [spheres, setSpheres] = useState<SphereState[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Mixer states
  const [mixerSlot1, setMixerSlot1] = useState<SphereState | null>(null);
  const [mixerSlot2, setMixerSlot2] = useState<SphereState | null>(null);
  const [isMixing, setIsMixing] = useState(false);

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
    if (!draggedId || gameState !== "playing") return;

    if (e) {
      e.stopPropagation();
    }

    const activeSphere = spheres.find((s) => s.id === draggedId);
    if (!activeSphere) {
      setDraggedId(null);
      return;
    }

    const spherePos = new THREE.Vector3(...activeSphere.position);

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
                s.id === draggedId
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
      const mixerPos = new THREE.Vector3(-0.45, 0.77, -0.48);
      const slot1Pos = new THREE.Vector3(-0.53, 0.82, -0.51);
      const slot2Pos = new THREE.Vector3(-0.37, 0.82, -0.51);

      const distSlot1 = spherePos.distanceTo(slot1Pos);
      const distSlot2 = spherePos.distanceTo(slot2Pos);

      // Snap to Mixer Slot 1
      if (distSlot1 < 0.18 && !mixerSlot1) {
        audio.playClick();
        setMixerSlot1(activeSphere);
        setSpheres((prev) =>
          prev.map((s) =>
            s.id === draggedId
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
      if (distSlot2 < 0.18 && !mixerSlot2) {
        audio.playClick();
        setMixerSlot2(activeSphere);
        setSpheres((prev) =>
          prev.map((s) =>
            s.id === draggedId
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
          s.id === draggedId
            ? { ...s, position: [...s.spawnPosition] as [number, number, number] }
            : s
        )
      );
    } else {
      // If it's a mixed sphere, float it back to the table surface
      audio.playFail();
      setSpheres((prev) =>
        prev.map((s) =>
          s.id === draggedId
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
      <XROrigin position={[0, 0, 0.6]} />
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
    </>
  );
}

interface InteractiveSphereProps {
  sphere: SphereState;
  draggedId: string | null;
  handlePointerDown: (id: string, e: any) => void;
  gameState: string;
  isMixing: boolean;
  isColorBlindMode: boolean;
}

function InteractiveSphere({
  sphere,
  draggedId,
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

  // Initialize position on mount so it doesn't animate from [0, 0, 0]
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...sphere.position);
    }
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const currentSphere = sphereRef.current;
    const currentDraggedId = draggedIdRef.current;
    const currentIsGrabbed = currentSphere.id === currentDraggedId;

    // If being dragged, match target position instantly
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
