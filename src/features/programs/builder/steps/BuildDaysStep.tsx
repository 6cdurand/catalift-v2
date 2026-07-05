// BuildDaysStep.tsx — Program builder Step 2: Build Days (w2b-1)
// Ported from v1 program/builder/page.tsx L1153-1457 + WorkoutDayBuilder.
// Uses the w1 programs store as single source of truth for days state.

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, Plus, Copy, Trash2, Library, Save } from 'lucide-react';
// eslint-disable-next-line no-restricted-imports -- builder step imports shared components from workout-engine
import { DayBuilder } from '@/features/workout-engine/components/DayBuilder';
// eslint-disable-next-line no-restricted-imports -- builder step imports shared ExerciseEditDialog from workout-engine
import { ExerciseEditDialog } from '@/features/workout-engine/components/ExerciseEditDialog';
import { useProgramsStore } from '../../store';
import { searchExercisesLite } from '@/lib/exerciseSearch';
import type { BlockType } from '@/types';
import type { ProgramExercise } from '../../types';
import { BlockLibraryDialog } from '../dialogs/BlockLibraryDialog';
import { SaveBlockDialog } from '../dialogs/SaveBlockDialog';
import { CreateFolderDialog } from '../dialogs/folders/CreateFolderDialog';
import { RenameFolderDialog } from '../dialogs/folders/RenameFolderDialog';
import { DeleteFolderDialog } from '../dialogs/folders/DeleteFolderDialog';
import { listBlocks, saveBlock, deleteBlock, moveBlockToFolder, renameFolder, deleteFolder, savedToBlockType } from '../../api/blocks';
import type { SavedBlock } from '../../api/blocks';
import { useSession } from '@/features/auth';


interface BuildDaysStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function BuildDaysStep({ onContinue, onBack }: BuildDaysStepProps) {
  const {
    builderDays: days,
    activeDayIndex,
    setActiveDayIndex,
    updateDayLabel,
    addDay,
    copyDay,
    removeDay,
    addBlock,
    removeBlock,
    updateBlockName,
    addExerciseToBlock,
    removeExercise,
    updateExercise,
  } = useProgramsStore();

