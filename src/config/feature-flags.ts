export const FEATURE_FLAGS = {
  strengthRating: false,
  medals: false,
  socialFeed: false,
  booking: false,
  healthData: false,
  notifications: false,
  calendarWeekDayView: false,
  // Trainer-invite acceptance. The `invitations` table, `verify_invitation` /
  // `accept_invitation` RPCs, and `invitations_trainer_all` RLS policy are
  // live. The /invite UI verifies + accepts via real server-side RPCs.
  invites: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
