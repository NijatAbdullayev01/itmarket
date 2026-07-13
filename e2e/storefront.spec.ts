import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("empty cart remains keyboard and screen-reader accessible", async ({
  page,
}) => {
  await page.goto("/cart");

  await expect(
    page.getByRole("heading", { level: 1, name: "Səbət boşdur" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kataloqa qayıt" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("product journey fallback has one main landmark", async ({ page }) => {
  await page.goto("/cart");

  await expect(page.getByRole("main")).toHaveCount(1);
  await page.getByRole("link", { name: "Kataloqa qayıt" }).focus();
  await expect(
    page.getByRole("link", { name: "Kataloqa qayıt" }),
  ).toBeFocused();
});
