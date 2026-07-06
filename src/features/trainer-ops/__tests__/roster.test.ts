/**
 * roster.test.ts — Trainer roster API tests
 * Focus: fetchRoster returns active clients, handles empty roster, handles errors
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRoster } from '../api/roster';
import { getBrowserClient } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  getBrowserClient: vi.fn(),
}));

describe('fetchRoster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active clients for authenticated trainer', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'trainer-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'tc-1',
                  client_id: 'client-1',
                  status: 'active',
                  client: {
                    id: 'client-1',
                    full_name: 'John Doe',
                    email: 'john@example.com',
                  },
                },
                {
                  id: 'tc-2',
                  client_id: 'client-2',
                  status: 'active',
                  client: {
                    id: 'client-2',
                    full_name: 'Jane Smith',
                    email: 'jane@example.com',
                  },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getBrowserClient).mockReturnValue(mockSupabase as any);

    const result = await fetchRoster();

    expect(result).toEqual([
      {
        id: 'client-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
      },
      {
        id: 'client-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'active',
      },
    ]);
  });

  it('returns empty array when trainer has no clients', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'trainer-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getBrowserClient).mockReturnValue(mockSupabase as any);

    const result = await fetchRoster();

    expect(result).toEqual([]);
  });

  it('handles null data response', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'trainer-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getBrowserClient).mockReturnValue(mockSupabase as any);

    const result = await fetchRoster();

    expect(result).toEqual([]);
  });

  it('handles client with null full_name', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'trainer-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'tc-1',
                  client_id: 'client-1',
                  status: 'active',
                  client: {
                    id: 'client-1',
                    full_name: null,
                    email: 'client@example.com',
                  },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getBrowserClient).mockReturnValue(mockSupabase as any);

    const result = await fetchRoster();

    expect(result).toEqual([
      {
        id: 'client-1',
        name: 'Unknown',
        email: 'client@example.com',
        status: 'active',
      },
    ]);
  });

  it('throws error when not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    };

    vi.mocked(getBrowserClient).mockReturnValue(mockSupabase as any);

    await expect(fetchRoster()).rejects.toThrow('Not authenticated');
  });

  it('throws error when query fails', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'trainer-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      }),
    };

    vi.mocked(getBrowserClient).mockReturnValue(mockSupabase as any);

    await expect(fetchRoster()).rejects.toThrow('Database error');
  });
});
