import { test, expect, type Page } from "@playwright/test";

type ProbeWindow = typeof window & { __shellProbe?: string };

const SUPABASE_REF = "igagmdkdzjkxrwnyvgqk";
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const COOKIE_NAME = `sb-${SUPABASE_REF}-auth-token`;

const fakeUser = {
  id: "test-user-id",
  email: "test@catalift.dev",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { mode: "client" },
  created_at: new Date().toISOString(),
};

const fakeSession = {
  access_token: "fake-access-token",
  refresh_token: "fake-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: fakeUser,
};

async function mockAuth(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/user") && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeUser),
      });
      return;
    }

    if (url.includes("/token") && method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeSession),
      });
      return;
    }

    await route.continue();
  });

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: encodeURIComponent(JSON.stringify(fakeSession)),
      domain: "localhost",
      path: "/",
    },
  ]);
}

test.describe("App shell", () => {
  test("shell stays mounted across tab navigation (soft nav, no reload)", async ({
    page,
  }) => {
    await mockAuth(page);
    await page.goto("/today");

    const tabBar = page.getByTestId("app-tab-bar");
    await expect(tabBar).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    await page.evaluate(() => {
      (window as ProbeWindow).__shellProbe = "mounted";
    });

    await tabBar.getByRole("button", { name: "Feed" }).click();

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole("heading", { name: "Feed" })).toBeVisible();
    await expect(tabBar).toBeVisible();

    const probe = await page.evaluate(
      () => (window as ProbeWindow).__shellProbe,
    );
    expect(probe).toBe("mounted");
  });
});
