import { describe, expect, it } from "vitest";
import { getCategoryTree } from "@itmarket/ui";

describe("getCategoryTree", () => {
  it("attaches nested subcategories under their parent", () => {
    const tree = getCategoryTree([
      { id: "energy", name: "Portativ enerji", slug: "portativ-enerji" },
      {
        id: "stations",
        name: "Enerji stansiyaları",
        slug: "enerji-stansiyalari",
        parentId: "energy",
      },
      {
        id: "solar",
        name: "Günəş panelləri",
        slug: "gunes-panelleri",
        parentId: "energy",
      },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.slug).toBe("portativ-enerji");
    expect(tree[0]?.children.map((child) => child.slug)).toEqual([
      "enerji-stansiyalari",
      "gunes-panelleri",
    ]);
  });

  it("keeps grandchild categories reachable from the parent node", () => {
    const tree = getCategoryTree([
      { id: "energy", name: "Portativ enerji", slug: "portativ-enerji" },
      {
        id: "stations",
        name: "Enerji stansiyaları",
        slug: "enerji-stansiyalari",
        parentId: "energy",
      },
      {
        id: "ac",
        name: "AC stansiyalar",
        slug: "ac-stansiyalar",
        parentId: "stations",
      },
    ]);

    expect(tree[0]?.children[0]?.children.map((child) => child.slug)).toEqual([
      "ac-stansiyalar",
    ]);
  });
});
