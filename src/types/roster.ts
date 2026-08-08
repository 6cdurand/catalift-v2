export interface RosterClient {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface RosterClientDetail extends RosterClient {
  avatarUrl: string | null;
  username: string | null;
  /**
   * Count of rows in `public.workouts` for this client. This is a WORKOUT
   * count, not a session count — the only authority for "sessions" is
   * `historical_offset_sessions + client_sessions` (payments `derive.ts`).
   * Label it as workouts wherever it renders (G-14).
   */
  sessions: number;
  lastSeen: string | null;
}

export interface RosterStats {
  active: number;
  pending: number;
  total: number;
}

export interface RosterResult {
  clients: RosterClientDetail[];
  stats: RosterStats;
}
