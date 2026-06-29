// ExerciseEditDialog.tsx — rich exercise editor dialog.
// Ported from v1 program/builder/page.tsx L1871-2270 (PORT-UI fidelity).
// Adapted to v2 light theme + onSave callback (no cross-feature store import).
// Shared component: used by both program builder and future workout builder.

'use client';

import { useState } from 'react';
import { ArrowLeftRight, Clock, Dumbbell, Save, Search, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TEMPO_PRESETS, REST_PRESETS } from '@/lib/workoutEstimator';
import { exerciseLibraryMap, allExercises } from '@/lib/exercises';
import { getDirectSwaps } from '@/lib/exerciseRelations';
import { searchExercises } from '@/lib/exerciseSearch';
import type { BuilderExercise } from './builder-types';

// ── Set style presets (ported verbatim from v1 L93-100) ──
const SET_STYLES = [
  { id: 'fixed', name: 'Fixed', description: 'Same reps each set', icon: '⬜' },
  { id: 'pyramid', name: 'Pyramid', description: '12→10→8→6', icon: '🔺' },
  { id: 'reverse-pyramid', name: 'Rev Pyramid', description: '6→8→10→12', icon: '🔻' },
  { id: '5x5', name: '5×5', description: '5 sets of 5', icon: '5️⃣' },
  { id: 'drop-set', name: 'Drop Set', description: 'No rest between', icon: '⬇️' },
  { id: 'amrap', name: 'AMRAP', description: 'Max reps', icon: '♾️' },
] as const;

export interface ExerciseEditDialogProps {
  blockId: string;
  exercise: BuilderExercise;
  onSave: (blockId: string, exerciseId: string, updates: Partial<BuilderExercise>) => void;
  onClose: () => void;
}

