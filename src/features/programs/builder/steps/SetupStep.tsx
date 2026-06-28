'use client';

// SetupStep.tsx — Program builder Step 1: Setup (w2a)
// Ported from v1 program builder page

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { TrainingGoal, TrainingPhase } from '../../types';
import { GOAL_LABELS, PHASE_LABELS } from '../../constants';

interface SetupStepProps {
  isTrainerMode: boolean;
  onContinue: (setup: SetupData) => void;
}

export interface SetupData {
  programName: string;
  selectedClientId: string | null;
  goal: TrainingGoal;
  phase: TrainingPhase;
  durationWeeks: number;
  customWeeks: string;
  daysPerWeek: number;
  autoRepeat: boolean;
}

export function SetupStep({ isTrainerMode, onContinue }: SetupStepProps) {
  const [programName, setProgramName] = useState('');
  const [goal, setGoal] = useState<TrainingGoal>('hypertrophy');
  const [phase, setPhase] = useState<TrainingPhase>('strength');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [customWeeks, setCustomWeeks] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleContinue = () => {
    if (!programName.trim()) {
      toast.error('Please enter a program name');
      return;
    }

    if (durationWeeks === 0 && (!customWeeks || parseInt(customWeeks) < 1)) {
      toast.error('Please enter a valid custom duration');
      return;
    }

    onContinue({
      programName,
      selectedClientId,
      goal,
      phase,
      durationWeeks,
      customWeeks,
      daysPerWeek,
      autoRepeat,
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Program Name */}
          <div className="space-y-2">
            <Label htmlFor="program-name">Program Name</Label>
            <Input
              id="program-name"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g. 8-Week Hypertrophy"
            />
          </div>

          {/* Client Select - Only in trainer mode */}
          {isTrainerMode && (
            <div className="space-y-2">
              <Label htmlFor="client-select">Client</Label>
              <Select
                value={selectedClientId || 'none'}
                onValueChange={(v) => setSelectedClientId(v === 'none' ? null : v)}
              >
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (template only)</SelectItem>
                  {/* TODO(w2a): Wire to real trainer_clients query when Box 4 (roster) is built.
                      For now, disabled placeholder. Do NOT fake client data. */}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Client roster will be available when trainer features are enabled
              </p>
            </div>
          )}

          {/* Goal + Phase */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Training Goal</Label>
              <Select
                value={goal}
                onValueChange={(v) => setGoal(v as TrainingGoal)}
              >
                <SelectTrigger id="goal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase">Training Phase</Label>
              <Select
                value={phase}
                onValueChange={(v) => setPhase(v as TrainingPhase)}
              >
                <SelectTrigger id="phase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration + Custom Weeks + Days/Week */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={String(durationWeeks)}
                onValueChange={(v) => setDurationWeeks(parseInt(v))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                  <SelectItem value="0">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationWeeks === 0 && (
              <div className="space-y-2">
                <Label htmlFor="custom-weeks">Custom Weeks</Label>
                <Input
                  id="custom-weeks"
                  type="number"
                  min={1}
                  max={52}
                  value={customWeeks}
                  onChange={(e) => setCustomWeeks(e.target.value)}
                  placeholder="e.g. 16"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="days-per-week">Days per Week</Label>
              <Select
                value={String(daysPerWeek)}
                onValueChange={(v) => setDaysPerWeek(parseInt(v))}
              >
                <SelectTrigger id="days-per-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2× / week</SelectItem>
                  <SelectItem value="3">3× / week</SelectItem>
                  <SelectItem value="4">4× / week</SelectItem>
                  <SelectItem value="5">5× / week</SelectItem>
                  <SelectItem value="6">6× / week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-repeat */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-repeat">Auto-repeat</Label>
              <p className="text-sm text-gray-500">
                Restart program after completion
              </p>
            </div>
            <Switch
              id="auto-repeat"
              checked={autoRepeat}
              onCheckedChange={setAutoRepeat}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleContinue} className="w-full" size="lg">
        Continue to Build Days <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
