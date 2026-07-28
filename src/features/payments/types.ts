export type SessionSource = "pt_completion" | "booking" | "manual_plus_one";

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "other";

export type PaymentStatus = "pending" | "paid" | "overdue" | "refunded";

export interface ClientSession {
  id: string;
  trainerId: string;
  clientId: string;
  sessionDate: string;
  source: SessionSource;
  workoutId: string | null;
  calendarEventId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  trainerId: string;
  clientId: string;
  amount: number;
  currency: string;
  sessionsIncluded: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OutstandingResult {
  outstandingSessions: number;
  outstandingAmount: number | null;
  hasOutstanding: boolean;
}
