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
    page.getByRole("heading", { level: 1, name: "Sifarişi rəsmiləşdir" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Davam et" }).click();
  await page.getByLabel("Ad və soyad").fill("Aysel Məmmədova");
  await page.getByLabel("Telefon").fill("+994501234567");
  await page.getByLabel("E-poçt").fill("aysel@example.test");
  await page.getByLabel("Ünvan").fill("Bakı şəhəri, Nizami küçəsi 10");
  await page.getByRole("button", { name: "Davam et" }).click();
  await page.getByRole("button", { name: "Təsdiqə keç" }).click();
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
    page.getByRole("heading", { level: 1, name: "Sifarişi rəsmiləşdir" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Davam et" }).click();
  await page.getByLabel("Ad və soyad").fill("Online Müştəri");
  await page.getByLabel("Telefon").fill("+994501112233");
  await page.getByLabel("E-poçt").fill("online@example.test");
  await page.getByLabel("Ünvan").fill("Bakı şəhəri, test küçəsi 15");
  await page.getByRole("button", { name: "Davam et" }).click();
  await page.getByRole("button", { name: "Təsdiqə keç" }).click();
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

    await page.getByLabel("Təhvil alma növü").selectOption("PICKUP");
    await page.getByRole("button", { name: "Davam et" }).click();
    await page.getByLabel("Ad və soyad").fill("Mobil Müştəri");
    await page.getByLabel("Telefon").fill("+994509999999");
    await page.getByLabel("Ünvan").fill("Pickup üçün təsdiq ünvanı");
    await page.getByRole("button", { name: "Davam et" }).click();
    await page.getByRole("button", { name: "Təsdiqə keç" }).click();
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

  const deliveryZoneSelect = page.getByLabel("Çatdırılma zonası");
  await expect(deliveryZoneSelect).toHaveValue("zone-baku");

  await page.getByLabel("Rayon/ərazi").fill("sumqayit");
  await expect(
    page.getByText("Seçilmiş rayon üçün aktiv çatdırılma zonası yoxdur."),
  ).toBeVisible();
  await expect(deliveryZoneSelect).toHaveValue("");

  await page.getByLabel("Rayon/ərazi").fill("baku");
  await expect(deliveryZoneSelect).toHaveValue("zone-baku");
});
