'use client';

// ProgramBuilder.tsx — Program builder wizard shell (w2a)
// Three-step wizard: Setup → Build Days → Schedule
// w2a: shell + Setup; w2b-1: Build Days; w2c-1: Schedule + Save/Activate

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SetupStep, type SetupData } from './steps/SetupStep';
import { BuildDaysStep } from './steps/BuildDaysStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { SaveActivateDialog } from './dialogs/SaveActivateDialog';
import { DAY_LABEL_PRESETS, DEFAULT_SCHEDULE } from '../constants';
import { useProgramsStore } from '../store';
import { assignProgramToClient } from '../api/assign';
import { useSession } from '@/features/auth';
import type { ClientProgram, ProgramDay } from '../types';

type BuilderStep = 'setup' | 'days' | 'schedule';

interface ProgramBuilderProps {
  isTrainerMode: boolean;
}

export function ProgramBuilder({ isTrainerMode }: ProgramBuilderProps) {
  const router = useRouter();
  const { user } = useSession();
  const [builderStep, setBuilderStep] = useState<BuilderStep>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    setDays,
    resetBuilder,
    builderDays,
    builderScheduleMode,
    builderSelectedDays,
    builderTrainingFrequency,
    builderSessionPTMap,
    builderStartDate,
    upsertClientProgram,
  } = useProgramsStore();

  const handleSetupContinue = (data: SetupData) => {
    setSetupData(data);
    initializeDays(data.daysPerWeek);
    setBuilderStep('days');
  };

  const initializeDays = (daysPerWeek: number) => {
    const labels = DAY_LABEL_PRESETS[daysPerWeek] || [];
    const schedule = DEFAULT_SCHEDULE[daysPerWeek] || [];
    const days: ProgramDay[] = labels.map((label, i) => ({
      id: crypto.randomUUID(),
      label,
      scheduledDay: schedule[i],
      blocks: [],
    }));

    resetBuilder();
    setDays(days);
  };

  const handleDaysContinue = () => {
    setBuilderStep('schedule');
  };

  const handleScheduleBack = () => {
    setBuilderStep('days');
  };

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const actualWeeks =
    setupData?.durationWeeks === 0
      ? parseInt(setupData?.customWeeks || '4')
      : setupData?.durationWeeks || 4;

  const effectiveFrequency =
    builderScheduleMode === 'flexible'
      ? builderTrainingFrequency
      : builderSelectedDays.length || builderDays.length;

  const totalSessions = actualWeeks * effectiveFrequency;

  const handleConfirmSave = async (clientId: string | null) => {
    if (!user) return;
    if (!setupData) return;

    // Trainer-mode guard: must have a client selected (port v1 L712)
    if (isTrainerMode && !clientId) {
      toast.error('Pick a client to assign this program to.');
      return;
    }

    const targetClientId = isTrainerMode ? clientId! : user.id;

    // Serialize builderDays into the canonical w1 ProgramDay[] shape.
    // The builder store uses the same ProgramDay/ProgramBlock/ProgramExercise
    // types as the w1 ClientProgram, so this is a direct mapping (no divergent
    // shape). For fixed mode, assign scheduledDay from the selected weekdays
    // (cycling if more days than workouts); for flexible, strip scheduledDay.
    const weeklyPlan: ProgramDay[] = builderDays.map((d, i) => ({
      id: d.id,
      label: d.label,
      scheduledDay:
        builderScheduleMode === 'fixed'
          ? builderSelectedDays[i % builderSelectedDays.length]
          : undefined,
      blocks: d.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        name: b.name,
        exercises: b.exercises.map((e) => ({
          id: e.id,
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          movementPattern: e.movementPattern,
          sets: e.sets,
          reps: e.reps,
          rest: e.rest,
          repType: e.repType,
          setStyle: e.setStyle,
          tempo: e.tempo,
          notes: e.notes,
        })),
      })),
    }));

    const effectiveDays =
      builderScheduleMode === 'fixed' ? builderSelectedDays : [];

    const endDate = (() => {
      const start = new Date(builderStartDate);
      start.setDate(start.getDate() + actualWeeks * 7);
      return start.toISOString().split('T')[0];
    })();

    const program: ClientProgram = {
      id: crypto.randomUUID(),
      clientId: targetClientId,
      trainerId: user.id,
      name: setupData.programName || 'Custom Program',
      status: 'active',
      phase: setupData.phase,
      goal: setupData.goal,
      weeklyPlan,
      scheduleMode: builderScheduleMode,
      trainingDaysPerWeek: effectiveFrequency,
      selectedDays: effectiveDays,
      cycleAcrossWeeks: effectiveFrequency > builderDays.length,
      sessionPTMap: builderSessionPTMap,
      nextWorkoutIndex: 0,
      autoRepeat: setupData.autoRepeat,
      startDate: builderStartDate,
      endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const result = await assignProgramToClient(program);
      if (!result.ok) {
        throw result.error;
      }
      // Optimistic local upsert after confirmed write
      upsertClientProgram(result.data);

      // TODO(box-3): generate calendar events from scheduleMode/selectedDays.
      // v1 wrote calendar_events here (L799–867) but Box 3 (Calendar) owns the
      // canonical "scheduled session" object and isn't built yet. We persist
      // scheduleMode + selectedDays on the client_programs row so Box 3 can
      // generate events later from one source of truth. "Up Next" still works
      // via w1 getNextProgramWorkout (reads the program + scheduleMode).

      setShowSaveDialog(false);
      toast.success(`Program created! ${totalSessions} sessions scheduled.`);

      // Redirect: self → /program; trainer → /clients/[id]
      if (isTrainerMode) {
        router.push(`/clients/${targetClientId}`);
      } else {
        router.push('/program');
      }
    } catch (err) {
      // Save failure: keep dialog open + precise toast (port v1 behaviour)
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to save program: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Steps UI */}
        <div className="mb-8 flex items-center gap-2">
          {[
            { key: 'setup', label: 'Setup' },
            { key: 'days', label: 'Build Days' },
            { key: 'schedule', label: 'Schedule' },
          ].map(({ key, label }, index) => {
            const steps = ['setup', 'days', 'schedule'];
            const currentIndex = steps.indexOf(builderStep);
            const isActive = index <= currentIndex;

            return (
              <div key={key} className="flex-1">
                <div
                  className={`h-1 rounded-full mb-1 ${
                    isActive ? 'bg-sky-500' : 'bg-gray-300'
                  }`}
                />
                <span
                  className={`text-xs ${
                    isActive ? 'text-sky-600 font-medium' : 'text-gray-500'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        {builderStep === 'setup' && (
          <SetupStep
            isTrainerMode={isTrainerMode}
            onContinue={handleSetupContinue}
          />
        )}
        {builderStep === 'days' && (
          <BuildDaysStep
            onContinue={handleDaysContinue}
            onBack={() => setBuilderStep('setup')}
          />
        )}
        {builderStep === 'schedule' && (
          <ScheduleStep
            isTrainerMode={isTrainerMode}
            programName={setupData?.programName || ''}
            durationWeeks={actualWeeks}
            onBack={handleScheduleBack}
            onSave={handleSaveClick}
          />
        )}
      </div>

      {/* Save/Activate Dialog */}
      <SaveActivateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        isTrainerMode={isTrainerMode}
        totalSessions={totalSessions}
        durationWeeks={actualWeeks}
        onConfirm={handleConfirmSave}
        saving={saving}
      />
    </div>
  );
}
