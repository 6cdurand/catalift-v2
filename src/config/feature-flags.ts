export const FEATURE_FLAGS = {
  strengthRating: false,
  medals: false,
  socialFeed: false,
  booking: false,
  healthData: false,
  notifications: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