export function ExerciseEditDialog({ blockId, exercise, onSave, onClose }: ExerciseEditDialogProps) {
  const [editEx, setEditEx] = useState<BuilderExercise>(exercise);
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');

  const libEntry = exerciseLibraryMap.get(editEx.exerciseId);
  const categoryLabel = libEntry?.category || editEx.movementPattern;

  function applySwap(id: string, name: string, pattern: string) {
    setEditEx((prev) => ({ ...prev, exerciseId: id, exerciseName: name, movementPattern: pattern }));
    setShowSwapPanel(false);
    setSwapSearch('');
  }

  function handleSetStyle(styleId: string) {
    let newSets = editEx.sets;
    let newReps = editEx.reps;
    if (styleId === '5x5') { newSets = 5; newReps = '5'; }
    else if (styleId === 'pyramid') { newSets = 4; newReps = '12→10→8→6'; }
    else if (styleId === 'reverse-pyramid') { newSets = 4; newReps = '6→8→10→12'; }
    else if (styleId === 'drop-set') { newSets = 3; newReps = '10→10→10'; }
    else if (styleId === 'amrap') { newReps = 'AMRAP'; }
    setEditEx((prev) => ({ ...prev, setStyle: styleId, sets: newSets, reps: newReps }));
  }

  function handleRepType(repType: 'reps' | 'time') {
    if (repType === 'reps') {
      setEditEx((prev) => ({ ...prev, repType: 'reps', reps: prev.repType === 'time' ? '10' : prev.reps }));
    } else {
      setEditEx((prev) => ({ ...prev, repType: 'time', reps: prev.repType === 'reps' || !prev.repType ? '30s' : prev.reps }));
    }
  }

  function handleSave() {
    onSave(blockId, editEx.id, {
      exerciseId: editEx.exerciseId,
      exerciseName: editEx.exerciseName,
      movementPattern: editEx.movementPattern,
      sets: editEx.sets,
      reps: editEx.reps,
      rest: editEx.rest,
      repType: editEx.repType,
      setStyle: editEx.setStyle,
      tempo: editEx.tempo,
      notes: editEx.notes,
    });
    onClose();
  }

  function handleClose(open: boolean) {
    if (!open) {
      setShowSwapPanel(false);
      setSwapSearch('');
      onClose();
    }
  }

  // Tempo human-readable description (ported from v1 L2224-2227)
  const tempoStr = editEx.tempo || '';
  const tempoDesc = tempoStr
    ? `${tempoStr[0] || '0'}s down, ${tempoStr[1] || '0'}s pause, ${tempoStr[2] || '0'}s up, ${tempoStr[3] || '0'}s top`
    : 'Eccentric-pause-concentric-pause (affects time estimate)';

  // Same-pattern exercises: filter by shared primary muscles
  const currentMuscles = libEntry?.primaryMuscles || [];
  const samePatternExercises = allExercises.filter((ex) => {
    if (ex.id === editEx.exerciseId) return false;
    return ex.primaryMuscles?.some((m) => currentMuscles.includes(m)) ?? false;
  });

  const directSwaps = getDirectSwaps(editEx.exerciseId);
  const allSearchResults = searchExercises(swapSearch, { limit: 50 })
    .filter((ex) => ex.id !== editEx.exerciseId);

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Exercise name + badge + swap button */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-400 text-xs">Exercise</Label>
              <p className="font-medium text-gray-900">{editEx.exerciseName}</p>
              <Badge variant="outline" className="text-xs capitalize mt-1">
                {categoryLabel}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSwapPanel(!showSwapPanel)}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {showSwapPanel ? 'Hide Swaps' : 'Swap Exercise'}
            </Button>
          </div>

          {/* Swap Suggestions Panel */}
          {showSwapPanel && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <Tabs defaultValue="similar" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-3">
                  <TabsTrigger value="similar" className="text-xs">
                    <Dumbbell className="h-3 w-3 mr-1" />
                    Similar
                  </TabsTrigger>
                  <TabsTrigger value="muscle" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    Same Pattern
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">
                    <Search className="h-3 w-3 mr-1" />
                    All Exercises
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="similar" className="mt-2">
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {directSwaps.length > 0 ? (
                        directSwaps.map((ex) => (
                          <Button
                            key={ex.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left h-auto py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            onClick={() => applySwap(ex.id, ex.name, ex.movementPattern)}
                          >
                            <div>
                              <p className="font-medium text-sm">{ex.name}</p>
                              <p className="text-xs text-gray-500">{ex.equipment}</p>
                            </div>
                          </Button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No direct swaps available</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="muscle" className="mt-2">
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {samePatternExercises.map((ex) => (
                        <Button
                          key={ex.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => applySwap(ex.id, ex.name, ex.category)}
                        >
                          <div>
                            <p className="font-medium text-sm">{ex.name}</p>
                            <p className="text-xs text-gray-500 capitalize">
                              {ex.primaryMuscles?.join(', ') || ex.category}
                            </p>
                          </div>
                        </Button>
                      ))}
                      {samePatternExercises.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No similar exercises found</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="all" className="mt-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={swapSearch}
                      onChange={(e) => setSwapSearch(e.target.value)}
                      placeholder="Search all exercises..."
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {allSearchResults.map((ex) => (
                        <Button
                          key={ex.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => applySwap(ex.id, ex.name, ex.category)}
                        >
                          <div>
                            <p className="font-medium text-sm">{ex.name}</p>
                            <p className="text-xs text-gray-500 capitalize">
                              {ex.equipment || ex.category}
                              {ex.primaryMuscles?.length ? ` · ${ex.primaryMuscles.join(', ')}` : ''}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Set Style Selection */}
          <div>
            <Label className="mb-2 block text-gray-700">Set Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {SET_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`h-auto py-2 px-2 flex flex-col items-center justify-center text-center rounded-md border overflow-hidden transition-colors ${
                    (editEx.setStyle || 'fixed') === style.id
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : 'bg-transparent border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSetStyle(style.id)}
                >
                  <span className="font-medium text-sm whitespace-nowrap">{style.icon} {style.name}</span>
                  <span className="text-xs opacity-70 truncate w-full">{style.description}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              These are suggestions - edit sets/reps below to record actual performance
            </p>
          </div>

          {/* Measurement Type (Reps vs Time) */}
          <div>
            <Label className="mb-2 block text-gray-700">Measurement Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={(editEx.repType || 'reps') === 'reps' ? 'default' : 'outline'}
                size="sm"
                className={(editEx.repType || 'reps') === 'reps' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                onClick={() => handleRepType('reps')}
              >
                Reps
              </Button>
              <Button
                type="button"
                variant={editEx.repType === 'time' ? 'default' : 'outline'}
                size="sm"
                className={editEx.repType === 'time' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                onClick={() => handleRepType('time')}
              >
                <Clock className="h-3 w-3 mr-1" />
                Time
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {editEx.repType === 'time'
                ? 'Use for cardio, holds, stretches (e.g., 30s, 1min, 5min)'
                : 'Standard repetition counting'}
            </p>
          </div>

          {/* Sets / Reps / Rest */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-sets" className="text-gray-700">Sets</Label>
              <Input
                id="edit-sets"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={editEx.sets}
                onChange={(e) => setEditEx((prev) => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-reps" className="text-gray-700">{editEx.repType === 'time' ? 'Duration' : 'Reps'}</Label>
              <Input
                id="edit-reps"
                value={editEx.reps}
                placeholder={editEx.repType === 'time' ? '30s' : '8-12'}
                onChange={(e) => setEditEx((prev) => ({ ...prev, reps: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-gray-700">Rest</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {REST_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={editEx.rest === `${preset.value}s` ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-6 px-2 ${editEx.rest === `${preset.value}s` ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                    onClick={() => setEditEx((prev) => ({ ...prev, rest: `${preset.value}s` }))}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Tempo */}
          <div>
            <Label className="mb-2 block text-gray-700">Tempo</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(TEMPO_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  type="button"
                  variant={editEx.tempo === preset.tempo.join('') ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs h-7 ${editEx.tempo === preset.tempo.join('') ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                  onClick={() => setEditEx((prev) => ({ ...prev, tempo: preset.tempo.join('') }))}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant={!editEx.tempo ? 'default' : 'outline'}
                size="sm"
                className={`text-xs h-7 ${!editEx.tempo ? 'bg-gray-600' : ''}`}
                onClick={() => setEditEx((prev) => ({ ...prev, tempo: '' }))}
              >
                None
              </Button>
            </div>
            <Input
              value={editEx.tempo || ''}
              onChange={(e) => setEditEx((prev) => ({ ...prev, tempo: e.target.value }))}
              placeholder="Custom: 3010"
              className="h-8"
            />
            <p className="text-xs text-gray-400 mt-1">{tempoDesc}</p>
          </div>

          {/* Coaching Notes */}
          <div>
            <Label htmlFor="edit-notes" className="text-gray-700">Coaching Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={editEx.notes || ''}
              onChange={(e) => setEditEx((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any coaching cues for this exercise..."
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Save button */}
          <Button
            className="w-full bg-sky-500 hover:bg-sky-600"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
