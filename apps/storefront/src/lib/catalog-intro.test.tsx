import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogIntro, defaultCatalogIntroCopy } from "@itmarket/ui";

describe("CatalogIntro", () => {
  it("renders short text directly in a simple paragraph without toggle", () => {
    const html = renderToStaticMarkup(
      <CatalogIntro text="Qısa kateqoriya mətni" clampLength={100} />,
    );

    expect(html).toContain("ui-catalog-intro");
    expect(html).toContain("Qısa kateqoriya mətni");
    expect(html).not.toContain("ui-catalog-intro__toggle");
  });

  it("renders long text in collapsed container with toggle button for mobile compactness and full text for SEO", () => {
    const longText =
      "Şəbəkə avadanlıqları kateqoriyasının ən vacib elementlərindən olan kommutator modelləri, şəbəkə daxilində cihazların sürətli və təhlükəsiz məlumat mübadiləsini təmin edir. IT Market platformasında müxtəlif brendlərin keyfiyyətli məhsulları mövcuddur.";

    const html = renderToStaticMarkup(
      <CatalogIntro text={longText} clampLength={80} />,
    );

    expect(html).toContain("ui-catalog-intro--collapsed");
    expect(html).toContain("ui-catalog-intro__text");
    expect(html).toContain(longText);
    expect(html).toContain("ui-catalog-intro__toggle");
    expect(html).toContain(defaultCatalogIntroCopy.readMore);
    expect(html).toContain('aria-expanded="false"');
  });

  it("returns null when empty or whitespace-only text is passed", () => {
    const html = renderToStaticMarkup(<CatalogIntro text="   " />);
    expect(html).toBe("");
  });
});
