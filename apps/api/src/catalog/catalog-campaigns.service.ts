import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import {
  CatalogStatus,
  Prisma,
  StorefrontCampaignKind,
} from '../generated/prisma/client';
import type { StaffPrincipal } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  PRODUCT_MEDIA_STORAGE,
  type ProductMediaStorage,
} from './media-storage.port';
import { withMediaReadUrlList } from './media-read-url';
import { scheduleStorefrontCatalogRevalidate } from './storefront-catalog-revalidate';
import {
  HOME_BESTSELLERS_LIMIT,
  HOME_BESTSELLERS_WINDOW_DAYS,
  HOME_WEEKLY_DEAL_MAX,
} from './bestsellers-ranking';
import { queryBestsellerSoldQuantities } from './bestsellers-query';

type CampaignActor = Pick<StaffPrincipal, 'id'>;

export class AddWeeklyDealDto {
  @IsUUID()
  productId!: string;
}

export class ReorderWeeklyDealDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(HOME_WEEKLY_DEAL_MAX)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

const weeklyDealProductInclude = {
  brand: { select: { id: true, name: true } },
  media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  variants: {
    where: { status: CatalogStatus.ACTIVE },
    select: { id: true, sku: true, price: true },
    orderBy: { price: 'asc' as const },
    take: 1,
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class CatalogCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_MEDIA_STORAGE)
    private readonly mediaStorage: ProductMediaStorage,
  ) {}

  private bumpHomeCatalogCache() {
    scheduleStorefrontCatalogRevalidate({
      paths: ['/'],
      tags: ['catalog'],
    });
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: CampaignActor,
    action: string,
    entityType: string,
    entityId: string,
    before: Prisma.InputJsonValue | undefined,
    after: Prisma.InputJsonValue | undefined,
  ) {
    await tx.auditLog.create({
      data: {
        actorType: 'staff',
        actorId: actor.id,
        action,
        entityType,
        entityId,
        before: before === undefined ? Prisma.DbNull : before,
        after: after === undefined ? Prisma.DbNull : after,
      },
    });
  }

  async listBestsellers(limit = HOME_BESTSELLERS_LIMIT) {
    const ranked = await queryBestsellerSoldQuantities(this.prisma, {
      limit,
      windowDays: HOME_BESTSELLERS_WINDOW_DAYS,
    });
    if (ranked.length === 0) {
      return {
        windowDays: HOME_BESTSELLERS_WINDOW_DAYS,
        items: [],
      };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ranked.map((row) => row.productId) } },
      include: weeklyDealProductInclude,
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const items = await Promise.all(
      ranked.flatMap((row) => {
        const product = byId.get(row.productId);
        if (product === undefined) {
          return [];
        }
        return [
          this.withProductMedia({
            productId: row.productId,
            soldQty: row.soldQty,
            product,
          }),
        ];
      }),
    );

    return {
      windowDays: HOME_BESTSELLERS_WINDOW_DAYS,
      items,
    };
  }

  async listWeeklyDeals() {
    const rows = await this.prisma.storefrontCampaignProduct.findMany({
      where: { kind: StorefrontCampaignKind.WEEKLY_DEAL },
      include: { product: { include: weeklyDealProductInclude } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      items: await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          productId: row.productId,
          sortOrder: row.sortOrder,
          product: await this.attachProductMedia(row.product),
        })),
      ),
    };
  }

  async addWeeklyDeal(dto: AddWeeklyDealDto, actor: CampaignActor) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        variants: {
          where: { status: CatalogStatus.ACTIVE },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (product === null) {
      throw new NotFoundException('Məhsul tapılmadı');
    }
    if (product.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException(
        'Yalnız aktiv məhsullar həftənin təklifinə əlavə oluna bilər',
      );
    }
    if (product.variants.length === 0) {
      throw new BadRequestException(
        'Aktiv satış variantı olmayan məhsul əlavə oluna bilməz',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.storefrontCampaignProduct.findUnique({
        where: {
          kind_productId: {
            kind: StorefrontCampaignKind.WEEKLY_DEAL,
            productId: product.id,
          },
        },
        select: { id: true },
      });
      if (existing !== null) {
        throw new ConflictException('Bu məhsul artıq həftənin təklifindədir');
      }

      const count = await tx.storefrontCampaignProduct.count({
        where: { kind: StorefrontCampaignKind.WEEKLY_DEAL },
      });
      if (count >= HOME_WEEKLY_DEAL_MAX) {
        throw new BadRequestException(
          `Həftənin təklifində ən çox ${HOME_WEEKLY_DEAL_MAX} məhsul ola bilər`,
        );
      }

      const aggregate = await tx.storefrontCampaignProduct.aggregate({
        where: { kind: StorefrontCampaignKind.WEEKLY_DEAL },
        _max: { sortOrder: true },
      });
      const row = await tx.storefrontCampaignProduct.create({
        data: {
          kind: StorefrontCampaignKind.WEEKLY_DEAL,
          productId: product.id,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
      await this.audit(
        tx,
        actor,
        'storefront-campaign.weekly-deal.added',
        'storefront-campaign-product',
        row.id,
        undefined,
        {
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          sortOrder: row.sortOrder,
        },
      );
      return row;
    });

    this.bumpHomeCatalogCache();
    return created;
  }

  async removeWeeklyDeal(id: string, actor: CampaignActor) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.storefrontCampaignProduct.findUnique({
        where: { id },
        select: {
          id: true,
          kind: true,
          productId: true,
          sortOrder: true,
        },
      });
      if (
        before === null ||
        before.kind !== StorefrontCampaignKind.WEEKLY_DEAL
      ) {
        throw new NotFoundException('Həftənin təklifi tapılmadı');
      }

      await tx.storefrontCampaignProduct.delete({ where: { id } });
      await this.audit(
        tx,
        actor,
        'storefront-campaign.weekly-deal.removed',
        'storefront-campaign-product',
        id,
        {
          productId: before.productId,
          sortOrder: before.sortOrder,
        },
        undefined,
      );
    });

    this.bumpHomeCatalogCache();
    return { ok: true };
  }

  async reorderWeeklyDeals(orderedIds: string[], actor: CampaignActor) {
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.storefrontCampaignProduct.findMany({
        where: { kind: StorefrontCampaignKind.WEEKLY_DEAL },
        select: { id: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      if (orderedIds.length !== rows.length) {
        throw new BadRequestException(
          'Sıra bütün həftənin təklifi məhsullarını əhatə etməlidir',
        );
      }

      const knownIds = new Set(rows.map((row) => row.id));
      if (orderedIds.some((id) => !knownIds.has(id))) {
        throw new BadRequestException('Sırada naməlum məhsul var');
      }
      if (new Set(orderedIds).size !== orderedIds.length) {
        throw new BadRequestException('Sırada təkrarlanan məhsul var');
      }

      await Promise.all(
        orderedIds.map((id, index) =>
          tx.storefrontCampaignProduct.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );
      await this.audit(
        tx,
        actor,
        'storefront-campaign.weekly-deal.reordered',
        'storefront-campaign',
        StorefrontCampaignKind.WEEKLY_DEAL,
        { orderedIds: rows.map((row) => row.id) },
        { orderedIds },
      );
    });

    this.bumpHomeCatalogCache();
    return { ok: true };
  }

  private async withProductMedia<
    T extends {
      product: Prisma.ProductGetPayload<{
        include: typeof weeklyDealProductInclude;
      }>;
    },
  >(row: T) {
    return {
      ...row,
      product: await this.attachProductMedia(row.product),
    };
  }

  private async attachProductMedia(
    product: Prisma.ProductGetPayload<{
      include: typeof weeklyDealProductInclude;
    }>,
  ) {
    const media = await withMediaReadUrlList(this.mediaStorage, product.media);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      brand: product.brand,
      media,
      price: product.variants[0]?.price.toFixed(2) ?? null,
      sku: product.variants[0]?.sku ?? null,
    };
  }
}
