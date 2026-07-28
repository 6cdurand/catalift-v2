export type {
  SessionSource,
  PaymentMethod,
  PaymentStatus,
  ClientSession,
  ClientPayment,
  ClientBilling,
  TrainerClientBilling,
  OutstandingResult,
} from "./types";

export {
  getDisplayedSessionCount,
  getDisplayedPaidCount,
  getOutstanding,
} from "./lib/derive";

export {
  buildTrainerPaymentRows,
  buildTrainerEarnings,
  dominantCurrency,
  FALLBACK_CURRENCY,
  type TrainerPaymentRow as TrainerPaymentRowData,
  type TrainerPaymentTotals,
  type TrainerPaymentsAggregate,
  type TrainerEarnings,
} from "./lib/aggregate";

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
  fetchTrainerPayments,
  logPayment,
  adjustPaidOffset,
  updateClientRate,
  type LogPaymentParams,
} from "./api/payments";

export {
  fetchClientBilling,
  fetchTrainerClientBilling,
} from "./api/billing";

export {
  useClientPayments,
  DEFAULT_CURRENCY,
  type UseClientPaymentsResult,
} from "./hooks/useClientPayments";

export {
  useTrainerPayments,
  type UseTrainerPaymentsResult,
} from "./hooks/useTrainerPayments";

export { ClientPaymentsSection } from "./components/ClientPaymentsSection";

export { TrainerPaymentsSurface } from "./components/TrainerPaymentsSurface";
