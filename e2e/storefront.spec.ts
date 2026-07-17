import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("empty cart remains keyboard and screen-reader accessible", async ({
  page,
}) => {
  await page.goto("/cart");

  await expect(
    page.getByRole("navigation", { name: "Səhifə yolu" }),
  ).toContainText("Səbət");
  await expect(
    page.getByRole("link", { name: "Məhsullara bax" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("product journey fallback has one main landmark", async ({ page }) => {
  await page.goto("/cart");

  await expect(page.getByRole("main")).toHaveCount(1);
  await page.getByRole("link", { name: "Məhsullara bax" }).focus();
  await expect(page.getByRole("link", { name: "Məhsullara bax" })).toBeFocused();
});

test("product page opens scrolled to the top", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect
    .poll(async () => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(500);

  await page.locator(".ui-product-card__link").first().click();
  await expect(page).toHaveURL(/\/products\//);

  await expect
    .poll(async () => page.evaluate(() => window.scrollY))
    .toBe(0);
});

test("customer can create a delivery cash order from the storefront", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Məhsullar" }),
  ).toBeVisible();
  await page.getByLabel("Kateqoriya").selectOption("noutbuklar");
  await page.getByLabel("Brend").selectOption("lenovo");
  await page.getByRole("button", { name: "Filterlə" }).click();
  await page.getByRole("link", { name: "Bax" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "ThinkPad X1 Carbon" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Miqdarı artır" }).click();
  await page.getByRole("button", { name: "Bir kliklə al" }).click();

  await expect(
    page.getByRole("navigation", { name: "Səhifə yolu" }),
  ).toContainText("Səbət");

  await page.getByRole("link", { name: "Sifarişi rəsmiləşdir" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(
    page.getByRole("navigation", { name: "Sifariş addımları" }),
  ).toBeVisible();

  await page.getByLabel("Ad").fill("Aysel");
  await page.getByLabel("Soyad").fill("Məmmədova");
  await page.locator("#phone").fill("501234567");
  await page.getByLabel("E-poçt").fill("aysel@example.test");
  await page.getByLabel("Şəhər / rayon").selectOption("baku");
  await page.getByLabel("Ünvan").fill("Bakı şəhəri, Nizami küçəsi 10");
  await page
    .getByRole("button", { name: "Nağd sifariş və rezerv yarat" })
    .click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Sifarişiniz qəbul edildi" }),
  ).toBeVisible();
  await expect(page.getByText(/ITM-E2E-/)).toBeVisible();
});

test("customer can complete a mock online card payment from the storefront", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Bax" }).click();
  await page.getByRole("button", { name: "Bir kliklə al" }).click();

  await expect(
    page.getByRole("navigation", { name: "Səhifə yolu" }),
  ).toContainText("Səbət");

  await page.getByRole("link", { name: "Sifarişi rəsmiləşdir" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(
    page.getByRole("navigation", { name: "Sifariş addımları" }),
  ).toBeVisible();

  await page.getByLabel("Ad").fill("Online");
  await page.getByLabel("Soyad").fill("Müştəri");
  await page.locator("#phone").fill("501112233");
  await page.getByLabel("E-poçt").fill("online@example.test");
  await page.getByLabel("Şəhər / rayon").selectOption("baku");
  await page.getByLabel("Ünvan").fill("Bakı şəhəri, test küçəsi 15");
  await page.getByRole("button", { name: "Kart / taksit ilə davam et" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Kart ödənişi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Uğurlu ödəniş" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Ödəniş uğurla tamamlandı" }),
  ).toBeVisible();
  await expect(page.getByText("Sifariş təsdiqlənib")).toBeVisible();
  await expect(page.getByText("Stok rezerv olunub")).toBeVisible();
});

test.describe("mobile pickup checkout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("customer can create a pickup cash order on mobile", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Bax" }).click();
    await page.getByRole("button", { name: "Bir kliklə al" }).click();

    await expect(
      page.getByRole("navigation", { name: "Səhifə yolu" }),
    ).toContainText("Səbət");

    await page.getByRole("link", { name: "Sifarişi rəsmiləşdir" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await page.getByLabel("Ad").fill("Mobil");
    await page.getByLabel("Soyad").fill("Müştəri");
    await page.locator("#phone").fill("509999999");
    await page.getByLabel("E-poçt").fill("mobile@example.test");
    await page.getByRole("radio", { name: "Mağazadan götürmə" }).click();
    await page.getByLabel("Filial").selectOption({ index: 1 });
    await page
      .getByRole("button", { name: "Nağd sifariş və rezerv yarat" })
      .click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Sifarişiniz qəbul edildi" }),
    ).toBeVisible();
  });
});

test("delivery eligibility reacts to administrative area changes", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Bax" }).click();
  await page.getByRole("button", { name: "Bir kliklə al" }).click();

  await page.getByRole("link", { name: "Sifarişi rəsmiləşdir" }).click();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByLabel("Ad").fill("Test");
  await page.getByLabel("Soyad").fill("Müştəri");
  await page.locator("#phone").fill("501234567");

  await page.getByLabel("Şəhər / rayon").selectOption("baku");
  await expect(page.getByText(/Çatdırılma haqqı:/)).toBeVisible();

  await page.getByLabel("Şəhər / rayon").selectOption("sumqayit");
  await expect(page.getByText(/Çatdırılma haqqı:/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Nağd sifariş və rezerv yarat" }),
  ).toBeDisabled();

  await page.getByLabel("Şəhər / rayon").selectOption("baku");
  await expect(page.getByText(/Çatdırılma haqqı:/)).toBeVisible();
});
