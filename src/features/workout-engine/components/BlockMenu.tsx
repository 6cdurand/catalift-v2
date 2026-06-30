'use client';

import { MoreVertical, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BlockMenuProps {
  hasExercises: boolean;
  onDelete: () => void;
  onSaveToLibrary?: () => void;
}

export function BlockMenu({ hasExercises, onDelete, onSaveToLibrary }: BlockMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-gray-400"
          aria-label="Block menu"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-lg">
        {hasExercises && (
          <DropdownMenuItem
            className="text-purple-500 focus:text-purple-600"
            onClick={onSaveToLibrary}
          >
            <Copy className="w-4 h-4 mr-2" />
            Save to Block Library
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem
          variant="destructive"
          className="text-red-500 focus:text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Block
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
