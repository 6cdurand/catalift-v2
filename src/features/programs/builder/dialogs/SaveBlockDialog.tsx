'use client';

/**
 * SaveBlockDialog.tsx — Save Block to Library (w2c-2)
 * Ported from v1 v1/src/app/program/builder/page.tsx L2271-2421
 *
 * Saves a ProgramBlock to saved_blocks with name + optional folder.
 * block_data round-trips losslessly to w1 WorkoutBlock union.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ProgramBlock } from '../../types';

interface SaveBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: ProgramBlock | null;
  existingFolders: string[];
  onSave: (name: string, folder: string | undefined) => Promise<void>;
}

export function SaveBlockDialog({
  open,
  onOpenChange,
  block,
  existingFolders,
  onSave,
}: SaveBlockDialogProps) {
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && block) {
      setName(block.name || ''); // eslint-disable-line react-hooks/set-state-in-effect
      setFolder(''); // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (!open) {
      setName(''); // eslint-disable-line react-hooks/set-state-in-effect
      setFolder(''); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [open, block]);

  const handleSave = async () => {
    if (!name.trim() || !block) {
      toast.error('Please enter a block name');
      return;
    }

    setSaving(true);
    try {
      await onSave(name.trim(), folder.trim() || undefined);
      toast.success(`"${name.trim()}" saved to library`);
      onOpenChange(false);
    } catch (err) {
      console.error('[SaveBlockDialog] save failed:', err);
      toast.error('Failed to save block');
    } finally {
      setSaving(false);
    }
  };

  if (!block) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Save Block to Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Block Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Upper Body Strength, Leg Day Warmup"
              className="mt-2 bg-gray-800 border-gray-700 text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) handleSave();
              }}
            />
          </div>
          <div>
            <Label className="text-gray-300">
              Folder <span className="text-gray-500 font-normal">(optional)</span>
            </Label>
            <Input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g., Push Day, Client Templates"
              className="mt-2 bg-gray-800 border-gray-700 text-white"
              list="program-folder-suggestions"
            />
            <datalist id="program-folder-suggestions">
              {existingFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
          <p className="text-sm text-gray-400">
            Save this block to reuse it in future workouts and programs.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-purple-500 hover:bg-purple-600"
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save Block'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
