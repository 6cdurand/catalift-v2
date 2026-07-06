/**
 * roster.test.ts — Trainer roster API tests
 * Focus: fetchRoster returns active clients, handles empty roster, handles errors
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRoster, fetchClients } from '../api/roster';
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

describe('fetchClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Builds a supabase mock where `from()` returns table-specific builders.
  function buildMock({
    user = { id: 'trainer-123' },
    trainerClients = { data: [] as any[], error: null as any },
    workouts = { data: [] as any[], error: null as any },
  }: {
    user?: { id: string } | null;
    trainerClients?: { data: any[] | null; error: any };
    workouts?: { data: any[] | null; error: any };
  }) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trainer_clients') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(trainerClients),
            }),
          };
        }
        // workouts
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue(workouts),
          }),
        };
      }),
    };
  }

  it('returns all statuses with derived stats and session counts', async () => {
    const mock = buildMock({
      trainerClients: {
        data: [
          {
            id: 'tc-1',
            client_id: 'client-1',
            status: 'active',
            client: { id: 'client-1', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
          },
          {
            id: 'tc-2',
            client_id: 'client-2',
            status: 'pending',
            client: { id: 'client-2', full_name: 'Jane Smith', email: 'jane@example.com', avatar_url: 'a.png' },
          },
          {
            id: 'tc-3',
            client_id: 'client-3',
            status: 'archived',
            client: { id: 'client-3', full_name: null, email: 'c3@example.com', avatar_url: null },
          },
        ],
        error: null,
      },
      workouts: {
        data: [
          { user_id: 'client-1', performed_at: '2026-01-01T00:00:00Z' },
          { user_id: 'client-1', performed_at: '2026-02-01T00:00:00Z' },
          { user_id: 'client-2', performed_at: '2026-03-15T00:00:00Z' },
        ],
        error: null,
      },
    });

    vi.mocked(getBrowserClient).mockReturnValue(mock as any);

    const result = await fetchClients();

    expect(result.stats).toEqual({ active: 1, pending: 1, total: 3 });
    expect(result.clients).toEqual([
      {
        id: 'client-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        avatarUrl: null,
        sessions: 2,
        lastSeen: '2026-02-01T00:00:00Z',
      },
      {
        id: 'client-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'pending',
        avatarUrl: 'a.png',
        sessions: 1,
        lastSeen: '2026-03-15T00:00:00Z',
      },
      {
        id: 'client-3',
        name: 'Unknown',
        email: 'c3@example.com',
        status: 'archived',
        avatarUrl: null,
        sessions: 0,
        lastSeen: null,
      },
    ]);
  });

  it('returns empty roster with zeroed stats and skips the workouts query', async () => {
    const mock = buildMock({ trainerClients: { data: [], error: null } });
    vi.mocked(getBrowserClient).mockReturnValue(mock as any);

    const result = await fetchClients();

    expect(result).toEqual({ clients: [], stats: { active: 0, pending: 0, total: 0 } });
    // Only trainer_clients is queried when there are no clients.
    expect(mock.from).toHaveBeenCalledTimes(1);
    expect(mock.from).toHaveBeenCalledWith('trainer_clients');
  });

  it('throws when not authenticated', async () => {
    const mock = buildMock({ user: null });
    vi.mocked(getBrowserClient).mockReturnValue(mock as any);

    await expect(fetchClients()).rejects.toThrow('Not authenticated');
  });

  it('throws when the roster query fails', async () => {
    const mock = buildMock({
      trainerClients: { data: null, error: new Error('Database error') },
    });
    vi.mocked(getBrowserClient).mockReturnValue(mock as any);

    await expect(fetchClients()).rejects.toThrow('Database error');
  });
});