  const [showAddExercise, setShowAddExercise] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingExercise, setEditingExercise] = useState<{ blockId: string; exercise: ProgramExercise } | null>(null);

  // Block Library state (w2c-2)
  const { user } = useSession();
  const [savedBlocks, setSavedBlocks] = useState<SavedBlock[]>([]);
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [showSaveBlockDialog, setShowSaveBlockDialog] = useState(false);
  const [saveBlockTarget, setSaveBlockTarget] = useState<{ blockId: string; block: ProgramExercise['id'] extends never ? never : typeof activeDay['blocks'][0] } | null>(null);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [createFolderMoveTarget, setCreateFolderMoveTarget] = useState<string | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);

  const loadSavedBlocks = async () => {
    try {
      const blocks = await listBlocks();
      setSavedBlocks(blocks); // eslint-disable-line react-hooks/set-state-in-effect
    } catch (err) {
      console.error('[BuildDaysStep] failed to load saved blocks:', err);
    }
  };

  // Load saved blocks on mount (w2c-2)
  useEffect(() => {
    if (user) {
      void loadSavedBlocks(); // eslint-disable-line react-hooks/set-state-in-effect
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAddBlockFromLibrary = (sb: SavedBlock) => {
    if (!user || !activeDay) return;
    // Insert saved block into current day with new IDs (G-10)
    // Map saved block type (v1 names) to v2 BlockType
    addBlock(activeDayIndex, savedToBlockType(sb.block_type));
    const newBlock = days[activeDayIndex].blocks[days[activeDayIndex].blocks.length - 1];
    if (newBlock) {
      updateBlockName(newBlock.id, sb.name);
      // Add exercises from saved block
      sb.block_data.exercises.forEach((ex) => {
        addExerciseToBlock(newBlock.id, {
          id: ex.exerciseId,
          name: ex.exerciseName,
          pattern: ex.movementPattern || '',
        });
        // Update exercise details
        const addedEx = days[activeDayIndex].blocks
          .find(b => b.id === newBlock.id)?.exercises
          .find(e => e.exerciseId === ex.exerciseId);
        if (addedEx) {
          updateExercise(newBlock.id, addedEx.id, {
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            repType: ex.repType,
            tempo: ex.tempo,
            notes: ex.notes,
            setStyle: ex.setStyle,
          } as Partial<ProgramExercise>);
        }
      });
    }
    setShowBlockLibrary(false);
  };

  const handleSaveBlock = async (name: string, folder: string | undefined) => {
    if (!user || !saveBlockTarget) return;
    await saveBlock(user.id, name, saveBlockTarget.block, folder);
    await loadSavedBlocks();
  };

  const handleDeleteBlock = async (blockId: string) => {
    await deleteBlock(blockId);
    await loadSavedBlocks();
  };

  const handleMoveBlock = async (blockId: string, folder: string | null) => {
    await moveBlockToFolder(blockId, folder);
    await loadSavedBlocks();
  };

  const handleCreateFolder = async (name: string, moveTargetBlockId: string | null) => {
    if (moveTargetBlockId) {
      await moveBlockToFolder(moveTargetBlockId, name);
    }
    await loadSavedBlocks();
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    const count = await renameFolder(oldName, newName);
    await loadSavedBlocks();
    return count;
  };

  const handleDeleteFolder = async (folderName: string, moveToFolder: string | null) => {
    const count = await deleteFolder(folderName, moveToFolder);
    await loadSavedBlocks();
    return count;
  };

  const existingFolders = useMemo(() => {
    const seen = new Set<string>();
    savedBlocks.forEach((b) => {
      if (b.folder) seen.add(b.folder);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [savedBlocks]);

  const activeDay = days[activeDayIndex];

  const totalBlocks = activeDay?.blocks.length || 0;
  const totalExercises = activeDay?.blocks.reduce((s, b) => s + b.exercises.length, 0) || 0;
  const allDaysTotalEx = days.reduce((s, d) => s + d.blocks.reduce((s2, b) => s2 + b.exercises.length, 0), 0);

  const filteredExercises = useMemo(() => {
    const currentBlock = activeDay?.blocks.find((b) => b.id === showAddExercise);
    return searchExercisesLite(exerciseSearch, {
      blockType: (currentBlock?.type as string) || null,
      limit: 30,
    });
  }, [exerciseSearch, showAddExercise, activeDay]);

  const handleAddExercise = (exercise: { id: string; name: string; pattern: string }) => {
    if (showAddExercise) {
      addExerciseToBlock(showAddExercise, exercise);
    }
    setShowAddExercise(null);
    setExerciseSearch('');
  };

  const handleEditExercise = (blockId: string, exerciseId: string) => {
    for (const day of days) {
      const block = day.blocks.find((b) => b.id === blockId);
      if (block) {
        const ex = block.exercises.find((e) => e.id === exerciseId);
        if (ex) {
          setEditingExercise({ blockId, exercise: ex });
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => setActiveDayIndex(i)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              i === activeDayIndex
                ? 'bg-sky-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {day.label}
          </button>
        ))}
        <button
          onClick={addDay}
          className="px-2 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          title="Add day"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Day name + actions */}
      {activeDay && (
        <div className="flex items-center gap-2">
          <Input
            value={activeDay.label}
            onChange={(e) => updateDayLabel(activeDayIndex, e.target.value)}
            className="flex-1"
            placeholder="Day name"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyDay(activeDayIndex)}
            title="Copy day"
          >
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeDay(activeDayIndex)}
            disabled={days.length <= 1}
            title="Remove day"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* DayBuilder */}
      {activeDay && (
        <DayBuilder
          blocks={activeDay.blocks as never}
          dayLabel={undefined}
          onAddBlock={(type: BlockType) => addBlock(activeDayIndex, type)}
          onRemoveBlock={removeBlock}
          onUpdateBlockName={updateBlockName}
          onAddExercise={(blockId) => setShowAddExercise(blockId)}
          onEditExercise={handleEditExercise}
          onRemoveExercise={removeExercise}
        />
      )}

      {/* Block Library actions (w2c-2) */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowBlockLibrary(true)}
          className="flex-1"
        >
          <Library className="h-4 w-4 mr-2" /> Block Library
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (activeDay?.blocks.length > 0) {
              const lastBlock = activeDay.blocks[activeDay.blocks.length - 1];
              setSaveBlockTarget({ blockId: lastBlock.id, block: lastBlock as never });
              setShowSaveBlockDialog(true);
            }
          }}
          className="flex-1"
          disabled={!activeDay || activeDay.blocks.length === 0}
        >
          <Save className="h-4 w-4 mr-2" /> Save Block to Library
        </Button>
      </div>

      {/* Bottom bar */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {totalBlocks} blocks • {totalExercises} exercises
        </span>
        <span className="text-xs text-gray-400">
          {allDaysTotalEx} total across {days.length} days
        </span>
      </div>

      {/* Step nav */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back to Setup
        </Button>
        <Button onClick={onContinue} className="flex-1">
          Continue to Schedule <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Exercise Edit Dialog (w2b-2) */}
      {editingExercise && (
        <ExerciseEditDialog
          blockId={editingExercise.blockId}
          exercise={editingExercise.exercise}
          onSave={(blockId, exerciseId, updates) => updateExercise(blockId, exerciseId, updates as Partial<ProgramExercise>)}
          onClose={() => setEditingExercise(null)}
        />
      )}

      {/* Add Exercise Dialog */}
      <Dialog open={!!showAddExercise} onOpenChange={() => { setShowAddExercise(null); setExerciseSearch(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search exercises (e.g. Bench Press)"
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleAddExercise({ id: ex.id, name: ex.name, pattern: ex.pattern })}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-sm">{ex.name}</div>
                <div className="text-xs text-gray-500">{ex.pattern}</div>
              </button>
            ))}
            {filteredExercises.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No exercises found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Library Dialog (w2c-2) */}
      <BlockLibraryDialog
        open={showBlockLibrary}
        onOpenChange={setShowBlockLibrary}
        savedBlocks={savedBlocks}
        onRefresh={loadSavedBlocks}
        onAddBlock={handleAddBlockFromLibrary}
        onDeleteBlock={handleDeleteBlock}
        onMoveBlock={handleMoveBlock}
        onOpenCreateFolder={(moveTargetBlockId) => {
          setCreateFolderMoveTarget(moveTargetBlockId);
          setShowCreateFolderDialog(true);
        }}
        onOpenRenameFolder={setRenameFolderTarget}
        onOpenDeleteFolder={setDeleteFolderTarget}
      />

      {/* Save Block Dialog (w2c-2) */}
      <SaveBlockDialog
        open={showSaveBlockDialog}
        onOpenChange={setShowSaveBlockDialog}
        block={saveBlockTarget?.block || null}
        existingFolders={existingFolders}
        onSave={handleSaveBlock}
      />

      {/* Folder Dialogs (w2c-2) */}
      <CreateFolderDialog
        open={showCreateFolderDialog}
        onOpenChange={(open) => {
          setShowCreateFolderDialog(open);
          if (!open) setCreateFolderMoveTarget(null);
        }}
        existingFolders={existingFolders}
        moveTargetBlockId={createFolderMoveTarget}
        onCreated={handleCreateFolder}
      />

      <RenameFolderDialog
        open={!!renameFolderTarget}
        onOpenChange={(open) => { if (!open) setRenameFolderTarget(null); }}
        folderName={renameFolderTarget}
        existingFolders={existingFolders}
        onRenamed={handleRenameFolder}
      />

      <DeleteFolderDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => { if (!open) setDeleteFolderTarget(null); }}
        folderName={deleteFolderTarget}
        existingFolders={existingFolders}
        blockCount={savedBlocks.filter(b => b.folder === deleteFolderTarget).length}
        onDeleted={handleDeleteFolder}
      />
    </div>
  );
}
