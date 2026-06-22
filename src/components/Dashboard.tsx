"use client";

import React, { useState, useEffect } from "react";
import { useGame, GameMode, ALL_COLORS } from "@/context/GameContext";
import { audio } from "@/utils/audio";
import { xrStore } from "@/utils/xrStore";
import { 
  Play, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Clock, 
  Award, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  Compass, 
  X, 
  LogOut 
} from "lucide-react";

export default function Dashboard() {
  const {
    level,
    setLevel,
    gameMode,
    setGameMode,
    gameState,
    setGameState,
    isVRActive,
    setIsVRActive,
    score,
    timeLeft,
    isColorBlindMode,
    setIsColorBlindMode,
    soundOn,
    setSoundOn,
    placedColors,
    targetColors,
    resetLevel,
    resetGame,
    isLevelComplete,
    nextLevel,
    showVideoModal,
    setShowVideoModal,
    showColorChart,
    setShowColorChart
  } = useGame();

  const [showGuide, setShowGuide] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);

  // Check WebXR support
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.xr) {
      navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
        setXrSupported(supported);
      });
    }
  }, []);

  // Handle music state
  useEffect(() => {
    audio.setEnabled(soundOn);
  }, [soundOn]);

  // Listen for 'B' key press to open the video learning modal, 'C' to open color chart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" || e.key === "B") {
        audio.playClick();
        setShowVideoModal((prev) => !prev);
      }
      if (e.key === "c" || e.key === "C") {
        audio.playClick();
        setShowColorChart((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setShowVideoModal, setShowColorChart]);

  const handleStartGame = async (mode: "vr" | "web") => {
    audio.playClick();
    audio.startBGM();
    if (mode === "vr") {
      setIsVRActive(true);
      try {
        await xrStore.enterVR();
      } catch (e) {
        console.error("Failed to start VR session:", e);
        setIsVRActive(false);
      }
    } else {
      setIsVRActive(false);
    }
    setGameState("playing");
  };

  const toggleSound = () => {
    audio.playClick();
    setSoundOn(!soundOn);
  };

  const toggleColorBlind = () => {
    audio.playClick();
    setIsColorBlindMode(!isColorBlindMode);
  };

  const getLevelName = (lvl: number) => {
    if (lvl === 1) return "Màu Cơ Bản (Primary)";
    if (lvl === 2) return "Màu Thứ Cấp (Secondary)";
    return "Màu Bậc Ba (Tertiary)";
  };

  const correctCount = targetColors.filter((c) => placedColors[c.id] === c.id).length;
  const totalCount = targetColors.length;

  const renderVideoModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden animate-scale-up">
        {/* Top gradient border */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500" />
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            <h3 className="text-lg font-black tracking-tight text-slate-100 uppercase">
              Kiến Thức Màu Sắc & Phối Màu
            </h3>
          </div>
          <button
            onClick={() => { audio.playClick(); setShowVideoModal(false); }}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* YouTube Video Container (Aspect Ratio 16:9) */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/tZh7A5wdfjA?autoplay=1&mute=1"
              title="Color Theory for Beginners"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>

          {/* Quick Info text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/50">
              <h4 className="font-bold text-cyan-400 mb-1 flex items-center gap-1">
                🎨 Cấp Độ Màu Sắc
              </h4>
              <ul className="space-y-1 font-light list-disc list-inside">
                <li><strong>Màu Cơ Bản (Primary):</strong> Đỏ, Vàng, Lam (Không thể tạo ra từ các màu khác).</li>
                <li><strong>Màu Thứ Cấp (Secondary):</strong> Cam, Lục, Tím (Tạo ra bằng cách trộn 2 màu cơ bản).</li>
                <li><strong>Màu Bậc Ba (Tertiary):</strong> Đỏ-Cam, Vàng-Cam, Vàng-Lục, v.v. (Trộn màu cơ bản & thứ cấp).</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/50">
              <h4 className="font-bold text-violet-400 mb-1 flex items-center gap-1">
                💡 Hướng Dẫn Tương Tác
              </h4>
              <ul className="space-y-1 font-light list-disc list-inside">
                <li>Nhấn phím <strong>B</strong> trên bàn phím hoặc nút <strong>B / Y</strong> trên tay cầm Quest để bật/tắt thư viện video này.</li>
                <li>Kéo các quả bóng màu từ máy phân phối vào các giỏ gỗ tương ứng ở cuối bàn.</li>
                <li>Sử dụng máy trộn màu (Mixer) ở góc trái để tạo ra các màu thứ cấp/bậc ba.</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 flex justify-end">
          <button
            onClick={() => { audio.playClick(); setShowVideoModal(false); }}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 border border-cyan-400 hover:brightness-110 text-white font-bold text-xs transition-all shadow-md"
          >
            Đóng & Tiếp Tục Chơi
          </button>
        </div>
      </div>
    </div>
  );

  const renderColorChartModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden animate-scale-up">
        {/* Top gradient border */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="text-lg font-black tracking-tight text-slate-100 uppercase">
              Bảng Phối Màu 12 Sắc Độ (RYB Color Wheel)
            </h3>
          </div>
          <button
            onClick={() => { audio.playClick(); setShowColorChart(false); }}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col md:flex-row gap-6 items-center">
          {/* Left Column: Interactive/Visual 12-color ring in SVG */}
          <div className="relative w-56 h-56 flex items-center justify-center bg-slate-950/40 rounded-full border border-slate-800 p-2 shrink-0">
            <svg width="220" height="220" viewBox="0 0 220 220" className="w-full h-full">
              {/* Outer ring path */}
              <circle cx="110" cy="110" r="85" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
              {/* 12 Colors circles */}
              {ALL_COLORS.map((col, index) => {
                const angle = (index * 2 * Math.PI) / 12 - Math.PI / 2;
                const r = 80;
                const cx = 110 + Math.cos(angle) * r;
                const cy = 110 + Math.sin(angle) * r;
                return (
                  <g key={col.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="12"
                      fill={col.hex}
                      className="cursor-pointer hover:scale-125 transition-transform duration-200 origin-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    >
                      <title>{`${col.nameVi} (${col.nameEn})`}</title>
                    </circle>
                    {/* Small text symbol inside circles */}
                    <text
                      x={cx}
                      y={cy + 3}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none font-mono"
                    >
                      {col.symbol[0] || ""}
                    </text>
                  </g>
                );
              })}
              <text x="110" y="115" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
                MÀU RYB
              </text>
            </svg>
          </div>

          {/* Right Column: Recipe details */}
          <div className="flex-1 w-full space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Quy Tắc Phối Màu 3 Cấp Độ
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="block font-bold text-amber-400 mb-1">Màu Thứ Cấp (Secondary)</span>
                  <ul className="space-y-0.5 text-slate-300">
                    <li>Đỏ + Vàng = <strong className="text-[#F97316]">Cam</strong></li>
                    <li>Vàng + Lam = <strong className="text-[#22C55E]">Lục</strong></li>
                    <li>Đỏ + Lam = <strong className="text-[#8B5CF6]">Tím</strong></li>
                  </ul>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="block font-bold text-cyan-400 mb-1">Màu Bậc Ba (Tertiary)</span>
                  <ul className="space-y-0.5 text-slate-300">
                    <li>Đỏ + Cam = <span className="text-[#EA580C]">Đỏ-Cam</span></li>
                    <li>Vàng + Cam = <span className="text-[#F59E0B]">Vàng-Cam</span></li>
                    <li>Vàng + Lục = <span className="text-[#84CC16]">Vàng-Lục</span></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="block font-bold text-slate-200 mb-1">Chi Tiết Màu Bậc Ba Còn Lại:</span>
              <div className="grid grid-cols-3 gap-2 text-slate-300">
                <div>Lam + Lục = <span className="text-[#06B6D4] font-medium">Lam-Lục</span></div>
                <div>Lam + Tím = <span className="text-[#6366F1] font-medium">Lam-Tím</span></div>
                <div>Đỏ + Tím = <span className="text-[#D946EF] font-medium">Đỏ-Tím</span></div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              💡 **Mẹo:** Trong chế độ **Khó (Thử thách)**, bạn cần lấy bóng đỏ, vàng, lam từ bàn nâng, cho vào máy trộn (Mixer) rồi bấm nút "Trộn màu" để tổng hợp ra các màu sắc mong muốn!
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 flex justify-between items-center">
          <span className="text-[10px] text-slate-500 font-mono">
            Phím tắt: nhấn C để bật/tắt bảng này
          </span>
          <button
            onClick={() => { audio.playClick(); setShowColorChart(false); }}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 border border-amber-400 hover:brightness-110 text-white font-bold text-xs transition-all shadow-md"
          >
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  );

  // Render overlay during VR Active (WebXR session) - standard HUD is shown in 3D, so keep DOM light
  if (isVRActive) {
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-4 left-4 z-50 pointer-events-auto">
          <button
            onClick={() => { audio.playClick(); resetGame(); }}
            className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/60 text-rose-300 text-xs font-semibold hover:bg-rose-900 transition-all shadow-md flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Thoát VR Mode
          </button>
        </div>
      </div>
    );
  }

  // Render main menu
  if (gameState === "menu") {
    return (
      <div className="z-10 flex min-h-screen w-full flex-col items-center justify-center p-6 select-none relative">
        {/* Title Block */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4 tracking-widest shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            WEBXR COLOR EXPERIMENT
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-500 filter drop-shadow-[0_0_15px_rgba(34,211,238,0.25)]">
            VR COLOR CIRCLE
          </h1>
          <p className="text-slate-400 mt-3 max-w-md mx-auto text-sm md:text-base font-light">
            Phân loại màu sắc theo các cấp độ trong không gian thực tế ảo 3D. Tương tác tay tự nhiên trên Meta Quest.
          </p>
        </div>

        {/* Configuration Board */}
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 to-violet-600" />
          
          <div className="space-y-6">
            {/* Level Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-3">
                1. Chọn Cấp Độ (Level)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => { audio.playClick(); setLevel(lvl); }}
                    className={`relative py-3 rounded-xl border text-sm font-bold transition-all duration-300 ${
                      level === lvl
                        ? "bg-gradient-to-br from-cyan-600 to-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 scale-[1.03]"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    Lớp {lvl}
                    <span className="block text-[10px] font-normal opacity-80">
                      {lvl === 1 ? "3 màu" : lvl === 2 ? "6 màu" : "12 màu"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Game Mode */}
            <div>
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-3">
                2. Chế Độ Chơi (Mode)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { audio.playClick(); setGameMode("easy"); }}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                    gameMode === "easy"
                      ? "bg-gradient-to-br from-violet-600 to-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/20 scale-[1.02]"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  Dễ (Trẻ Em - Full Màu)
                  <span className="block text-[10px] font-normal opacity-85">Tất cả màu sắc có sẵn</span>
                </button>
                <button
                  onClick={() => { audio.playClick(); setGameMode("hard"); }}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                    gameMode === "hard"
                      ? "bg-gradient-to-br from-rose-600 to-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20 scale-[1.02]"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  Khó (Thử Thách - Tự Pha)
                  <span className="block text-[10px] font-normal opacity-85">Chỉ 3 màu gốc, tự pha thêm</span>
                </button>
              </div>
            </div>

            {/* Additional settings */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                3. Tùy Chọn Hỗ Trợ
              </span>
              <div className="flex gap-2">
                {/* Color blind mode toggle */}
                <button
                  onClick={toggleColorBlind}
                  title={isColorBlindMode ? "Tắt chế độ mù màu" : "Bật ký hiệu hỗ trợ người mù màu"}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isColorBlindMode
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {isColorBlindMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Sound toggle */}
                <button
                  onClick={toggleSound}
                  title={soundOn ? "Mute âm thanh" : "Bật âm thanh"}
                  className={`p-2.5 rounded-xl border transition-all ${
                    soundOn
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Launch Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleStartGame("vr")}
                className="w-full relative py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-600 font-bold text-white shadow-xl shadow-cyan-500/15 hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 group"
              >
                <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                VÀO PHÒNG THÍ NGHIỆM VR
                {xrSupported && <span className="absolute right-3 bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase font-mono">Meta Quest</span>}
              </button>

              <button
                onClick={() => handleStartGame("web")}
                className="w-full py-3 rounded-xl border border-slate-700 bg-slate-950/80 hover:bg-slate-950 font-semibold text-slate-300 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
              >
                CHƠI THỬ TRÊN WEB (3D PC/DI ĐỘNG)
              </button>
            </div>
          </div>
        </div>

        {/* Footer, support and guides */}
        <div className="flex gap-6 mt-8 flex-wrap">
          <button
            onClick={() => { audio.playClick(); setShowGuide(true); }}
            className="flex items-center gap-1.5 text-xs text-cyan-400/80 hover:text-cyan-300 transition-colors font-mono cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            HƯỚNG DẪN KẾT NỐI META QUEST
          </button>
          <button
            onClick={() => { audio.playClick(); setShowVideoModal(true); }}
            className="flex items-center gap-1.5 text-xs text-fuchsia-400/80 hover:text-fuchsia-300 transition-colors font-mono cursor-pointer"
          >
            <Compass className="w-4 h-4 text-fuchsia-400 animate-pulse" />
            HỌC MÀU SẮC (PHÍM B)
          </button>
          <button
            onClick={() => { audio.playClick(); setShowColorChart(true); }}
            className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors font-mono cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            BẢNG PHA MÀU (PHÍM C)
          </button>
        </div>

        {/* Instruction Modal */}
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => { audio.playClick(); setShowGuide(false); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                Kết nối Meta Quest Browser
              </h2>
              
              <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-200 mb-1">Cách 1: Deploy Vercel (Khuyên dùng)</h3>
                  <p>1. Deploy dự án Next.js lên Vercel chỉ với 1 click.</p>
                  <p>2. Mở trình duyệt <strong>Meta Quest Browser</strong> trên kính.</p>
                  <p>3. Truy cập đường dẫn URL của Vercel (bắt buộc phải là <code className="text-cyan-400">https://...</code>).</p>
                  <p>4. Bấm nút <strong>"VÀO PHÒNG THÍ NGHIỆM VR"</strong> và đeo kính để trải nghiệm.</p>
                </div>
                
                <hr className="border-slate-800" />
                
                <div>
                  <h3 className="font-bold text-slate-200 mb-1">Cách 2: Chạy Local HTTPS (Mạng LAN)</h3>
                  <p>1. PC và kính Meta Quest vào cùng một mạng Wi-Fi LAN.</p>
                  <p>2. Chạy server phát cổng HTTPS công khai bằng cách sử dụng công cụ như <code className="text-cyan-400">ngrok http 3000</code> hoặc công cụ tạo proxy SSL tự ký.</p>
                  <p>3. Nhập địa chỉ HTTPS được tạo ra vào trình duyệt Meta Quest Browser trên kính để load game.</p>
                </div>
                
                <hr className="border-slate-800" />
                
                <div>
                  <h3 className="font-bold text-slate-200 mb-2">Cách tương tác trong VR:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Bằng Tay không (Hand Tracking):</strong> Hướng ngón trỏ và ngón cái vào quả bóng màu, thực hiện cử chỉ <strong>Pinch (gấp hai ngón lại)</strong> để nhặt bóng, di chuyển và thả ra tại các giỏ màu tương ứng.</li>
                    <li><strong>Bằng Controller:</strong> Hướng tia laser từ tay cầm vào quả bóng màu, nhấn giữ nút <strong>Trigger (cò súng)</strong> hoặc nút <strong>Grip</strong> bên hông để nhặt và thả bóng.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Render Video Modal */}
        {showVideoModal && renderVideoModal()}
        {/* Render Color Chart Modal */}
        {showColorChart && renderColorChartModal()}
      </div>
    );
  }

  // Render HUD overlay during active gameplay (only visible outside VR or as supplementary dashboard overlay)
  if (gameState === "playing" && !isVRActive) {
    return (
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6 select-none font-sans">
        {/* Top Header Panel */}
        <div className="w-full flex justify-between items-start">
          <div className="pointer-events-auto flex flex-col gap-1.5 p-4 rounded-xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-md shadow-lg">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              Thí nghiệm hiện tại
            </div>
            <div className="text-base font-bold text-cyan-400">
              Lớp {level}: {getLevelName(level)}
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tiến độ: {correctCount} / {totalCount} đúng màu
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-3">
            {/* Score Tracker */}
            <div className="flex flex-col items-center px-4 py-2 rounded-xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-center">
              <Award className="w-4 h-4 text-yellow-400 mb-0.5" />
              <span className="text-[10px] font-mono text-slate-400 uppercase">Điểm số</span>
              <span className="text-lg font-black text-yellow-400 font-mono leading-none">{score}</span>
            </div>

            {/* Timer for Hard Mode */}
            {gameMode === "hard" && (
              <div className={`flex flex-col items-center px-4 py-2 rounded-xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-center ${timeLeft < 15 ? "border-rose-500/50 bg-rose-950/40 text-rose-400 animate-pulse" : ""}`}>
                <Clock className="w-4 h-4 text-rose-400 mb-0.5" />
                <span className="text-[10px] font-mono text-slate-400 uppercase">Thời gian</span>
                <span className="text-lg font-black font-mono leading-none">{timeLeft}s</span>
              </div>
            )}

            {/* Control buttons */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { audio.playClick(); resetLevel(); }}
                className="pointer-events-auto p-2 rounded-lg border border-slate-800 bg-slate-950/90 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-900"
                title="Chơi lại màn này"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { audio.playClick(); resetGame(); }}
                className="pointer-events-auto p-2 rounded-lg border border-slate-800 bg-slate-950/90 text-rose-400 hover:text-rose-300 transition-all hover:bg-slate-900"
                title="Thoát phòng thí nghiệm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom instructions panel for PC Web mode */}
        <div className="w-full max-w-md mx-auto pointer-events-auto p-4 rounded-xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-center shadow-lg mb-2">
          <p className="text-xs text-slate-300">
            💻 <strong>Chơi trên PC:</strong> Dùng chuột click và kéo bóng màu đặt vào các giỏ màu tương ứng ở phía sau bàn.
          </p>
          <div className="flex justify-center gap-3 mt-2 flex-wrap">
            <button
              onClick={toggleColorBlind}
              className={`text-[10px] font-semibold px-2 py-1 rounded border transition-all ${isColorBlindMode ? "bg-amber-500/20 border-amber-400 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
            >
              Ký hiệu mù màu: {isColorBlindMode ? "Bật" : "Tắt"}
            </button>
            <button
              onClick={toggleSound}
              className={`text-[10px] font-semibold px-2 py-1 rounded border transition-all ${soundOn ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
            >
              Âm thanh: {soundOn ? "Bật" : "Tắt"}
            </button>
            <button
              onClick={() => { audio.playClick(); setShowVideoModal(true); }}
              className="text-[10px] font-semibold px-2 py-1 rounded border border-fuchsia-500/30 bg-fuchsia-900/10 text-fuchsia-300 hover:bg-fuchsia-900/30 transition-all"
            >
              📖 Học Màu (Phím B)
            </button>
          </div>

          {/* Level Complete / Next Level Trigger (2D web fallback) */}
          {isLevelComplete && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 animate-bounce">
              <p className="text-sm font-bold text-emerald-400">✨ Chúc mừng! Đã khớp đúng toàn bộ màu! ✨</p>
              <button
                onClick={() => { audio.playLevelUp(); nextLevel(); }}
                className="mt-2 px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
              >
                {level < 3 ? "Mở khóa Lớp tiếp theo" : "Chiến thắng chung cuộc!"}
              </button>
            </div>
          )}
        </div>
        {/* Render Video Modal */}
        {showVideoModal && renderVideoModal()}
        {/* Render Color Chart Modal */}
        {showColorChart && renderColorChartModal()}
      </div>
    );
  }

  // VR Active overlay is handled globally above

  // Render Victory or Game Over Screens
  if (gameState === "victory" || gameState === "gameover") {
    const isVic = gameState === "victory";
    if (isVic) {
      // Tích hợp pháo hoa nếu là victory
      if (typeof window !== "undefined") {
        import("canvas-confetti").then((conf) => {
          conf.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        });
      }
    }

    return (
      <div className="z-10 flex min-h-screen w-full flex-col items-center justify-center p-6 select-none relative">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/75 p-8 backdrop-blur-xl shadow-2xl text-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-[2px] ${isVic ? "bg-emerald-500" : "bg-rose-600"}`} />
          
          <div className="mb-6 flex justify-center">
            {isVic ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-4xl animate-bounce">
                🏆
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 text-4xl animate-pulse">
                ⏰
              </div>
            )}
          </div>

          <h2 className={`text-3xl font-black mb-2 ${isVic ? "text-emerald-400 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]" : "text-rose-500 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.25)]"}`}>
            {isVic ? "THÍ NGHIỆM THÀNH CÔNG!" : "HẾT THỜI GIAN!"}
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
            {isVic 
              ? "Bạn đã xuất sắc phân loại chính xác toàn bộ màu sắc thuộc cả 3 cấp độ trong thời gian quy định!"
              : "Bạn đã không kịp sắp xếp các quả bóng màu vào đúng vị trí trước khi Chroma Core quá tải."}
          </p>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 mb-6 flex justify-around items-center">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono">Cấp độ đạt được</span>
              <span className="text-base font-bold text-slate-200">Lớp {level}/3</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800" />
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono">Tổng điểm số</span>
              <span className="text-xl font-black text-yellow-400 font-mono">{score}</span>
            </div>
          </div>

          <button
            onClick={() => { audio.playClick(); resetGame(); }}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
              isVic
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-500/10 hover:shadow-emerald-500/20"
                : "bg-gradient-to-r from-rose-600 to-orange-500 shadow-rose-500/10 hover:shadow-rose-500/20"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            QUAY LẠI PHÒNG CHỜ
          </button>
        </div>
        {/* Render Video Modal */}
        {showVideoModal && renderVideoModal()}
        {/* Render Color Chart Modal */}
        {showColorChart && renderColorChartModal()}
      </div>
    );
  }

  return null;
}
