'use client';

/**
 * RenameFolderDialog.tsx — Rename Block Folder (w2c-2)
 * Ported from v1 v1/src/components/program/RenameFolderDialog.tsx
 *
 * Renames all blocks in the old folder to the new folder name.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string | null;
  existingFolders: string[];
  onRenamed: (oldName: string, newName: string) => Promise<number>;
}

const MAX_LEN = 50;

export function RenameFolderDialog({
  open,
  onOpenChange,
  folderName,
  existingFolders,
  onRenamed,
}: RenameFolderDialogProps) {
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (open && folderName) setName(folderName); // eslint-disable-line react-hooks/set-state-in-effect
    if (!open) setName(''); // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, folderName]);

  if (!folderName) return null;

  const trimmed = name.trim();
  const isSame = trimmed.toLowerCase() === folderName.toLowerCase();
  const conflicts =
    !isSame &&
    existingFolders.some((f) => f.toLowerCase() === trimmed.toLowerCase());
  const tooLong = trimmed.length > MAX_LEN;
  const disabled = !trimmed || isSame || conflicts || tooLong || renaming;
  const error = conflicts
    ? 'A folder with that name already exists.'
    : tooLong
      ? `Max ${MAX_LEN} characters.`
      : null;

  const handleSave = async () => {
    if (disabled) return;
    setRenaming(true);
    try {
      const count = await onRenamed(folderName, trimmed);
      toast.success(
        `Renamed "${folderName}" → "${trimmed}" (${count} block${count === 1 ? '' : 's'} updated).`,
      );
      onOpenChange(false);
    } catch (err) {
      console.error('[RenameFolderDialog] rename failed:', err);
      toast.error('Failed to rename folder. Try again.');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Pencil className="w-5 h-5 text-sky-400" /> Rename folder
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Renames every block currently in &quot;{folderName}&quot; to the new
            folder name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-gray-300 text-sm">New name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_LEN}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !disabled) handleSave();
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
            disabled={renaming}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-600"
            disabled={disabled}
            onClick={handleSave}
          >
            {renaming ? 'Renaming…' : 'Rename'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
