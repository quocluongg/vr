"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { useGame } from "@/context/GameContext";
import { XR } from "@react-three/xr";
import { xrStore } from "@/utils/xrStore";
import VRScene from "./VRScene";
import * as THREE from "three";

export default function VRCanvas() {
  const { gameState } = useGame();

  // Show 3D scene both during play and in the background of the main menu
  if (gameState !== "playing" && gameState !== "menu") return null;

  return (
    <div className="fixed inset-0 w-full h-full z-0 bg-slate-950">
      <Canvas
        camera={{ position: [0, 1.5, 1.2], fov: 60 }}
        shadows
        // alpha: false + explicit opaque clear = fully opaque XR framebuffer on Meta Quest
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          // Ensure the renderer uses a fully opaque sky-blue background.
          // This is critical for Meta Quest: the XR compositor reads the clear color
          // from the WebGLRenderer. Without this, Quest may show passthrough (real world).
          gl.setClearColor(new THREE.Color("#7dd3fc"), 1);
        }}
      >
        <XR store={xrStore}>
          <VRScene />
        </XR>
      </Canvas>
    </div>
  );
}
