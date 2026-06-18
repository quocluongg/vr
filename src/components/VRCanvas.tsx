"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { useGame } from "@/context/GameContext";
import { XR } from "@react-three/xr";
import { xrStore } from "@/utils/xrStore";
import VRScene from "./VRScene";

// Polyfill/Patch for WebXR Emulator compatibility (resolves Chrome WebXR Layers crash)
if (typeof window !== "undefined" && typeof (window as any).XRWebGLBinding !== "undefined") {
  try {
    const proto = (window as any).XRWebGLBinding.prototype;
    if (proto && proto.createProjectionLayer) {
      delete proto.createProjectionLayer;
      console.log("Patched XRWebGLBinding.prototype.createProjectionLayer to bypass emulator crash.");
    }
  } catch (e) {
    console.warn("Failed to patch XRWebGLBinding", e);
  }
}

export default function VRCanvas() {
  const { gameState } = useGame();

  // Show 3D scene both during play and in the background of the main menu
  if (gameState !== "playing" && gameState !== "menu") return null;

  return (
    <div className="fixed inset-0 w-full h-full z-0 bg-slate-950">
      <Canvas
        camera={{ position: [0, 1.5, 1.2], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <XR store={xrStore}>
          <VRScene />
        </XR>
      </Canvas>
    </div>
  );
}
