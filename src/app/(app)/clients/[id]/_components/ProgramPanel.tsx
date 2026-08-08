"use client";

/**
 * Program tab.
 *
 * The Programs section moved here unchanged from `page.tsx:208-298`. v1's
 * equivalent is the Program tab at `v1: src/app/clients/[id]/page.tsx:2433-2764`.
 *
 * Rows 34-42 (assign/change/delete program, clickable day rows → day detail,
 * schedule info, client calendar, Book PT) stay MISSING for lane L4. The day rows
 * below are deliberately NOT clickable — that is row 35, L4's work.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Dumbbell } from "lucide-react";
import type { ClientProgram } from "@/features/programs";

export function ProgramPanel({ programs }: { programs: ClientProgram[] }) {
  const activeProgram = programs.find((p) => p.status === "active");
  const pastPrograms = programs.filter((p) => p.id !== activeProgram?.id);

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Programs
      </h2>

      {activeProgram ? (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-rose-500" />
                <span className="font-semibold text-gray-900">
                  {activeProgram.name}
                </span>
              </div>
              <Badge className="bg-rose-500/10 text-rose-500 capitalize">
                {activeProgram.phase}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Days per week</p>
                <p className="font-medium text-gray-900">
                  {activeProgram.weeklyPlan.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Schedule mode</p>
                <p className="font-medium text-gray-900 capitalize">
                  {activeProgram.scheduleMode}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-200">
              {activeProgram.weeklyPlan.map((day, i) => (
                <div
                  key={day.id ?? i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-700">
                    <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
                    {day.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {day.blocks?.reduce(
                      (sum, b) => sum + (b.exercises?.length ?? 0),
                      0,
                    ) || 0}{" "}
                    exercises
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No active program</p>
            <p className="text-xs text-gray-400 mt-1">
              Assign a program from the Builder
            </p>
          </CardContent>
        </Card>
      )}

      {pastPrograms.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-gray-500 mb-2">Past Programs</p>
          {pastPrograms.map((prog) => (
            <div
              key={prog.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <div>
                <p className="text-sm text-gray-700">{prog.name}</p>
                <p className="text-[10px] text-gray-500 capitalize">
                  {prog.status} • {prog.weeklyPlan?.length ?? 0} days/week
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
