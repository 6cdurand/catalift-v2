import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  // Design tweak #1: the chooser is gone — root is a server redirect.
  test("root redirects a signed-out visitor to /login (no chooser)", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    // v1 branded look: "Catalift" wordmark hero + "Welcome Back" card.
    // (shadcn CardTitle renders a <div>, not a heading — assert by text.)
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Create Account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("auth tabs navigate between /login and /signup", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("tab", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    // Unique to the wizard's credentials step (avoids the "Create Account"
    // tab/title/button collision).
    await expect(
      page.getByText("Start your fitness journey today"),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });

  test("signup wizard steps credentials → profile → goals (role switch)", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByText("Start your fitness journey today"),
    ).toBeVisible();

    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Username").fill("newuser");
    await page.getByLabel("Password", { exact: true }).fill("hunter2pass");
    await page.getByLabel("Confirm Password").fill("hunter2pass");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("About You")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Your Path", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Are you a Personal Trainer?" }),
    ).toBeVisible();
  });
});
