// Block type display constants — ported from v1 active/page.tsx block render (L3250-3270).
// v1 per-type color map: bg/border/text + chip bg + chip icon.
// v1 block type `strength` maps to v2 `work` (blue + Dumbbell).
// v2 `cooldown` gets purple treatment (not in v1).

import { Flame, Dumbbell, Zap, Heart, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { BlockType } from "@/types";
import type { BlockKind, StraightBlockType } from "../types";

export interface BlockTypeMeta {
  value: BlockType;
  label: string;
  icon: ReactNode;
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  { value: "warmup", label: "Warm-up", icon: <Flame className="h-4 w-4 text-yellow-500" /> },
  { value: "work", label: "Strength", icon: <Dumbbell className="h-4 w-4 text-blue-500" /> },
  { value: "circuit", label: "Circuit", icon: <Zap className="h-4 w-4 text-orange-500" /> },
  { value: "cardio", label: "Cardio", icon: <Heart className="h-4 w-4 text-green-500" /> },
  { value: "cooldown", label: "Cool-down", icon: <RotateCcw className="h-4 w-4 text-purple-500" /> },
];

export interface BlockStyles {
  border: string;
  accent: string;
  badge: string;
  bg: string;
  text: string;
  chipBg: string;
  chipIcon: ReactNode;
}

export function getBlockStyles(type: BlockType): BlockStyles {
  switch (type) {
    case "warmup":
      return {
        border: "border-yellow-500/50",
        accent: "bg-yellow-400",
        badge: "bg-yellow-100 text-yellow-700",
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        chipBg: "bg-yellow-400",
        chipIcon: <Flame className="w-3 h-3 text-white" />,
      };
    case "work":
      return {
        border: "border-blue-500/50",
        accent: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700",
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        chipBg: "bg-blue-500",
        chipIcon: <Dumbbell className="w-3 h-3 text-white" />,
      };
    case "circuit":
      return {
        border: "border-orange-500/50",
        accent: "bg-orange-400",
        badge: "bg-orange-100 text-orange-700",
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        chipBg: "bg-orange-400",
        chipIcon: <Zap className="w-3 h-3 text-white" />,
      };
    case "cardio":
      return {
        border: "border-green-500/50",
        accent: "bg-green-400",
        badge: "bg-green-100 text-green-700",
        bg: "bg-green-500/10",
        text: "text-green-400",
        chipBg: "bg-rose-400",
        chipIcon: <Heart className="w-3 h-3 text-white" />,
      };
    case "cooldown":
      return {
        border: "border-purple-500/50",
        accent: "bg-purple-400",
        badge: "bg-purple-100 text-purple-700",
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        chipBg: "bg-purple-400",
        chipIcon: <RotateCcw className="w-3 h-3 text-white" />,
      };
    default:
      return {
        border: "border-blue-500/50",
        accent: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700",
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        chipBg: "bg-blue-500",
        chipIcon: <Dumbbell className="w-3 h-3 text-white" />,
      };
  }
}

const KIND_TO_TYPE: Record<BlockKind, BlockType> = {
  straight: "work",
  superset: "work",
  circuit: "circuit",
  cardio: "cardio",
};

export function getBlockStylesFromKind(kind: BlockKind): BlockStyles {
  return getBlockStyles(KIND_TO_TYPE[kind] ?? "work");
}

// v1-parity: a straight block is a TYPED container (warmup / strength / cooldown).
// Its coloured card + chip + title come from the same per-type map used everywhere else
// (strength → v2 `work` = blue/Dumbbell; warmup = yellow/Flame; cooldown = purple).
const STRAIGHT_TYPE_TO_BLOCK_TYPE: Record<StraightBlockType, BlockType> = {
  warmup: "warmup",
  strength: "work",
  cooldown: "cooldown",
};

const STRAIGHT_TYPE_LABEL: Record<StraightBlockType, string> = {
  warmup: "Warm-Up",
  strength: "Strength",
  cooldown: "Cool-Down",
};

export function getStraightBlockStyles(blockType: StraightBlockType): BlockStyles {
  return getBlockStyles(STRAIGHT_TYPE_TO_BLOCK_TYPE[blockType] ?? "work");
}

export function getStraightBlockLabel(blockType: StraightBlockType): string {
  return STRAIGHT_TYPE_LABEL[blockType] ?? "Strength";
}

export function getBlockTypeMeta(type: BlockType): BlockTypeMeta | undefined {
  return BLOCK_TYPES.find((bt) => bt.value === type);
}
