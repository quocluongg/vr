"use client";

import React, { useState, useEffect } from "react";
import { GameProvider } from "@/context/GameContext";
import Dashboard from "@/components/Dashboard";
import VRCanvas from "@/components/VRCanvas";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <GameProvider>
      <main className="relative min-h-screen bg-slate-950 text-slate-100 select-none overflow-x-hidden flex flex-col justify-between">
        {/* Ambient background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />

        {/* 2D HUD Dashboard / Menu */}
        <Dashboard />

        {/* 3D Canvas (Active when mounted on client) */}
        {mounted ? (
          <VRCanvas />
        ) : (
          <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-slate-950 text-white z-50">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-cyan-400 font-mono tracking-widest animate-pulse">
                INITIALIZING CHROMA CORE...
              </p>
            </div>
          </div>
        )}
      </main>
    </GameProvider>
  );
}
