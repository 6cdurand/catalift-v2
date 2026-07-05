'use client';

/**
 * DeleteFolderDialog.tsx — Delete Block Folder (w2c-2)
 * Ported from v1 v1/src/components/program/DeleteFolderDialog.tsx
 *
 * Deletes a folder by moving blocks to another folder or clearing their folder field.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string | null;
  existingFolders: string[];
  blockCount: number; // number of saved blocks currently in this folder
  onDeleted: (name: string, moveToFolder: string | null) => Promise<number>;
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folderName,
  existingFolders,
  blockCount,
  onDeleted,
}: DeleteFolderDialogProps) {
  // Special sentinel for "unfile" (folder set to NULL)
  const UNFILE = '__unfile__';
  const [target, setTarget] = useState<string>(UNFILE);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) setTarget(UNFILE); // eslint-disable-line react-hooks/set-state-in-effect
  }, [open]);

  if (!folderName) return null;

  const handleConfirm = async () => {
    const dest = target === UNFILE ? null : target;
    setDeleting(true);
    try {
      const count = await onDeleted(folderName, dest);
      toast.success(
        dest
          ? `Deleted "${folderName}". ${count} block${count === 1 ? '' : 's'} moved to "${dest}".`
          : `Deleted "${folderName}". ${count} block${count === 1 ? '' : 's'} unfiled.`,
        { duration: 4000 },
      );
      onOpenChange(false);
    } catch (err) {
      console.error('[DeleteFolderDialog] delete failed:', err);
      toast.error('Failed to delete folder. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const otherFolders = existingFolders.filter((f) => f !== folderName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" /> Delete folder
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {blockCount > 0
              ? `"${folderName}" has ${blockCount} block${blockCount === 1 ? '' : 's'}. Choose where to move them.`
              : `"${folderName}" is empty. It will be removed from the chip list.`}
          </DialogDescription>
        </DialogHeader>
        {blockCount > 0 && (
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300 text-sm">Move blocks to</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="mt-2 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNFILE}>Unfiled (no folder)</SelectItem>
                  {otherFolders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
