'use client';

// ScheduleStep.tsx — Program builder Step 3: Schedule (w2c-1)
// Ported from v1 program/builder/page.tsx L1257–L1457.
// Uses the w1 programs store as single source of truth for schedule state.

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, RefreshCw, Save } from 'lucide-react';
import { WEEKDAYS } from '../../constants';
import { useProgramsStore } from '../../store';
import type { Weekday } from '../../types';

interface ScheduleStepProps {
  isTrainerMode: boolean;
  programName: string;
  durationWeeks: number;
  onBack: () => void;
  onSave: () => void;
}

export function ScheduleStep({
  isTrainerMode,
  programName,
  durationWeeks,
  onBack,
  onSave,
}: ScheduleStepProps) {
  const {
    builderDays: days,
    builderScheduleMode: scheduleMode,
    builderSelectedDays: fixedDays,
    builderTrainingFrequency: trainingFrequency,
    builderSessionPTMap: sessionPTMap,
    builderStartDate: startDate,
    setScheduleMode,
    toggleSelectedDay,
    setTrainingFrequency,
    toggleSessionPT,
    setBuilderStartDate,
  } = useProgramsStore();

  const allDaysTotalEx = days.reduce(
    (s, d) => s + d.blocks.reduce((s2, b) => s2 + b.exercises.length, 0),
    0,
  );

  const effectiveFrequency =
    scheduleMode === 'flexible'
      ? trainingFrequency
      : fixedDays.length || days.length;

  const totalSessions = durationWeeks * effectiveFrequency;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Schedule mode selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`p-3 rounded-xl border text-left transition-all ${
            scheduleMode === 'fixed'
              ? 'border-sky-500 bg-sky-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => setScheduleMode('fixed')}
        >
          <Calendar className="w-5 h-5 text-sky-500 mb-1" />
          <p className="text-sm font-medium">Fixed Days</p>
          <p className="text-[10px] text-gray-500">Repeat every week on set days</p>
        </button>
        <button
          className={`p-3 rounded-xl border text-left transition-all ${
            scheduleMode === 'flexible'
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => setScheduleMode('flexible')}
        >
          <RefreshCw className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-sm font-medium">Flexible</p>
          <p className="text-[10px] text-gray-500">Do workouts on any day — shows as &quot;Next Workout&quot;</p>
        </button>
      </div>

      {/* Fixed mode: weekday picker + session preview */}
      {scheduleMode === 'fixed' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Training Days</Label>
              <p className="text-[10px] text-gray-500 mb-2">
                Pick which days the client trains. Workouts cycle across these days.
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((wd) => {
                  const isSelected = fixedDays.includes(wd);
                  return (
                    <button
                      key={wd}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => toggleSelectedDay(wd as Weekday)}
                    >
                      {wd.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
            {fixedDays.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Session Schedule Preview</Label>
                <p className="text-[10px] text-gray-500">
                  {fixedDays.length} training days, cycling through {days.length} workouts
                  {fixedDays.length > days.length && ' (pattern shifts each week)'}
                </p>
                <div className="space-y-1.5">
                  {fixedDays.map((wd, slotIdx) => {
                    const workoutIdx = slotIdx % days.length;
                    const isPT = sessionPTMap[slotIdx] === 'pt';
                    return (
                      <div
                        key={wd}
                        className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-xs text-gray-500 capitalize w-12">
                          {wd.slice(0, 3)}
                        </span>
                        <span className="text-sm flex-1">
                          {days[workoutIdx]?.label || 'Workout'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSessionPT(slotIdx)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            isPT
                              ? 'bg-sky-500 text-white'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {isPT ? 'PT' : 'Personal'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flexible mode: frequency + session preview */}
      {scheduleMode === 'flexible' && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <RefreshCw className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Flexible Schedule</p>
                <p className="text-xs text-gray-500">
                  Workouts cycle in order. Client sees &quot;Next Workout&quot; and does it on any day.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm shrink-0">Frequency</Label>
              <Select
                value={String(trainingFrequency)}
                onValueChange={(v) => setTrainingFrequency(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}×/wk
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-500">
                cycling {days.length} workouts
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Weekly Sessions</Label>
              <p className="text-[10px] text-gray-500 mb-1">
                Set each session as PT or Personal
              </p>
              {Array.from({ length: trainingFrequency }, (_, slotIdx) => {
                const workoutIdx = slotIdx % days.length;
                const isPT = sessionPTMap[slotIdx] === 'pt';
                return (
                  <div
                    key={slotIdx}
                    className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xs text-gray-500 w-6">{slotIdx + 1}.</span>
                    <span className="text-sm flex-1">
                      {days[workoutIdx]?.label || 'Workout'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {days[workoutIdx]?.blocks.reduce(
                        (s, b) => s + b.exercises.length,
                        0,
                      ) || 0}{' '}
                      ex
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSessionPT(slotIdx)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                        isPT
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {isPT ? 'PT' : 'Personal'}
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start date + summary */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setBuilderStartDate(e.target.value)}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg space-y-1">
            <p className="text-sm font-medium">Program Summary</p>
            <p className="text-xs text-gray-500">{programName}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="text-[10px] bg-sky-100 text-sky-700 border-0">
                {effectiveFrequency}×/wk
              </Badge>
              <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0">
                {durationWeeks} weeks
              </Badge>
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">
                {allDaysTotalEx} exercises
              </Badge>
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">
                {totalSessions} sessions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom bar */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
          onClick={onSave}
        >
          <Save className="w-4 h-4 mr-2" />
          {isTrainerMode ? 'Assign to Client' : 'Activate Program'}
        </Button>
      </div>
    </div>
  );
}
