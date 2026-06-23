import { test, expect, type Page } from "@playwright/test";

const SUPABASE_REF = "igagmdkdzjkxrwnyvgqk";
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;

/**
 * Mocks the Supabase auth recovery endpoint so the forgot-password flow is
 * deterministic without a live backend.
 */
async function mockRecover(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes("/recover")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }
    await route.continue();
  });
}

test.describe("Auth — branded UI + flows", () => {
  test("login tab → register tab navigates between routes", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("tab", { name: "Register" })).toBeVisible();
    await page.getByRole("tab", { name: "Register" }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("role toggle selects trainer (aria-checked reflects choice)", async ({
    page,
  }) => {
    await page.goto("/signup");

    const client = page.getByRole("radio", { name: "Client" });
    const trainer = page.getByRole("radio", { name: "Trainer" });

    await expect(client).toHaveAttribute("aria-checked", "true");
    await expect(trainer).toHaveAttribute("aria-checked", "false");

    await trainer.click();

    await expect(trainer).toHaveAttribute("aria-checked", "true");
    await expect(client).toHaveAttribute("aria-checked", "false");
  });

  test("forgot-password shows a neutral confirmation", async ({ page }) => {
    await mockRecover(page);
    await page.goto("/reset-password");

    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(
      page.getByText("If an account exists for that address"),
    ).toBeVisible();
  });
});
