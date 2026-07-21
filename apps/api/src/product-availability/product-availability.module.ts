import {
  BadRequestException,
  Injectable,
  Module,
} from '@nestjs/common';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CatalogStatus,
  Prisma,
  ProductAvailabilityRequestStatus,
  ProductAvailabilityRequestType,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { formatProductDisplayTitle } from '../catalog/format-product-display-title';

export class ProductAvailabilityRequestDto {
  @IsEnum(ProductAvailabilityRequestType)
  type!: ProductAvailabilityRequestType;

  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  variantId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

@Injectable()
export class ProductAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(dto: ProductAvailabilityRequestDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        productId: dto.productId,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      select: {
        id: true,
        name: true,
        attributes: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            brand: { select: { name: true } },
          },
        },
        balances: { select: { onHand: true, reserved: true } },
      },
    });
    if (variant === null) {
      throw new BadRequestException('Məhsul variantı tapılmadı');
    }

    const available = variant.balances.reduce(
      (sum, balance) =>
        sum + Math.max(0, balance.onHand - balance.reserved),
      0,
    );

    if (dto.type === ProductAvailabilityRequestType.STOCK_ALERT) {
      if (available > 0) {
        throw new BadRequestException('Məhsul artıq stokdadır');
      }
    } else if (available > 0) {
      throw new BadRequestException(
        'Ön sifariş yalnız stokda olmayan məhsullar üçün mümkündür',
      );
    }

    const phone = dto.phone.trim();
    const email =
      dto.email === undefined || dto.email.trim() === ''
        ? null
        : dto.email.trim().toLowerCase();
    const quantity = dto.quantity ?? 1;

    const existing = await this.prisma.productAvailabilityRequest.findFirst({
      where: {
        variantId: dto.variantId,
        phone,
        type: dto.type,
        status: ProductAvailabilityRequestStatus.PENDING,
      },
      select: { id: true, status: true, type: true },
    });
    if (existing !== null) {
      return {
        id: existing.id,
        status: existing.status,
        type: existing.type,
        duplicate: true as const,
      };
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productAvailabilityRequest.create({
        data: {
          type: dto.type,
          phone,
          email,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity,
          ...(dto.customerId === undefined ? {} : { customerId: dto.customerId }),
        },
        select: {
          id: true,
          status: true,
          type: true,
        },
      });

      const topic =
        dto.type === ProductAvailabilityRequestType.PREORDER
          ? 'storefront.preorder.requested'
          : 'storefront.stock_alert.requested';

      await tx.notificationOutbox.create({
        data: {
          topic,
          referenceType: 'product_availability_request',
          referenceId: created.id,
          payload: {
            requestId: created.id,
            type: dto.type,
            phone,
            email,
            productId: variant.product.id,
            productName: formatProductDisplayTitle(variant.product, variant),
            productSlug: variant.product.slug,
            variantId: variant.id,
            variantName: variant.name,
            quantity,
            customerId: dto.customerId ?? null,
          },
        },
      });

      return created;
    });

    return {
      id: request.id,
      status: request.status,
      type: request.type,
      duplicate: false as const,
    };
  }

  async fulfillStockAlertsForVariant(
    tx: Prisma.TransactionClient,
    variantId: string,
  ) {
    const balances = await tx.inventoryBalance.findMany({
      where: { variantId },
      select: { onHand: true, reserved: true },
    });
    const available = balances.reduce(
      (sum, balance) =>
        sum + Math.max(0, balance.onHand - balance.reserved),
      0,
    );
    if (available <= 0) {
      return 0;
    }

    const pendingAlerts = await tx.productAvailabilityRequest.findMany({
      where: {
        variantId,
        type: ProductAvailabilityRequestType.STOCK_ALERT,
        status: ProductAvailabilityRequestStatus.PENDING,
      },
      include: {
        product: {
          select: { name: true, slug: true, brand: { select: { name: true } } },
        },
        variant: { select: { name: true, attributes: true } },
      },
    });
    if (pendingAlerts.length === 0) {
      return 0;
    }

    const fulfilledAt = new Date();
    for (const alert of pendingAlerts) {
      await tx.productAvailabilityRequest.update({
        where: { id: alert.id },
        data: {
          status: ProductAvailabilityRequestStatus.FULFILLED,
          fulfilledAt,
        },
      });
      await tx.notificationOutbox.create({
        data: {
          topic: 'storefront.stock_alert.fulfilled',
          referenceType: 'product_availability_request',
          referenceId: alert.id,
          payload: {
            requestId: alert.id,
            phone: alert.phone,
            email: alert.email,
            productId: alert.productId,
            productName: formatProductDisplayTitle(alert.product, alert.variant),
            productSlug: alert.product.slug,
            variantId: alert.variantId,
            variantName: alert.variant.name,
            available,
          },
        },
      });
    }

    return pendingAlerts.length;
  }
}

@Module({
  imports: [PrismaModule],
  providers: [ProductAvailabilityService],
  exports: [ProductAvailabilityService],
})
export class ProductAvailabilityModule {}
