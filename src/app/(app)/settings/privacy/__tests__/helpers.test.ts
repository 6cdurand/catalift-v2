import { describe, it, expect } from "vitest";
import {
  PRIVACY_SETTINGS_ROUTE,
  DATA_EXPORT_EMAIL,
  CHANGE_PASSWORD_COOLDOWN_MS,
  buildPasswordRecoveryRequestBody,
  buildDataExportMailto,
} from "../helpers";

describe("privacy helpers", () => {
  it("PRIVACY_SETTINGS_ROUTE is /settings/privacy", () => {
    expect(PRIVACY_SETTINGS_ROUTE).toBe("/settings/privacy");
  });

  it("DATA_EXPORT_EMAIL is the ops inbox", () => {
    expect(DATA_EXPORT_EMAIL).toBe("hello@catalift.net");
  });

  it("CHANGE_PASSWORD_COOLDOWN_MS is 30 seconds", () => {
    expect(CHANGE_PASSWORD_COOLDOWN_MS).toBe(30_000);
  });

  it("buildPasswordRecoveryRequestBody returns action + email", () => {
    const body = buildPasswordRecoveryRequestBody("user@example.com");
    expect(body).toEqual({ action: "request", email: "user@example.com" });
  });

  it("buildDataExportMailto produces a mailto URL with subject and body", () => {
    const mailto = buildDataExportMailto("user@example.com");
    expect(mailto).toContain("mailto:hello@catalift.net");
    expect(mailto).toContain("subject=Data Export Request - user@example.com");
    expect(mailto).toContain("body=Please send me a copy");
  });

  it("buildDataExportMailto accepts a custom recipient", () => {
    const mailto = buildDataExportMailto("user@example.com", "custom@ops.test");
    expect(mailto).toContain("mailto:custom@ops.test");
  });
});
