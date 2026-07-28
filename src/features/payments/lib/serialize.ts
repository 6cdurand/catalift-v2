import type { Database } from "@/types/database";
import type {
  ClientPayment,
  ClientSession,
  PaymentMethod,
  PaymentStatus,
  SessionSource,
} from "../types";

type SessionRow = Database["public"]["Tables"]["client_sessions"]["Row"];
type PaymentRow = Database["public"]["Tables"]["client_payments"]["Row"];

export function rowToClientSession(r: SessionRow): ClientSession {
  return {
    id: r.id,
    trainerId: r.trainer_id,
    clientId: r.client_id,
    sessionDate: r.session_date,
    source: r.source as SessionSource,
    workoutId: r.workout_id,
    calendarEventId: r.calendar_event_id,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export function rowToClientPayment(r: PaymentRow): ClientPayment {
  return {
    id: r.id,
    trainerId: r.trainer_id,
    clientId: r.client_id,
    amount: Number(r.amount),
    currency: r.currency,
    sessionsIncluded: r.sessions_included,
    method: r.method as PaymentMethod | null,
    status: r.status as PaymentStatus,
    description: r.description,
    paidAt: r.paid_at,
    createdAt: r.created_at,
  };
}
