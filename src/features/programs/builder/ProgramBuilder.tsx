'use client';

// ProgramBuilder.tsx — Program builder wizard shell (w2a)
// Three-step wizard: Setup → Build Days → Schedule
// w2a delivers: shell + Setup fully working; steps 2+3 are placeholders

import { useState } from 'react';
import { SetupStep, type SetupData } from './steps/SetupStep';
import { BuildDaysStep } from './steps/BuildDaysStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { DAY_LABEL_PRESETS, DEFAULT_SCHEDULE } from '../constants';
import { useProgramsStore } from '../store';
import type { ProgramDay } from '../types';

type BuilderStep = 'setup' | 'days' | 'schedule';

interface ProgramBuilderProps {
  isTrainerMode: boolean;
}

export function ProgramBuilder({ isTrainerMode }: ProgramBuilderProps) {
  const [builderStep, setBuilderStep] = useState<BuilderStep>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const { setDays, resetBuilder } = useProgramsStore();

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

  const handleSave = () => {
    // TODO(w2c): Persist to saved_programs table
    console.log('Save program (w2c)');
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
          <ScheduleStep onBack={handleScheduleBack} onSave={handleSave} />
        )}
      </div>
    </div>
  );
}
