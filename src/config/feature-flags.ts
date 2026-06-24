export const FEATURE_FLAGS = {
  strengthRating: false,
  medals: false,
  socialFeed: false,
  booking: false,
  healthData: false,
  notifications: false,
  // Trainer-invite acceptance. ON as of migration 00006 (auth-schema-followon):
  // the `invitations` table + its RLS + the verify/accept security-definer RPCs
  // exist, so /invite verifies server-side and accepts via auth.uid() (G-25).
  invites: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
