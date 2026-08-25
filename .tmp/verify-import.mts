import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/prisma/client";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        "postgresql://itmarket_local:local_itmarket_postgres_only@localhost:5433/itmarket_local?schema=public",
    }),
  });

  const skuPrefixes = ["CIS-", "ARU-", "HP-", "FOR-", "PAL-", "TPL-", "LIN-", "GRA-"];
  const variants = await prisma.productVariant.findMany({
    where: { sku: { startsWith: skuPrefixes[0] } },
  });
  const allVariants = await prisma.productVariant.findMany({
    where: { OR: skuPrefixes.map((p) => ({ sku: { startsWith: p } })) },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      previousPrice: true,
      product: { select: { id: true, name: true, slug: true, requiredSpecs: true } },
      inventory: { select: { onHand: true, location: { select: { code: true } } } },
      media: { select: { objectKey: true } },
    },
  });

  console.log(`Total variants matching brand SKU prefixes: ${allVariants.length}`);

  const usedCount = allVariants.filter((v) => v.sku.endsWith("-USED")).length;
  console.log(`Used variants: ${usedCount}`);
  const withStock = allVariants.filter((v) => v.inventory.some((i) => i.onHand > 0)).length;
  console.log(`Variants with stock>0: ${withStock}`);

  const noImage = allVariants.filter((v) => v.media.length === 0).length;
  console.log(`Variants without image: ${noImage}`);

  const sample = allVariants.find((v) => v.sku === "CIS-CAP702W-A-9-USED");
  if (sample) {
    const specs = sample.product.requiredSpecs as Array<Record<string, string>>;
    console.log(`\nSample: ${sample.product.name} | slug=${sample.product.slug}`);
    console.log(`  price=${sample.price} prev=${sample.previousPrice} stock=${sample.inventory.map((i) => `${i.location.code}:${i.onHand}`).join(", ")}`);
    console.log("  Specs (first 6):");
    for (const s of specs.slice(0, 6)) {
      console.log(
        `    AZ: ${s.label}: ${s.value}\n      RU: ${s.labelRu ?? "—"}: ${s.valueRu ?? "—"}\n      EN: ${s.labelEn ?? "—"}: ${s.valueEn ?? "—"}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
