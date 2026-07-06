export interface RosterClient {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface RosterClientDetail extends RosterClient {
  avatarUrl: string | null;
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
