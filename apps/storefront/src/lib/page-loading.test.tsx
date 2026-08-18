import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageLoading } from "@itmarket/ui";

describe("PageLoading", () => {
  it("home skeleton matches hero geometry and does not fade from empty", () => {
    const html = renderToStaticMarkup(
      <PageLoading variant="home" showTitle={false} />,
    );

    expect(html).toContain("ui-page-loading--home");
    expect(html).toContain("ui-home-hero__grid");
    expect(html).toContain("ui-category-sidebar-shell");
    expect(html).not.toContain("ui-page-enter");
  });

  it("catalog skeleton keeps a product grid without a fade-in class", () => {
    const html = renderToStaticMarkup(
      <PageLoading variant="catalog" showTitle={false} />,
    );

    expect(html).toContain("ui-page-loading--catalog");
    expect(html).toContain("ui-product-grid");
    expect(html).not.toContain("ui-page-enter");
  });
});
