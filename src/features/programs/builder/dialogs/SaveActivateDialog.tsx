'use client';

// SaveActivateDialog.tsx — Save/Activate confirm dialog (w2c-1)
// Ported from v1 program/builder/page.tsx L1535–L1609.
// Trainer mode: shows client picker (required before assign).
// Self mode: simple activate confirm.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface SaveActivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isTrainerMode: boolean;
  totalSessions: number;
  durationWeeks: number;
  /** Trainer mode: called with the selected client ID. Self mode: called with null. */
  onConfirm: (clientId: string | null) => void;
  /** Whether the save write is in-flight (disables the confirm button). */
  saving?: boolean;
}

export function SaveActivateDialog({
  open,
  onOpenChange,
  isTrainerMode,
  totalSessions,
  durationWeeks,
  onConfirm,
  saving = false,
}: SaveActivateDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isTrainerMode ? 'Assign Program to Client' : 'Activate Program'}
          </DialogTitle>
          <DialogDescription>
            This will create {totalSessions} sessions over {durationWeeks} weeks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Trainer mode: client picker (required) */}
          {isTrainerMode && (
            <div className="space-y-2">
              <Label>Assign to client</Label>
              <Select
                value={selectedClientId || ''}
                onValueChange={(v) => setSelectedClientId(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO(box-4): Wire to real trainer_clients query when roster is built.
                      For now, disabled placeholder. Do NOT fake client data. */}
                  <SelectItem value="none" disabled>
                    Client roster available when trainer features are enabled
                  </SelectItem>
                </SelectContent>
              </Select>
              {!selectedClientId && (
                <p className="text-xs text-amber-600">
                  Pick a client to activate this program for them.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300"
              onClick={() => onConfirm(selectedClientId)}
              disabled={(isTrainerMode && !selectedClientId) || saving}
            >
              <Calendar className="w-4 h-4 mr-2" /> Activate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
