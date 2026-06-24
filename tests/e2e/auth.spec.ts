import { test, expect, type Page } from "@playwright/test";

const SUPABASE_REF = "igagmdkdzjkxrwnyvgqk";
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;

/** Deterministic stubs for the Supabase auth endpoints (no live backend). */
async function mockAuthEndpoints(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Password recovery → always 200 (enumeration-safe).
    if (url.includes("/recover")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }

    // Password sign-in → 400 invalid credentials.
    if (url.includes("/token") && method === "POST") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Auth — branded UI + flows", () => {
  test("login with bad credentials shows an error toast, no crash", async ({
    page,
  }) => {
    await mockAuthEndpoints(page);
    await page.goto("/login");

    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    // Still on the login page — no white-screen / crash.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });

  test("forgot-password modal shows a neutral confirmation (no enumeration)", async ({
    page,
  }) => {
    await mockAuthEndpoints(page);
    await page.goto("/login");

    await page.getByRole("button", { name: "Forgot password?" }).click();

    // Modal opened (scope to it to avoid the login form behind it).
    const dialog = page.getByRole("dialog", { name: "Reset your password" });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("your@email.com").fill("someone@example.com");
    await dialog.getByRole("button", { name: "Send Recovery Link" }).click();

    await expect(page.getByTestId("forgot-confirmation")).toBeVisible();
    await expect(
      page.getByText("If an account exists for that email"),
    ).toBeVisible();
  });

  // Stub the security-definer `verify_invitation` RPC (no live backend).
  async function mockVerifyInvitation(
    page: Page,
    rows: Array<{ email: string; trainer_name: string; valid: boolean }>,
  ) {
    await page.route(`${SUPABASE_URL}/rest/v1/rpc/verify_invitation`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(rows),
      });
    });
  }

  // G-25: a server-verified VALID token opens the invited flow (shows the
  // invited email + the "Sign Up & Accept" CTA).
  test("invite with a server-verified valid token shows the invited state", async ({
    page,
  }) => {
    await mockVerifyInvitation(page, [
      { email: "client@example.com", trainer_name: "Coach Sam", valid: true },
    ]);
    await page.goto("/invite?token=goodtoken123");

    await expect(page.getByText("You're Invited!")).toBeVisible();
    await expect(page.getByText("client@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up & Accept" })).toBeVisible();
  });

  // G-25: an invalid/expired/used token (valid=false) must NEVER open a setup
  // or accept flow — it shows the invalid state only.
  test("invite with an invalid token shows the invalid state, no accept CTA", async ({
    page,
  }) => {
    await mockVerifyInvitation(page, [
      { email: "client@example.com", trainer_name: "Coach Sam", valid: false },
    ]);
    await page.goto("/invite?token=expiredtoken");

    await expect(page.getByText("Invalid Invitation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up & Accept" })).toHaveCount(0);
    await expect(page.getByText("Set Up Your Account")).toHaveCount(0);
  });

  // G-25 Sev-0 gate: a bare `?email=` with NO token never opens setup/accept —
  // the verify RPC is never even called without a token.
  test("invite with a bare ?email= and no token shows invalid, no setup", async ({
    page,
  }) => {
    await page.goto("/invite?email=victim@example.com");

    await expect(page.getByText("Invalid Invitation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up & Accept" })).toHaveCount(0);
    await expect(page.getByText("Set Up Your Account")).toHaveCount(0);
  });

  // G-25: a bare `?email=` param must NOT open any setup flow on /login.
  test("login with ?email= does not open a setup flow", async ({ page }) => {
    await page.goto("/login?email=victim@example.com");

    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(page.getByText("Set Up Your Account")).toHaveCount(0);
    await expect(page.getByText("Create Password")).toHaveCount(0);
  });
});
