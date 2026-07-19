import { test, expect } from "@playwright/test";
import { mockAuthSession } from "./auth-helpers";

type ProbeWindow = typeof window & { __shellProbe?: string };

test.describe("App shell", () => {
  test("shell stays mounted across tab navigation (soft nav, no reload)", async ({
    page,
  }) => {
    await mockAuthSession(page);
    await page.goto("/today");

    const tabBar = page.getByTestId("app-tab-bar");
    await expect(tabBar).toBeVisible();
    await expect(
      page.getByTestId("app-header").getByRole("heading", { name: "Today", exact: true })
    ).toBeVisible();

    await page.evaluate(() => {
      (window as ProbeWindow).__shellProbe = "mounted";
    });

    await tabBar.getByRole("button", { name: "Feed" }).click();

    await expect(page).toHaveURL(/\/feed$/);
    await expect(
      page.getByTestId("app-header").getByRole("heading", { name: "Feed", exact: true })
    ).toBeVisible();
    await expect(tabBar).toBeVisible();

    const probe = await page.evaluate(
      () => (window as ProbeWindow).__shellProbe,
    );
    expect(probe).toBe("mounted");
  });
});
