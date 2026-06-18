"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useGame } from "@/context/GameContext";
import * as THREE from "three";

export default function ChromaBot3D() {
  const { level, placedColors, targetColors, gameState } = useGame();
  const botRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);

  // Bobbing and rotating animation
  useFrame((state) => {
    if (!botRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Bob up and down
    botRef.current.position.y = 1.45 + Math.sin(time * 1.5) * 0.04;
    
    // Rotate visor light pulsing intensity
    const visorMesh = botRef.current.getObjectByName("visor") as THREE.Mesh;
    if (visorMesh && visorMesh.material) {
      const visorMaterial = visorMesh.material as any;
      if (visorMaterial && typeof visorMaterial.emissiveIntensity === "number") {
        visorMaterial.emissiveIntensity = 1.5 + Math.sin(time * 3) * 0.5;
      }
    }

    // Keep looking at the camera (player)
    const cameraPos = new THREE.Vector3();
    state.camera.getWorldPosition(cameraPos);
    
    // Only rotate on Y axis to look natural
    const targetLook = new THREE.Vector3(cameraPos.x, botRef.current.position.y, cameraPos.z);
    botRef.current.lookAt(targetLook);
  });

  // Dynamic help text based on level progress
  const getHelperText = () => {
    if (gameState === "menu") return "Chào mừng đến\nChroma Lab!";
    
    const correctCount = targetColors.filter((c) => placedColors[c.id] === c.id).length;
    const totalCount = targetColors.length;

    if (correctCount === totalCount) {
      return "Tuyệt vời!\nHãy bấm nút để tiếp tục!";
    }

    if (level === 1) {
      return "Gợi ý: Cầm bi màu Đỏ, Vàng,\nLam đặt vào các giỏ tương ứng\nở phía sau bàn!";
    }

    if (level === 2) {
      // Find missing secondary colors
      const hasOrange = placedColors["orange"] === "orange";
      const hasGreen = placedColors["green"] === "green";
      const hasPurple = placedColors["purple"] === "purple";

      if (!hasOrange) return "Pha màu Cam:\nĐỏ + Vàng tại máy pha!";
      if (!hasGreen) return "Pha màu Lục:\nVàng + Lam tại máy pha!";
      if (!hasPurple) return "Pha màu Tím:\nĐỏ + Lam tại máy pha!";
      return "Xếp các màu vừa pha\nvào các giỏ màu tương ứng!";
    }

    if (level === 3) {
      return "Pha màu bậc ba:\nKết hợp 1 màu cơ bản\nvà 1 màu thứ cấp tương ứng\nđể tạo ra 6 màu mới!";
    }

    return "Hãy phân loại màu!";
  };

  return (
    <group ref={botRef} position={[0.75, 1.45, -0.85]}>
      {/* Robot Body */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial 
          color="#94a3b8" 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>

      {/* Visor / Eye */}
      <mesh name="visor" position={[0, 0.02, 0.08]}>
        <boxGeometry args={[0.12, 0.03, 0.03]} />
        <meshStandardMaterial 
          color="#06b6d4" 
          emissive="#06b6d4" 
          emissiveIntensity={1.5}
          roughness={0.1}
        />
      </mesh>

      {/* Ears/Side Bolts */}
      <group>
        <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.03, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.03, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Antenna */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial 
          color="#a855f7" 
          emissive="#a855f7" 
          emissiveIntensity={1.0} 
        />
      </mesh>

      {/* Dialog Bubble Background */}
      <group position={[0, 0.22, 0]}>
        {/* Board */}
        <mesh receiveShadow>
          <boxGeometry args={[0.45, 0.16, 0.01]} />
          <meshStandardMaterial 
            color="#0f172a" 
            transparent 
            opacity={0.85} 
            roughness={0.5} 
          />
        </mesh>
        {/* Board Glowing Border */}
        <mesh position={[0, 0, -0.002]}>
          <boxGeometry args={[0.46, 0.17, 0.005]} />
          <meshStandardMaterial 
            color="#8b5cf6" 
            emissive="#8b5cf6" 
            emissiveIntensity={0.6} 
          />
        </mesh>

        {/* Dialog Text */}
        <Text
          ref={textRef}
          position={[0, 0, 0.01]}
          fontSize={0.022}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          font="/Outfit-Regular.ttf" // Outfit Font
        >
          {getHelperText()}
        </Text>
      </group>
    </group>
  );
}
