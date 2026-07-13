export const PRIVACY_SETTINGS_ROUTE = '/settings/privacy';

export const DATA_EXPORT_EMAIL = 'hello@catalift.net';

export const CHANGE_PASSWORD_COOLDOWN_MS = 30_000;

export function buildPasswordRecoveryRequestBody(
  email: string,
): { action: 'request'; email: string } {
  return { action: 'request', email };
}

export function buildDataExportMailto(
  accountEmail: string,
  to: string = DATA_EXPORT_EMAIL,
): string {
  const subject = `Data Export Request - ${accountEmail}`;
  const body =
    `Please send me a copy of all data associated with my Catalift account. ` +
    `Account email: ${accountEmail}`;
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
