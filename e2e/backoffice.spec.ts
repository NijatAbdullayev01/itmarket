import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("staff login has accessible form semantics", async ({ page }) => {
  await page.route("**/api/v1/staff/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "HTTP_401", message: "Unauthorized" }),
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Backoffice girişi" }),
  ).toBeVisible();
  await expect(page.getByLabel("İş e-poçtu")).toBeVisible();
  await expect(page.getByLabel("Şifrə")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("skip link moves focus to staff content", async ({ page }) => {
  await page.route("**/api/v1/staff/auth/me", (route) =>
    route.fulfill({ status: 401, body: "{}" }),
  );
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Əsas məzmuna keç" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#staff-content")).toBeFocused();
});
