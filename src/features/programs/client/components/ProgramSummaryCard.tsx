"use client";

// Program summary header: name, phase · goal, schedule mode, and the
// days/workouts/exercises tallies. Also carries the trainer-relationship CTA
// (Edit if self-authored, Message trainer if trainer-assigned).

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, MessageCircle } from "lucide-react";
import { GOAL_LABELS, PHASE_LABELS } from "../../constants";
import type { ClientProgram } from "../../types";

function countExercises(program: ClientProgram): number {
  return program.weeklyPlan.reduce(
    (sum, day) =>
      sum + day.blocks.reduce((s, b) => s + b.exercises.length, 0),
    0,
  );
}

export function ProgramSummaryCard({
  program,
  isSelfAuthored,
  trainerName,
  onEdit,
  onMessageTrainer,
}: {
  program: ClientProgram;
  isSelfAuthored: boolean;
  trainerName?: string;
  onEdit: () => void;
  onMessageTrainer: () => void;
}) {
  const showMessageTrainer = !!program.trainerId && !isSelfAuthored;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{program.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {PHASE_LABELS[program.phase] ?? program.phase}
            {" · "}
            {GOAL_LABELS[program.goal] ?? program.goal.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSelfAuthored && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-sky-500/30 text-sky-600 hover:bg-sky-500/10"
              onClick={onEdit}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          <Badge className="text-[10px] bg-emerald-500/20 text-emerald-600 border-0">
            Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-sky-600">
            {program.trainingDaysPerWeek || program.weeklyPlan.length}
          </p>
          <p className="text-[10px] text-gray-500">Days/Week</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-purple-600">{program.weeklyPlan.length}</p>
          <p className="text-[10px] text-gray-500">Workouts</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-600">{countExercises(program)}</p>
          <p className="text-[10px] text-gray-500">Exercises</p>
        </div>
      </div>

      {program.scheduleMode === "fixed" && program.selectedDays.length > 0 && (
        <p className="text-xs text-gray-500 capitalize">
          {program.selectedDays.join(", ")}
        </p>
      )}

      {showMessageTrainer && (
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
          onClick={onMessageTrainer}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Message {trainerName || "trainer"}
        </Button>
      )}
    </div>
  );
}
