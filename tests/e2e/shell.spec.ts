import { test, expect } from "@playwright/test";

type ProbeWindow = typeof window & { __shellProbe?: string };

test.describe("App shell", () => {
  test("shell stays mounted across tab navigation (soft nav, no reload)", async ({
    page,
  }) => {
    await page.goto("/home");

    const header = page.getByTestId("app-header");
    const tabBar = page.getByTestId("app-tab-bar");
    await expect(header).toBeVisible();
    await expect(tabBar).toBeVisible();
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

    // Mark the live JS context. A full page reload would wipe this; a soft
    // client-side navigation keeps the shell — and this flag — mounted.
    await page.evaluate(() => {
      (window as ProbeWindow).__shellProbe = "mounted";
    });

    await tabBar.getByRole("link", { name: "Workouts" }).click();

    await expect(page).toHaveURL(/\/workouts$/);
    await expect(page.getByRole("heading", { name: "Workouts" })).toBeVisible();

    // Shell chrome is still on screen after navigating.
    await expect(header).toBeVisible();
    await expect(tabBar).toBeVisible();

    // The probe survived the navigation => no full reload, shell never unmounted.
    const probe = await page.evaluate(
      () => (window as ProbeWindow).__shellProbe,
    );
    expect(probe).toBe("mounted");
  });
});
