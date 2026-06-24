import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("homepage renders and shows auth links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Catalift" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("click login link → see branded login form", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Register" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("click signup link → see branded signup form with role toggle", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: "Client" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Trainer" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
