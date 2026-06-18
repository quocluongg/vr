"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type GameMode = "easy" | "hard";
export type GameState = "menu" | "playing" | "victory" | "gameover";

export interface ColorData {
  id: string;
  nameVi: string;
  nameEn: string;
  hex: string;
  symbol: string; // Color-blind helper symbol
  level: number;  // 1: Primary, 2: Secondary, 3: Tertiary
  components?: string[]; // IDs of colors that mix to form this
}

export const ALL_COLORS: ColorData[] = [
  // Level 1: Primary
  { id: "red", nameVi: "Đỏ", nameEn: "Red", hex: "#EF4444", symbol: "▲", level: 1 },
  { id: "yellow", nameVi: "Vàng", nameEn: "Yellow", hex: "#FBBF24", symbol: "■", level: 1 },
  { id: "blue", nameVi: "Lam", nameEn: "Blue", hex: "#3B82F6", symbol: "●", level: 1 },

  // Level 2: Secondary
  { id: "orange", nameVi: "Cam", nameEn: "Orange", hex: "#F97316", symbol: "▲■", level: 2, components: ["red", "yellow"] },
  { id: "green", nameVi: "Lục", nameEn: "Green", hex: "#22C55E", symbol: "■●", level: 2, components: ["yellow", "blue"] },
  { id: "purple", nameVi: "Tím", nameEn: "Purple", hex: "#8B5CF6", symbol: "▲●", level: 2, components: ["red", "blue"] },

  // Level 3: Tertiary
  { id: "red-orange", nameVi: "Đỏ-Cam", nameEn: "Red-Orange", hex: "#EA580C", symbol: "▲▲■", level: 3, components: ["red", "orange"] },
  { id: "yellow-orange", nameVi: "Vàng-Cam", nameEn: "Yellow-Orange", hex: "#F59E0B", symbol: "■▲■", level: 3, components: ["yellow", "orange"] },
  { id: "yellow-green", nameVi: "Vàng-Lục", nameEn: "Yellow-Green", hex: "#84CC16", symbol: "■■●", level: 3, components: ["yellow", "green"] },
  { id: "blue-green", nameVi: "Lam-Lục", nameEn: "Blue-Green", hex: "#06B6D4", symbol: "●■●", level: 3, components: ["blue", "green"] },
  { id: "blue-purple", nameVi: "Lam-Tím", nameEn: "Blue-Purple", hex: "#6366F1", symbol: "●▲●", level: 3, components: ["blue", "purple"] },
  { id: "red-purple", nameVi: "Đỏ-Tím", nameEn: "Red-Purple", hex: "#D946EF", symbol: "▲▲●", level: 3, components: ["red", "purple"] },
];

interface GameContextType {
  level: number;
  setLevel: (lvl: number) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  isVRActive: boolean;
  setIsVRActive: (active: boolean) => void;
  score: number;
  setScore: (score: number) => void;
  timeLeft: number;
  setTimeLeft: (time: number) => void;
  isColorBlindMode: boolean;
  setIsColorBlindMode: (active: boolean) => void;
  soundOn: boolean;
  setSoundOn: (active: boolean) => void;
  placedColors: Record<string, string>; // slotId -> colorId
  placeColor: (slotId: string, colorId: string) => boolean; // returns true if correct
  removeColor: (slotId: string) => void;
  resetLevel: () => void;
  nextLevel: () => void;
  resetGame: () => void;
  targetColors: ColorData[];
  isLevelComplete: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [level, setLevelState] = useState<number>(1);
  const [gameMode, setGameMode] = useState<GameMode>("easy");
  const [gameState, setGameState] = useState<GameState>("menu");
  const [isVRActive, setIsVRActive] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isColorBlindMode, setIsColorBlindMode] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [placedColors, setPlacedColors] = useState<Record<string, string>>({});

  // Colors that need to be placed for the current level
  const targetColors = ALL_COLORS.filter((c) => c.level <= level);

  const isLevelComplete =
    targetColors.length > 0 &&
    targetColors.every((color) => placedColors[color.id] === color.id);

  // Handle Level Change
  const setLevel = (lvl: number) => {
    setLevelState(lvl);
    setPlacedColors({});
    if (gameMode === "hard") {
      setTimeLeft(lvl === 1 ? 60 : lvl === 2 ? 100 : 150);
    }
  };

  // Timer for Hard Mode
  useEffect(() => {
    if (gameState !== "playing" || gameMode !== "hard") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameMode]);

  // Place Color in Slot
  const placeColor = (slotId: string, colorId: string): boolean => {
    // Check if correct placement (slotId must match colorId)
    const isCorrect = slotId === colorId;
    if (isCorrect) {
      setPlacedColors((prev) => ({ ...prev, [slotId]: colorId }));
      setScore((prev) => prev + (gameMode === "hard" ? 20 : 10));
    }
    return isCorrect;
  };

  // Remove Color from Slot
  const removeColor = (slotId: string) => {
    setPlacedColors((prev) => {
      const copy = { ...prev };
      delete copy[slotId];
      return copy;
    });
  };

  // Reset current level
  const resetLevel = () => {
    setPlacedColors({});
    if (gameMode === "hard") {
      setTimeLeft(level === 1 ? 60 : level === 2 ? 100 : 150);
    }
    setGameState("playing");
  };

  // Move to Next Level or Finish
  const nextLevel = () => {
    if (level < 3) {
      setLevel(level + 1);
      setGameState("playing");
    } else {
      setGameState("victory");
    }
  };

  // Reset Game
  const resetGame = () => {
    setLevelState(1);
    setScore(0);
    setPlacedColors({});
    setGameState("menu");
    setIsVRActive(false);
    if (gameMode === "hard") {
      setTimeLeft(60);
    }
  };

  return (
    <GameContext.Provider
      value={{
        level,
        setLevel,
        gameMode,
        setGameMode,
        gameState,
        setGameState,
        isVRActive,
        setIsVRActive,
        score,
        setScore,
        timeLeft,
        setTimeLeft,
        isColorBlindMode,
        setIsColorBlindMode,
        soundOn,
        setSoundOn,
        placedColors,
        placeColor,
        removeColor,
        resetLevel,
        nextLevel,
        resetGame,
        targetColors,
        isLevelComplete,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
