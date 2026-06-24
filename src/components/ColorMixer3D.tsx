"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface ColorMixer3DProps {
  position: [number, number, number];
  slot1Color: string | null;
  slot2Color: string | null;
  onMixClick: () => void;
  isMixing: boolean;
}

export default function ColorMixer3D({
  position,
  slot1Color,
  slot2Color,
  onMixClick,
  isMixing,
}: ColorMixer3DProps) {
  const coreRef   = useRef<THREE.Mesh>(null);
  const btnRef    = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const hasInputs = slot1Color !== null && slot2Color !== null;

  // Averaged preview colour
  const getMixColor = () => {
    if (isMixing) return "#ffffff";
    if (slot1Color && slot2Color) {
      try {
        const c1 = new THREE.Color(slot1Color);
        const c2 = new THREE.Color(slot2Color);
        return "#" + c1.clone().add(c2).multiplyScalar(0.5).getHexString();
      } catch {
        return "#a855f7";
      }
    }
    if (slot1Color) return slot1Color;
    if (slot2Color) return slot2Color;
    return "#334155";
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Core result-well pulse
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = isMixing
        ? 2.5 + Math.sin(t * 18) * 1.2
        : hasInputs
        ? 0.45 + Math.sin(t * 2.5) * 0.2
        : 0.1;
    }

    // Mix button pulse when ready
    if (btnRef.current) {
      const m = btnRef.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = isMixing
        ? 0.4
        : hovered && hasInputs
        ? 1.2
        : hasInputs
        ? 0.6 + Math.sin(t * 3) * 0.25
        : 0.15;
    }
  });

  return (
    <group position={position}>
      {/* ── Machine base plate ─────────────────────────────────── */}
      <mesh castShadow receiveShadow position={[0, -0.006, 0]}>
        <boxGeometry args={[0.22, 0.012, 0.18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* ── Slot A indicator (left) ─────────────────────────────── */}
      <group position={[-0.07, 0.01, -0.04]}>
        {/* Well surround */}
        <mesh>
          <cylinderGeometry args={[0.028, 0.028, 0.014, 20]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Paint pool */}
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.004, 20]} />
          <meshStandardMaterial
            color={slot1Color ?? "#334155"}
            emissive={slot1Color ?? "#000000"}
            emissiveIntensity={slot1Color ? 0.5 : 0}
            roughness={0.1}
          />
        </mesh>
        <Text position={[0, 0.026, 0]} fontSize={0.011} color="#94a3b8"
          anchorX="center" anchorY="middle" font="/Outfit-Regular.ttf">
          {slot1Color ? "A ✓" : "A"}
        </Text>
      </group>

      {/* ── Slot B indicator (right) ────────────────────────────── */}
      <group position={[0.07, 0.01, -0.04]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.028, 0.014, 20]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.004, 20]} />
          <meshStandardMaterial
            color={slot2Color ?? "#334155"}
            emissive={slot2Color ?? "#000000"}
            emissiveIntensity={slot2Color ? 0.5 : 0}
            roughness={0.1}
          />
        </mesh>
        <Text position={[0, 0.026, 0]} fontSize={0.011} color="#94a3b8"
          anchorX="center" anchorY="middle" font="/Outfit-Regular.ttf">
          {slot2Color ? "B ✓" : "B"}
        </Text>
      </group>

      {/* ── Result well (centre-back) ────────────────────────────── */}
      <group position={[0, 0.01, -0.04]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.028, 0.014, 20]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh ref={coreRef} position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.004, 24]} />
          <meshStandardMaterial
            color={getMixColor()}
            emissive={getMixColor()}
            emissiveIntensity={0.4}
            roughness={0.1}
          />
        </mesh>
        <Text position={[0, 0.026, 0]} fontSize={0.011} color="#94a3b8"
          anchorX="center" anchorY="middle" font="/Outfit-Regular.ttf">
          KQ
        </Text>
      </group>

      {/* ── BIG clickable MIX button (front, vertical face) ────────
           Faces the player so it's easy to aim at in VR.
           Uses a flat box standing upright so the raycast target is large. */}
      <group
        position={[0, 0.03, 0.06]}
        onClick={(e) => {
          e.stopPropagation();
          if (hasInputs && !isMixing) onMixClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (hasInputs && !isMixing) {
            setHovered(true);
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        scale={hovered && hasInputs && !isMixing ? 1.06 : 1.0}
      >
        {/* Button body — faces player (XZ plane, normal = +Z) */}
        <mesh ref={btnRef} castShadow>
          <boxGeometry args={[0.18, 0.055, 0.018]} />
          <meshStandardMaterial
            color={
              isMixing   ? "#475569"
              : hasInputs ? (hovered ? "#059669" : "#10b981")
              :              "#334155"
            }
            emissive={
              isMixing   ? "#000000"
              : hasInputs ? "#10b981"
              :              "#000000"
            }
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>

        {/* Button label */}
        <Text
          position={[0, 0, 0.011]}
          fontSize={0.021}
          color={isMixing ? "#94a3b8" : hasInputs ? "#f0fdf4" : "#64748b"}
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          font="/Outfit-Regular.ttf"
        >
          {isMixing ? "⏳ ĐANG TRỘN..." : hasInputs ? "✦ TRỘN MÀU ✦" : "ĐẶT 2 BÓNG VÀO"}
        </Text>
      </group>

      {/* ── "MIXER" label on the machine ────────────────────────── */}
      <Text
        position={[0, 0.022, 0.09]}
        fontSize={0.009}
        color="#475569"
        anchorX="center"
        anchorY="middle"
        font="/Outfit-Regular.ttf"
      >
        COLOR MIXER
      </Text>
    </group>
  );
}
