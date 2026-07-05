/**
 * programs/api/blocks.ts — Saved blocks API (w2c-2)
 *
 * CRUD operations against `public.saved_blocks` with await+retry (G-11), real
 * uuids (G-10), RLS owner-only. block_data round-trips losslessly to w1
 * ProgramBlock union (straight|superset|circuit|cardio).
 */

import { getBrowserClient } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { ProgramBlock } from '../types';
import { v4 as uuidv4 } from 'uuid';

type SavedBlockRow = Database['public']['Tables']['saved_blocks']['Row'];
type SavedBlockInsert = Database['public']['Tables']['saved_blocks']['Insert'];
type SavedBlockUpdate = Database['public']['Tables']['saved_blocks']['Update'];

// Saved block types from DB schema (v1 names)
export type SavedBlockType = 'straight' | 'superset' | 'circuit' | 'cardio';

export interface SavedBlock {
  id: string;
  trainer_id: string;
  name: string;
  block_type: SavedBlockType;
  folder: string | null;
  block_data: ProgramBlock;
  created_at: string;
  updated_at: string;
}

/**
 * Map v2 BlockType to saved_blocks.block_type (v1 names).
 * v2 'work' → 'straight'; 'warmup'/'cooldown' → 'straight' (closest match).
 */
export function blockTypeToSaved(type: ProgramBlock['type']): SavedBlockType {
  switch (type) {
    case 'work':
    case 'warmup':
    case 'cooldown':
      return 'straight';
    case 'circuit':
      return 'circuit';
    case 'cardio':
      return 'cardio';
    default:
      return 'straight';
  }
}

/**
 * Map saved_blocks.block_type (v1 names) to v2 BlockType.
 * 'straight' → 'work'; 'superset' → 'work' (closest match).
 */
export function savedToBlockType(saved: SavedBlockType): ProgramBlock['type'] {
  switch (saved) {
    case 'straight':
    case 'superset':
      return 'work';
    case 'circuit':
      return 'circuit';
    case 'cardio':
      return 'cardio';
    default:
      return 'work';
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Retry wrapper for DB writes (G-11).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `[blocks.${operationName}] failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error(`[blocks.${operationName}] retry exhausted`);
}

/**
 * List all saved blocks for the authenticated user (RLS owner-only).
 */
export async function listBlocks(): Promise<SavedBlock[]> {
  const supabase = getBrowserClient();

  const { data, error } = await supabase
    .from('saved_blocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[blocks.listBlocks] query failed:', error);
    throw error;
  }

  return (data || []).map((row: SavedBlockRow) => ({
    ...row,
    block_data: row.block_data as unknown as ProgramBlock,
  }));
}

/**
 * Save a new block to the library.
 * RLS owner-only: trainer_id set on insert, no manual filter.
 */
export async function saveBlock(
  trainerId: string,
  name: string,
  blockData: ProgramBlock,
  folder?: string,
): Promise<SavedBlock> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    const insert: SavedBlockInsert = {
      id: uuidv4(), // G-10: real uuid
      trainer_id: trainerId,
      name,
      block_type: blockTypeToSaved(blockData.type),
      folder: folder || null,
      block_data: blockData as unknown as Database['public']['Tables']['saved_blocks']['Insert']['block_data'],
    };

    const { data, error } = await supabase
      .from('saved_blocks')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('[blocks.saveBlock] no data returned');

    return {
      ...data,
      block_data: data.block_data as unknown as ProgramBlock,
    };
  }, 'saveBlock');
}

/**
 * Update a saved block (name, folder, or block_data).
 * RLS ensures only the owner can update.
 */
export async function updateBlock(
  blockId: string,
  updates: Partial<Omit<SavedBlockUpdate, 'id' | 'trainer_id' | 'created_at'>>,
): Promise<void> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    const payload: SavedBlockUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Cast block_data if present
    if (updates.block_data) {
      payload.block_data = updates.block_data as unknown as Database['public']['Tables']['saved_blocks']['Update']['block_data'];
    }

    const { error } = await supabase
      .from('saved_blocks')
      .update(payload)
      .eq('id', blockId);

    if (error) throw error;
  }, 'updateBlock');
}

/**
 * Delete a saved block.
 * RLS ensures only the owner can delete.
 */
export async function deleteBlock(blockId: string): Promise<void> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    const { error } = await supabase
      .from('saved_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;
  }, 'deleteBlock');
}

/**
 * Move a block to a different folder (or clear folder if null).
 */
export async function moveBlockToFolder(
  blockId: string,
  folder: string | null,
): Promise<void> {
  return updateBlock(blockId, { folder });
}

/**
 * Rename a folder by updating all blocks in that folder.
 * Returns the number of blocks affected.
 */
export async function renameFolder(
  oldName: string,
  newName: string,
): Promise<number> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    // First get all blocks in the old folder
    const { data: blocks, error: fetchError } = await supabase
      .from('saved_blocks')
      .select('id')
      .eq('folder', oldName);

    if (fetchError) throw fetchError;
    if (!blocks || blocks.length === 0) return 0;

    // Update all blocks to new folder name
    const { error: updateError } = await supabase
      .from('saved_blocks')
      .update({ folder: newName, updated_at: new Date().toISOString() })
      .eq('folder', oldName);

    if (updateError) throw updateError;

    return blocks.length;
  }, 'renameFolder');
}

/**
 * Delete a folder by either moving blocks to another folder or clearing their folder.
 * Returns the number of blocks affected.
 */
export async function deleteFolder(
  folderName: string,
  moveToFolder: string | null,
): Promise<number> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    // First get all blocks in the folder
    const { data: blocks, error: fetchError } = await supabase
      .from('saved_blocks')
      .select('id')
      .eq('folder', folderName);

    if (fetchError) throw fetchError;
    if (!blocks || blocks.length === 0) return 0;

    // Update all blocks to move or unfile
    const { error: updateError } = await supabase
      .from('saved_blocks')
      .update({ folder: moveToFolder, updated_at: new Date().toISOString() })
      .eq('folder', folderName);

    if (updateError) throw updateError;

    return blocks.length;
  }, 'deleteFolder');
}
