export type {
  SessionSource,
  PaymentMethod,
  PaymentStatus,
  ClientSession,
  ClientPayment,
  OutstandingResult,
} from "./types";

export {
  getDisplayedSessionCount,
  getDisplayedPaidCount,
  getOutstanding,
} from "./lib/derive";

export {
  fetchClientSessions,
  fetchTrainerSessions,
  markSessionComplete,
  addManualSession,
  adjustSessionOffset,
  type MarkSessionCompleteParams,
  type TrainerSessionRange,
} from "./api/sessions";

export {
  fetchClientPayments,
  logPayment,
  adjustPaidOffset,
  updateClientRate,
  type LogPaymentParams,
} from "./api/payments";
