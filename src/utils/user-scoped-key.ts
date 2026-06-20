export function userScopedKey(resource: string, userId: string): string {
  return `catalift-${resource}-${userId}`;
}
