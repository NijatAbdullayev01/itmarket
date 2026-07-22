import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function selectCheckoutAdministrativeArea(
  page: Page,
  query: string,
  optionLabel: string,
) {
  const field = page.getByRole("combobox", { name: "Şəhər / Rayon" });
  await field.click();
  await field.fill(query);
  await page
    .getByRole("listbox", { name: "Şəhər və rayonlar" })
    .getByRole("option", { name: optionLabel, exact: true })
    .click();
}

async function selectCheckoutBakuDistrict(
  page: Page,
  query: string,
  optionLabel: string,
) {
  const field = page.getByRole("combobox", { name: "Rayon" });
  await field.click();
  await field.fill(query);
  await page
    .getByRole("listbox", { name: "Rayonlar" })
    .getByRole("option", { name: optionLabel, exact: true })
    .click();
}

async function selectCheckoutBakuDeliveryArea(
  page: Page,
  districtQuery: string,
  districtLabel: string,
) {
  await selectCheckoutAdministrativeArea(page, "Bakı", "Bakı");
  await selectCheckoutBakuDistrict(page, districtQuery, districtLabel);
}

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

test("brand bar filter opens catalog scrolled to the top", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect
    .poll(async () => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(500);

  const brandLink = page.locator(".ui-brand-bar__group:not([aria-hidden]) .ui-brand-bar__item").first();
  await expect(brandLink).toBeVisible();
  await brandLink.click();

  await expect(page).toHaveURL(/\/?\?brand=/);
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
  await selectCheckoutBakuDeliveryArea(page, "Nizami", "Nizami");
  await page.getByLabel("Ünvan").fill("Bakı şəhəri, Nizami küçəsi 10");
  await page.getByLabel("Çatdırılma tarixi").fill("2026-07-20");
  await page.getByLabel("Çatdırılma saatı").selectOption("14:00");
  await page.getByRole("radio", { name: "Hissə-hissə al" }).click();
  await page.getByRole("button", { name: "Sifarişi tamamla" }).click();

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
  await selectCheckoutBakuDeliveryArea(page, "Nizami", "Nizami");
  await page.getByLabel("Ünvan").fill("Bakı şəhəri, test küçəsi 15");
  await page.getByLabel("Çatdırılma tarixi").fill("2026-07-20");
  await page.getByLabel("Çatdırılma saatı").selectOption("15:30");
  await page.getByRole("radio", { name: "Kartla ödə" }).click();
  await page.getByRole("button", { name: "Sifarişi tamamla" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Kart ödənişi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ödənişə keç" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Ödəniş uğurla tamamlandı" }),
  ).toBeVisible();
  await expect(page.getByText("Sifariş təsdiqlənib")).toBeVisible();
  await expect(page.getByText("Ünvana çatdırılma")).toBeVisible();
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
    await page.getByRole("radio", { name: "Hissə-hissə al" }).click();
    await page.getByRole("button", { name: "Sifarişi tamamla" }).click();

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

  await selectCheckoutBakuDeliveryArea(page, "Nizami", "Nizami");
  await expect(page.getByText(/Çatdırılma haqqı:/)).toBeVisible();

  await selectCheckoutAdministrativeArea(page, "Sumqayıt", "Sumqayıt");
  await expect(page.getByText(/Çatdırılma haqqı:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sifarişi tamamla" })).toBeDisabled();

  await selectCheckoutBakuDeliveryArea(page, "Nizami", "Nizami");
  await expect(page.getByText(/Çatdırılma haqqı:/)).toBeVisible();
});
