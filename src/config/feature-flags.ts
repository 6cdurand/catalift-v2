export const FEATURE_FLAGS = {
  strengthRating: false,
  medals: false,
  socialFeed: false,
  booking: false,
  healthData: false,
  notifications: false,
  // Trainer-invite acceptance. OFF until the `invitations` table + its RLS
  // land in a separate Class-B migration spec. The /invite UI renders
  // verbatim, but the verify/accept path is gated on this flag so we never
  // fake a table or fall back to localStorage (G-02/G-03).
  invites: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
