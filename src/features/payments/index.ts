export type {
  SessionSource,
  PaymentMethod,
  PaymentStatus,
  ClientSession,
  ClientPayment,
  ClientBilling,
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

export { fetchClientBilling } from "./api/billing";

export {
  useClientPayments,
  DEFAULT_CURRENCY,
  type UseClientPaymentsResult,
} from "./hooks/useClientPayments";

export { ClientPaymentsSection } from "./components/ClientPaymentsSection";
