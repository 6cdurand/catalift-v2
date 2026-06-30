'use client';

/**
 * CreateFolderDialog.tsx — Create Block Folder (w2c-2)
 * Ported from v1 v1/src/components/program/CreateFolderDialog.tsx
 *
 * Folders are free-text on saved_blocks.folder; no block_folders table.
 * A folder "exists" when any saved block has that string set.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FolderPlus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFolders: string[];
  /** When set, the saved block with this id is moved into the new folder on save. */
  moveTargetBlockId: string | null;
  /** Called with the trimmed folder name after a successful create/move. */
  onCreated: (name: string, moveTargetBlockId: string | null) => Promise<void>;
}

const MAX_LEN = 50;

export function CreateFolderDialog({
  open,
  onOpenChange,
  existingFolders,
  moveTargetBlockId,
  onCreated,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) setName(''); // eslint-disable-line react-hooks/set-state-in-effect
  }, [open]);

  const trimmed = name.trim();
  const exists =
    !!trimmed &&
    existingFolders.some((f) => f.toLowerCase() === trimmed.toLowerCase());
  const tooLong = trimmed.length > MAX_LEN;
  const isDisabled = !trimmed || exists || tooLong || creating;
  const error = exists
    ? 'Folder already exists. Pick another name or cancel.'
    : tooLong
      ? `Max ${MAX_LEN} characters.`
      : null;

  const handleSave = async () => {
    if (isDisabled) return;
    setCreating(true);
    try {
      await onCreated(trimmed, moveTargetBlockId);
      if (moveTargetBlockId) {
        toast.success(`Block moved to "${trimmed}"`);
      } else {
        toast.success(`Folder "${trimmed}" created`);
      }
      onOpenChange(false);
    } catch (err) {
      console.error('[CreateFolderDialog] create failed:', err);
      toast.error('Could not create folder. Try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-sky-400" />
            {moveTargetBlockId ? 'Move block to new folder' : 'Create folder'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {moveTargetBlockId
              ? 'Give the new folder a name. The block will be moved into it.'
              : 'Folders are free-text labels on saved blocks. Move blocks into the new folder via the folder icon on each block card.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-gray-300 text-sm">Folder name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Push Day Templates"
              maxLength={MAX_LEN}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isDisabled) handleSave();
              }}
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-600"
            disabled={isDisabled}
            onClick={handleSave}
          >
            {creating
              ? 'Creating…'
              : moveTargetBlockId
                ? 'Move'
                : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
