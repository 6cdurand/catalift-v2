'use client';

/**
 * BlockLibraryDialog.tsx — Block Library (w2c-2)
 * Ported from v1 v1/src/app/program/builder/page.tsx L1610-1869
 *
 * Lists saved blocks grouped by folder, filter by folder/type/search,
 * insert into current day, move/delete blocks.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dumbbell,
  Search,
  RefreshCw,
  Folder,
  FolderPlus,
  FolderInput,
  Eye,
  Trash2,
  MoreVertical,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SavedBlock, SavedBlockType } from '../../api/blocks';

const BLOCK_TYPES: Array<{
  value: SavedBlockType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'straight', label: 'Straight', icon: '🎯' },
  { value: 'superset', label: 'Superset', icon: '⚡' },
  { value: 'circuit', label: 'Circuit', icon: '🔄' },
  { value: 'cardio', label: 'Cardio', icon: '🏃' },
];

interface BlockLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedBlocks: SavedBlock[];
  onRefresh: () => Promise<void>;
  onAddBlock: (block: SavedBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, folder: string | null) => void;
  onOpenCreateFolder: (moveTargetBlockId: string | null) => void;
  onOpenRenameFolder: (folderName: string) => void;
  onOpenDeleteFolder: (folderName: string) => void;
}

function getBlockStyles(type: SavedBlockType) {
  switch (type) {
    case 'straight':
      return {
        bg: 'bg-sky-500/5',
        border: 'border-sky-500/20',
        badge: 'bg-sky-500/10 text-sky-400',
      };
    case 'superset':
      return {
        bg: 'bg-purple-500/5',
        border: 'border-purple-500/20',
        badge: 'bg-purple-500/10 text-purple-400',
      };
    case 'circuit':
      return {
        bg: 'bg-orange-500/5',
        border: 'border-orange-500/20',
        badge: 'bg-orange-500/10 text-orange-400',
      };
    case 'cardio':
      return {
        bg: 'bg-green-500/5',
        border: 'border-green-500/20',
        badge: 'bg-green-500/10 text-green-400',
      };
    default:
      return {
        bg: 'bg-gray-500/5',
        border: 'border-gray-500/20',
        badge: 'bg-gray-500/10 text-gray-400',
      };
  }
}

export function BlockLibraryDialog({
  open,
  onOpenChange,
  savedBlocks,
  onRefresh,
  onAddBlock,
  onDeleteBlock,
  onMoveBlock,
  onOpenCreateFolder,
  onOpenRenameFolder,
  onOpenDeleteFolder,
}: BlockLibraryDialogProps) {
  const [blockLibraryFilter, setBlockLibraryFilter] = useState<SavedBlockType | 'all'>('all');
  const [blockLibrarySearch, setBlockLibrarySearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [syncingBlockLibrary, setSyncingBlockLibrary] = useState(false);

  // Derive folder list from saved blocks
  const folderList = useMemo(() => {
    const seen = new Set<string>();
    (savedBlocks || []).forEach((b) => {
      if (b.folder) seen.add(b.folder);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [savedBlocks]);

  // Filter blocks by folder, type, and search
  const filteredLibraryBlocks = useMemo(() => {
    let blocks = savedBlocks || [];
    if (activeFolder !== null) {
      blocks = blocks.filter((b) => b.folder === activeFolder);
    }
    if (blockLibraryFilter !== 'all') {
      blocks = blocks.filter((b) => b.block_type === blockLibraryFilter);
    }
    if (blockLibrarySearch.trim()) {
      const q = blockLibrarySearch.toLowerCase();
      blocks = blocks.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.block_data.exercises.some((e) =>
            (e.exerciseName || '').toLowerCase().includes(q),
          ),
      );
    }
    return blocks;
  }, [savedBlocks, blockLibraryFilter, blockLibrarySearch, activeFolder]);

  const handleRefresh = async () => {
    if (syncingBlockLibrary) return;
    setSyncingBlockLibrary(true);
    try {
      await onRefresh();
      toast.success('Block library synced');
    } catch (e) {
      console.error('[BlockLibrary] sync failed:', e);
      toast.error('Sync failed — try again');
    } finally {
      setSyncingBlockLibrary(false);
    }
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setActiveFolder(null);
      setBlockLibrarySearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md max-h-[80vh] p-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-sky-400" />
              <DialogTitle className="text-white text-lg font-semibold">
                Block Library
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={syncingBlockLibrary}
              className="text-gray-400 hover:text-white text-xs gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleRefresh}
            >
              <RefreshCw
                className={`w-3 h-3 ${syncingBlockLibrary ? 'animate-spin' : ''}`}
              />{' '}
              {syncingBlockLibrary ? 'Syncing…' : 'Sync'}
            </Button>
          </div>

          {/* Type filter chips */}
          <div className="flex gap-1 flex-wrap mb-3">
            <Button
              size="sm"
              className={`h-7 text-xs ${
                blockLibraryFilter === 'all'
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setBlockLibraryFilter('all')}
            >
              All
            </Button>
            {BLOCK_TYPES.map((bt) => (
              <Button
                key={bt.value}
                size="sm"
                className={`h-7 text-xs gap-1 ${
                  blockLibraryFilter === bt.value
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setBlockLibraryFilter(bt.value)}
              >
                {bt.icon} {bt.label}
              </Button>
            ))}
          </div>

          {/* Folder filter chips */}
          <div className="border-b border-gray-800 pb-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-300">Folders</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenCreateFolder(null)}
                className="h-6 text-xs gap-1 text-gray-300 hover:text-white"
              >
                <FolderPlus className="w-3.5 h-3.5" /> New folder
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveFolder(null)}
                className={`h-6 px-2 text-xs rounded border ${
                  activeFolder === null
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                All blocks ({savedBlocks.length})
              </button>
              {folderList.map((folder) => {
                const count = savedBlocks.filter((b) => b.folder === folder).length;
                return (
                  <div key={folder} className="flex items-center group">
                    <button
                      onClick={() => setActiveFolder(folder)}
                      className={`h-6 pl-2 pr-1 text-xs rounded-l border flex items-center gap-1 ${
                        activeFolder === folder
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Folder className="w-3 h-3" />
                      {folder} ({count})
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`h-6 px-1 text-xs rounded-r border-r border-y flex items-center ${
                            activeFolder === folder
                              ? 'border-sky-500 text-sky-300 hover:bg-sky-500/30'
                              : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                          }`}
                          aria-label={`Manage folder ${folder}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onOpenRenameFolder(folder)}>
                          <Pencil className="w-4 h-4 mr-2" /> Rename folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onOpenDeleteFolder(folder)}
                          className="text-red-400 focus:text-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete folder…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={blockLibrarySearch}
              onChange={(e) => setBlockLibrarySearch(e.target.value)}
              placeholder="Search blocks or exercises..."
              className="bg-gray-800 border-gray-700 text-white pl-10 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] p-4">
          <div className="space-y-3">
            {filteredLibraryBlocks.length === 0 && (
              <div className="text-center py-8">
                <Dumbbell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-200">No blocks found</p>
                <p className="text-xs text-gray-300 mt-1">
                  Create blocks in the workout builder to see them here
                </p>
              </div>
            )}
            {filteredLibraryBlocks.map((sb) => {
              const styles = getBlockStyles(sb.block_type);
              const blockIcon =
                BLOCK_TYPES.find((bt) => bt.value === sb.block_type)?.icon;
              return (
                <Card
                  key={sb.id}
                  className={`${styles.bg} ${styles.border} border cursor-pointer hover:ring-1 hover:ring-sky-500/50 transition-all`}
                  onClick={() => onAddBlock(sb)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex-shrink-0">{blockIcon}</span>
                        <span className="text-sm text-white font-medium truncate">
                          {sb.name}
                        </span>
                        <Badge
                          className={`text-[10px] ${styles.badge} border flex-shrink-0`}
                        >
                          {sb.block_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-sky-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: preview dialog (deferred)
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-sky-400"
                              onClick={(e) => e.stopPropagation()}
                              title="Move to folder"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                onMoveBlock(sb.id, null);
                                toast.success('Removed from folder');
                              }}
                            >
                              Remove from folder
                            </DropdownMenuItem>
                            {folderList.length > 0 && <DropdownMenuSeparator />}
                            {folderList.map((f) => (
                              <DropdownMenuItem
                                key={f}
                                onClick={() => {
                                  onMoveBlock(sb.id, f);
                                  toast.success(`Moved to "${f}"`);
                                }}
                              >
                                <Folder className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                {f}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onOpenCreateFolder(sb.id)}>
                              <FolderPlus className="w-3.5 h-3.5 mr-2 text-gray-400" />
                              New folder…
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBlock(sb.id);
                            toast.success('Block deleted');
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      {sb.block_data.exercises.length} exercises
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
