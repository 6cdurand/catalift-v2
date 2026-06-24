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

  // G-25: invite acceptance is feature-flagged OFF — a token shows the
  // "coming soon" state and NEVER opens a password-setup form.
  test("invite with a token shows the disabled state, no setup form", async ({
    page,
  }) => {
    await page.goto("/invite?token=sometoken123");

    await expect(page.getByText("Invitations Coming Soon")).toBeVisible();
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
