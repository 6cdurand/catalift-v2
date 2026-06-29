// Block type display constants — ported from v1 WorkoutDayBuilder BLOCK_TYPES + getBlockStyles.
// Adapted to v2 light theme tokens (white card bg, colored left border + badge).

import { Flame, Dumbbell, Target, Heart, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { BlockType } from "@/types";

export interface BlockTypeMeta {
  value: BlockType;
  label: string;
  icon: ReactNode;
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  { value: "warmup", label: "Warm-up", icon: <Flame className="h-4 w-4 text-amber-500" /> },
  { value: "work", label: "Strength", icon: <Dumbbell className="h-4 w-4 text-blue-500" /> },
  { value: "circuit", label: "Circuit", icon: <Target className="h-4 w-4 text-orange-500" /> },
  { value: "cardio", label: "Cardio", icon: <Heart className="h-4 w-4 text-green-500" /> },
  { value: "cooldown", label: "Cool-down", icon: <RotateCcw className="h-4 w-4 text-purple-500" /> },
];

export interface BlockStyles {
  border: string;
  accent: string;
  badge: string;
}

export function getBlockStyles(type: BlockType): BlockStyles {
  switch (type) {
    case "warmup":
      return {
        border: "border-amber-300",
        accent: "bg-amber-400",
        badge: "bg-amber-100 text-amber-700",
      };
    case "work":
      return {
        border: "border-blue-300",
        accent: "bg-blue-400",
        badge: "bg-blue-100 text-blue-700",
      };
    case "circuit":
      return {
        border: "border-orange-300",
        accent: "bg-orange-400",
        badge: "bg-orange-100 text-orange-700",
      };
    case "cardio":
      return {
        border: "border-green-300",
        accent: "bg-green-400",
        badge: "bg-green-100 text-green-700",
      };
    case "cooldown":
      return {
        border: "border-purple-300",
        accent: "bg-purple-400",
        badge: "bg-purple-100 text-purple-700",
      };
    default:
      return {
        border: "border-gray-300",
        accent: "bg-gray-400",
        badge: "bg-gray-100 text-gray-700",
      };
  }
}

export function getBlockTypeMeta(type: BlockType): BlockTypeMeta | undefined {
  return BLOCK_TYPES.find((bt) => bt.value === type);
}
