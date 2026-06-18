"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface ColorMixer3DProps {
  position: [number, number, number];
  slot1Color: string | null; // Hex code of sphere in slot 1
  slot2Color: string | null; // Hex code of sphere in slot 2
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
  const coreRef = useRef<THREE.Mesh>(null);
  const buttonRef = useRef<THREE.Group>(null);

  // Pulse the core glow and animate mixing
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Core pulsing animation
    if (coreRef.current) {
      const coreMat = coreRef.current.material as any;
      if (coreMat && typeof coreMat.emissiveIntensity === "number") {
        if (isMixing) {
          // Speed pulse during mixing
          coreMat.emissiveIntensity = 3.0 + Math.sin(time * 20) * 1.5;
        } else {
          // Ambient pulse
          coreMat.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        }
      }
    }

    // Mix button hover/pulse
    if (buttonRef.current) {
      const btnMesh = buttonRef.current.getObjectByName("mixBtn") as THREE.Mesh;
      if (btnMesh) {
        const btnMat = btnMesh.material as any;
        if (btnMat && typeof btnMat.emissiveIntensity === "number") {
          btnMat.emissiveIntensity = 1.0 + Math.sin(time * 4) * 0.4;
        }
      }
    }
  });

  // Calculate mixed core color
  const getCoreColor = () => {
    if (isMixing) return "#ffffff"; // Flash white when mixing
    if (slot1Color && slot2Color) {
      // Average color
      try {
        const c1 = new THREE.Color(slot1Color);
        const c2 = new THREE.Color(slot2Color);
        const mixed = c1.clone().add(c2).multiplyScalar(0.5);
        return "#" + mixed.getHexString();
      } catch (e) {
        return "#a855f7";
      }
    }
    if (slot1Color) return slot1Color;
    if (slot2Color) return slot2Color;
    return "#334155"; // Empty state slate gray
  };

  const hasInputs = slot1Color !== null && slot2Color !== null;

  return (
    <group position={position}>
      {/* Wooden Artist Palette Base (Khay pha màu bằng gỗ) */}
      <group>
        {/* Main palette board */}
        <mesh castShadow receiveShadow position={[0, -0.005, 0]}>
          <cylinderGeometry args={[0.13, 0.14, 0.012, 32]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} metalness={0.1} />
        </mesh>
        
        {/* Thumb Hole */}
        <mesh position={[-0.08, 0.002, 0.05]}>
          <cylinderGeometry args={[0.02, 0.02, 0.014, 16]} />
          <meshStandardMaterial color="#78350f" metalness={0.1} roughness={0.9} />
        </mesh>
      </group>

      {/* Input Slot A (Khe cắm A) - Left paint well */}
      <group position={[-0.08, 0.002, -0.03]}>
        {/* Well Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.035, 0.004, 8, 24]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        {/* Paint Pool */}
        <mesh position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.004, 16]} />
          <meshStandardMaterial
            color={slot1Color ? slot1Color : "#475569"}
            emissive={slot1Color ? slot1Color : "#1e293b"}
            emissiveIntensity={slot1Color ? 0.3 : 0.0}
            roughness={0.1}
          />
        </mesh>
        {/* Snapping zone */}
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
          <meshStandardMaterial color="#10b981" transparent opacity={0.05} />
        </mesh>
        <Text
          position={[0, 0.03, 0]}
          fontSize={0.012}
          color="#475569"
          anchorX="center"
          anchorY="middle"
          font="/Outfit-Regular.ttf"
        >
          Khe A
        </Text>
      </group>

      {/* Input Slot B (Khe cắm B) - Right paint well */}
      <group position={[0.08, 0.002, -0.03]}>
        {/* Well Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.035, 0.004, 8, 24]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        {/* Paint Pool */}
        <mesh position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.004, 16]} />
          <meshStandardMaterial
            color={slot2Color ? slot2Color : "#475569"}
            emissive={slot2Color ? slot2Color : "#1e293b"}
            emissiveIntensity={slot2Color ? 0.3 : 0.0}
            roughness={0.1}
          />
        </mesh>
        {/* Snapping zone */}
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
          <meshStandardMaterial color="#10b981" transparent opacity={0.05} />
        </mesh>
        <Text
          position={[0, 0.03, 0]}
          fontSize={0.012}
          color="#475569"
          anchorX="center"
          anchorY="middle"
          font="/Outfit-Regular.ttf"
        >
          Khe B
        </Text>
      </group>

      {/* Central Mixing Well (Vũng trộn màu ở giữa) */}
      <group position={[0, 0.002, 0.03]}>
        {/* Well Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.045, 0.004, 8, 24]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        {/* Swirling/Glowing Mixed Paint */}
        <mesh ref={coreRef} position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.004, 24]} />
          <meshStandardMaterial
            color={getCoreColor()}
            emissive={getCoreColor()}
            emissiveIntensity={isMixing ? 1.0 : 0.5}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Paintbrush Mix Button (Cọ vẽ kích hoạt trộn màu) */}
      <group
        ref={buttonRef}
        position={[0, 0.012, 0.08]}
        rotation={[0.1, -0.4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (hasInputs && !isMixing) {
            onMixClick();
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Handle (Thân cọ) */}
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.004, 0.12, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
        {/* Ferrule (Khớp kim loại) */}
        <mesh castShadow position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.012, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Tip/Bristles (Đầu lông cọ phát sáng) */}
        <mesh 
          name="mixBtn" 
          castShadow 
          position={[0, 0, -0.072]} 
          rotation={[Math.PI / 2, 0, 0]}
          onPointerOver={() => {
            if (hasInputs && !isMixing) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <cylinderGeometry args={[0.0, 0.006, 0.012, 8]} />
          <meshStandardMaterial
            color={hasInputs ? "#10b981" : "#ef4444"}
            emissive={hasInputs ? "#10b981" : "#ef4444"}
            emissiveIntensity={0.6}
            roughness={0.1}
          />
        </mesh>
        
        {/* Stir Text */}
        <Text
          position={[0, 0.02, 0]}
          fontSize={0.011}
          color={hasInputs ? "#10b981" : "#f87171"}
          anchorX="center"
          anchorY="middle"
          font="/Outfit-Regular.ttf"
        >
          {isMixing ? "TRỘN..." : hasInputs ? "QUẤY MÀU" : "ĐỢI BÓNG"}
        </Text>
      </group>
    </group>
  );
}
