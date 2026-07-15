import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { Response } from 'express';
import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  type StaffPrincipal,
  StaffAuthGuard,
} from '../auth/auth.module';
import {
  BAKU_TIME_ZONE,
  bakuDayKey,
  bakuMonthKey,
  parseBakuBusinessDateRange,
} from '../common/baku-timezone';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReportExportStatus,
  ReportExportType,
  RefundStatus,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

class SalesReportQuery {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  top = 10;
}

class LowStockReportQuery {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  threshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;
}

class MovementReportQuery {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 100;
}

class CreateReportExportDto {
  @IsEnum(ReportExportType)
  reportType!: ReportExportType;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  top?: number;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  threshold?: number;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5_000)
  limit?: number;
}

class ListReportExportsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

type CsvValue = string | number | null | undefined;

type CsvRow = Record<string, CsvValue>;

type ClaimedReportExportRow = { id: string };

const STALE_REPORT_EXPORT_MS = 15 * 60 * 1000;

type AggregateMetrics = {
  transactionCount: number;
  quantity: number;
  grossSales: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  deliveryFeeTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  refundTotal: Prisma.Decimal;
  netSales: Prisma.Decimal;
};

type ProductAggregate = AggregateMetrics & {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
};

type OrderReportRecord = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment: {
    method: PaymentMethod;
    provider: string;
  } | null;
  fulfillmentType: string;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  createdAt: Date;
  deliveryZone: {
    code: string;
    name: string;
  } | null;
  items: Array<{
    variantId: string;
    sku: string;
    productName: string;
    variantName: string;
    quantity: number;
    lineTotal: Prisma.Decimal;
    discountTotal: Prisma.Decimal;
    taxTotal: Prisma.Decimal;
  }>;
};

type PosSaleReportRecord = {
  id: string;
  saleNumber: string;
  paymentMethod: PaymentMethod;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  createdAt: Date;
  staffUser: {
    id: string;
    displayName: string;
    email: string;
  };
  items: Array<{
    variantId: string;
    sku: string;
    productName: string;
    variantName: string;
    quantity: number;
    lineTotal: Prisma.Decimal;
    discountTotal: Prisma.Decimal;
    taxTotal: Prisma.Decimal;
  }>;
};

type PosReturnReportRecord = {
  id: string;
  paymentMethod: PaymentMethod;
  refundAmount: Prisma.Decimal;
  createdAt: Date;
  staffUser: {
    id: string;
    displayName: string;
    email: string;
  };
  items: Array<{
    variantId: string;
    quantity: number;
    lineTotal: Prisma.Decimal;
    saleItem: {
      sku: string;
      productName: string;
      variantName: string;
    };
  }>;
};

type RefundReportRecord = {
  id: string;
  amount: Prisma.Decimal;
  createdAt: Date;
  payment: {
    method: PaymentMethod;
    order: {
      status: OrderStatus;
      deliveryZone: {
        code: string;
        name: string;
      } | null;
      items: Array<{
        variantId: string;
        sku: string;
        productName: string;
        variantName: string;
        quantity: number;
        lineTotal: Prisma.Decimal;
      }>;
    };
  };
};

function zeroMetrics(): AggregateMetrics {
  return {
    transactionCount: 0,
    quantity: 0,
    grossSales: new Prisma.Decimal(0),
    discountTotal: new Prisma.Decimal(0),
    deliveryFeeTotal: new Prisma.Decimal(0),
    taxTotal: new Prisma.Decimal(0),
    refundTotal: new Prisma.Decimal(0),
    netSales: new Prisma.Decimal(0),
  };
}

function addMetrics(
  target: AggregateMetrics,
  input: {
    quantity?: number;
    grossSales: Prisma.Decimal;
    discountTotal?: Prisma.Decimal;
    deliveryFeeTotal?: Prisma.Decimal;
    taxTotal?: Prisma.Decimal;
    refundTotal?: Prisma.Decimal;
    netSales: Prisma.Decimal;
    transactionCount?: number;
  },
): void {
  target.transactionCount += input.transactionCount ?? 1;
  target.quantity += input.quantity ?? 0;
  target.grossSales = target.grossSales.add(input.grossSales);
  target.discountTotal = target.discountTotal.add(
    input.discountTotal ?? new Prisma.Decimal(0),
  );
  target.deliveryFeeTotal = target.deliveryFeeTotal.add(
    input.deliveryFeeTotal ?? new Prisma.Decimal(0),
  );
  target.taxTotal = target.taxTotal.add(
    input.taxTotal ?? new Prisma.Decimal(0),
  );
  target.refundTotal = target.refundTotal.add(
    input.refundTotal ?? new Prisma.Decimal(0),
  );
  target.netSales = target.netSales.add(input.netSales);
}

function serializeMetrics(metrics: AggregateMetrics) {
  return {
    transactionCount: metrics.transactionCount,
    quantity: metrics.quantity,
    grossSales: metrics.grossSales.toFixed(2),
    discountTotal: metrics.discountTotal.toFixed(2),
    deliveryFeeTotal: metrics.deliveryFeeTotal.toFixed(2),
    taxTotal: metrics.taxTotal.toFixed(2),
    refundTotal: metrics.refundTotal.toFixed(2),
    netSales: metrics.netSales.toFixed(2),
  };
}

function ensureMapEntry<T>(
  map: Map<string, T>,
  key: string,
  factory: () => T,
): T {
  const current = map.get(key);
  if (current !== undefined) {
    return current;
  }
  const created = factory();
  map.set(key, created);
  return created;
}

function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(headers: string[], rows: CsvRow[]): string {
  return [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(','),
    ),
  ].join('\n');
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async salesOrders(range: {
    startUtc: Date;
    endUtcExclusive: Date;
  }): Promise<OrderReportRecord[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: range.startUtc,
          lt: range.endUtcExclusive,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        payment: {
          select: {
            method: true,
            provider: true,
          },
        },
        fulfillmentType: true,
        subtotal: true,
        discountTotal: true,
        deliveryFee: true,
        taxTotal: true,
        grandTotal: true,
        createdAt: true,
        deliveryZone: {
          select: {
            code: true,
            name: true,
          },
        },
        items: {
          select: {
            variantId: true,
            sku: true,
            productName: true,
            variantName: true,
            quantity: true,
            lineTotal: true,
            discountTotal: true,
            taxTotal: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return orders.filter((order) => {
      if (
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
        order.paymentStatus === PaymentStatus.REFUNDED
      ) {
        return true;
      }
      return (
        order.payment === null &&
        order.paymentStatus !== PaymentStatus.FAILED &&
        order.paymentStatus !== PaymentStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED &&
        order.status !== OrderStatus.PENDING_PAYMENT
      );
    });
  }

  private posSales(range: {
    startUtc: Date;
    endUtcExclusive: Date;
  }): Promise<PosSaleReportRecord[]> {
    return this.prisma.posSale.findMany({
      where: {
        createdAt: {
          gte: range.startUtc,
          lt: range.endUtcExclusive,
        },
      },
      select: {
        id: true,
        saleNumber: true,
        paymentMethod: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        grandTotal: true,
        createdAt: true,
        staffUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        items: {
          select: {
            variantId: true,
            sku: true,
            productName: true,
            variantName: true,
            quantity: true,
            lineTotal: true,
            discountTotal: true,
            taxTotal: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private posReturns(range: {
    startUtc: Date;
    endUtcExclusive: Date;
  }): Promise<PosReturnReportRecord[]> {
    return this.prisma.posReturn.findMany({
      where: {
        createdAt: {
          gte: range.startUtc,
          lt: range.endUtcExclusive,
        },
      },
      select: {
        id: true,
        paymentMethod: true,
        refundAmount: true,
        createdAt: true,
        staffUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        items: {
          select: {
            variantId: true,
            quantity: true,
            lineTotal: true,
            saleItem: {
              select: {
                sku: true,
                productName: true,
                variantName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private refunds(range: {
    startUtc: Date;
    endUtcExclusive: Date;
  }): Promise<RefundReportRecord[]> {
    return this.prisma.refund.findMany({
      where: {
        status: RefundStatus.SUCCEEDED,
        createdAt: {
          gte: range.startUtc,
          lt: range.endUtcExclusive,
        },
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        payment: {
          select: {
            method: true,
            order: {
              select: {
                status: true,
                deliveryZone: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                items: {
                  select: {
                    variantId: true,
                    sku: true,
                    productName: true,
                    variantName: true,
                    quantity: true,
                    lineTotal: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async reportThreshold(override?: number): Promise<number> {
    if (override !== undefined) {
      return override;
    }
    const configured = await this.prisma.systemMetadata.findUnique({
      where: { key: 'reports.lowStockThreshold' },
      select: { value: true },
    });
    const candidate = configured?.value;
    if (
      typeof candidate === 'number' &&
      Number.isInteger(candidate) &&
      candidate >= 0
    ) {
      return candidate;
    }
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      'value' in candidate &&
      typeof candidate.value === 'number' &&
      Number.isInteger(candidate.value) &&
      candidate.value >= 0
    ) {
      return candidate.value;
    }
    return 5;
  }

  private jsonFilters<T>(value: Prisma.JsonValue): T {
    return value as unknown as T;
  }

  private buildExportFileName(
    reportType: ReportExportType,
    suffix: string,
  ): string {
    const safeSuffix = suffix.replace(/[^0-9A-Za-z_-]+/g, '-');
    return `report-${reportType.toLowerCase()}-${safeSuffix}.csv`;
  }

  private mapExport(
    item: Prisma.ReportExportGetPayload<{
      include: {
        requestedByStaff: {
          select: { id: true; displayName: true; email: true };
        };
      };
    }>,
  ) {
    return {
      id: item.id,
      reportType: item.reportType,
      status: item.status,
      fileName: item.fileName,
      contentType: item.contentType,
      rowCount: item.rowCount,
      errorMessage: item.errorMessage,
      filters: item.filters,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      startedAt: item.startedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      failedAt: item.failedAt?.toISOString() ?? null,
      requestedByStaff: {
        id: item.requestedByStaff.id,
        displayName: item.requestedByStaff.displayName,
        email: item.requestedByStaff.email,
      },
    };
  }

  async createExport(dto: CreateReportExportDto, actor: StaffPrincipal) {
    let filters: Prisma.InputJsonValue;
    let fileName: string;

    switch (dto.reportType) {
      case ReportExportType.SALES: {
        if (dto.from === undefined || dto.to === undefined) {
          throw new ConflictException(
            'Sales export requires from and to business dates',
          );
        }
        const top = dto.top ?? 100;
        filters = { from: dto.from, to: dto.to, top };
        fileName = this.buildExportFileName(
          dto.reportType,
          `${dto.from}-to-${dto.to}`,
        );
        break;
      }
      case ReportExportType.LOW_STOCK: {
        const limit = dto.limit ?? 1000;
        filters = {
          limit,
          ...(dto.locationId === undefined
            ? {}
            : { locationId: dto.locationId }),
          ...(dto.threshold === undefined ? {} : { threshold: dto.threshold }),
        };
        fileName = this.buildExportFileName(
          dto.reportType,
          dto.locationId ?? 'all-locations',
        );
        break;
      }
      case ReportExportType.INVENTORY_MOVEMENTS: {
        if (dto.from === undefined || dto.to === undefined) {
          throw new ConflictException(
            'Inventory movement export requires from and to business dates',
          );
        }
        const limit = dto.limit ?? 5000;
        filters = {
          from: dto.from,
          to: dto.to,
          limit,
          ...(dto.locationId === undefined
            ? {}
            : { locationId: dto.locationId }),
          ...(dto.variantId === undefined ? {} : { variantId: dto.variantId }),
        };
        fileName = this.buildExportFileName(
          dto.reportType,
          `${dto.from}-to-${dto.to}`,
        );
        break;
      }
      default:
        throw new ConflictException('Unsupported report export type');
    }

    return this.mapExport(
      await this.prisma.reportExport.create({
        data: {
          requestedByStaffId: actor.id,
          reportType: dto.reportType,
          fileName,
          filters,
        },
        include: {
          requestedByStaff: {
            select: { id: true, displayName: true, email: true },
          },
        },
      }),
    );
  }

  async listExports(query: ListReportExportsQuery) {
    const items = await this.prisma.reportExport.findMany({
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        requestedByStaff: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
    return { items: items.map((item) => this.mapExport(item)) };
  }

  async getExport(id: string) {
    return this.mapExport(
      await this.prisma.reportExport.findUniqueOrThrow({
        where: { id },
        include: {
          requestedByStaff: {
            select: { id: true, displayName: true, email: true },
          },
        },
      }),
    );
  }

  async downloadExport(id: string) {
    const item = await this.prisma.reportExport.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        fileName: true,
        contentType: true,
        content: true,
      },
    });
    if (item.status !== ReportExportStatus.COMPLETED || item.content === null) {
      throw new ConflictException('Report export is not ready for download');
    }
    return item;
  }

  async claimPendingExports(limit: number): Promise<string[]> {
    const staleBefore = new Date(Date.now() - STALE_REPORT_EXPORT_MS);
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ClaimedReportExportRow[]>`
        SELECT "id"
        FROM "report_exports"
        WHERE "status" = CAST('PENDING' AS "ReportExportStatus")
           OR (
             "status" = CAST('PROCESSING' AS "ReportExportStatus")
             AND "started_at" IS NOT NULL
             AND "started_at" <= ${staleBefore}
           )
        ORDER BY "created_at" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      const ids = rows.map((row) => row.id);
      if (ids.length === 0) {
        return [];
      }
      await tx.reportExport.updateMany({
        where: { id: { in: ids } },
        data: {
          status: ReportExportStatus.PROCESSING,
          startedAt: new Date(),
          completedAt: null,
          failedAt: null,
          errorMessage: null,
          content: null,
          rowCount: null,
        },
      });
      return ids;
    });
  }

  private async buildSalesExportCsv(filters: SalesReportQuery) {
    const report = await this.sales(filters);
    const headers = [
      'section',
      'primaryKey',
      'secondaryKey',
      'label',
      'transactionCount',
      'quantity',
      'grossSales',
      'discountTotal',
      'deliveryFeeTotal',
      'taxTotal',
      'refundTotal',
      'netSales',
      'notes',
    ];
    const rows: CsvRow[] = [
      {
        section: 'summary',
        label: 'TOTAL',
        transactionCount: report.summary.transactionCount,
        grossSales: report.summary.grossSales,
        discountTotal: report.summary.discountTotal,
        deliveryFeeTotal: report.summary.deliveryFeeTotal,
        taxTotal: report.summary.taxTotal,
        refundTotal: report.summary.refundTotal,
        netSales: report.summary.netSales,
      },
      ...report.byDay.map((entry) => ({
        section: 'byDay',
        primaryKey: entry.day,
        transactionCount: entry.transactionCount,
        quantity: entry.quantity,
        grossSales: entry.grossSales,
        discountTotal: entry.discountTotal,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        taxTotal: entry.taxTotal,
        refundTotal: entry.refundTotal,
        netSales: entry.netSales,
      })),
      ...report.byMonth.map((entry) => ({
        section: 'byMonth',
        primaryKey: entry.month,
        transactionCount: entry.transactionCount,
        quantity: entry.quantity,
        grossSales: entry.grossSales,
        discountTotal: entry.discountTotal,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        taxTotal: entry.taxTotal,
        refundTotal: entry.refundTotal,
        netSales: entry.netSales,
      })),
      ...report.byChannel.map((entry) => ({
        section: 'byChannel',
        primaryKey: entry.channel,
        transactionCount: entry.transactionCount,
        quantity: entry.quantity,
        grossSales: entry.grossSales,
        discountTotal: entry.discountTotal,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        taxTotal: entry.taxTotal,
        refundTotal: entry.refundTotal,
        netSales: entry.netSales,
      })),
      ...report.byPaymentMethod.map((entry) => ({
        section: 'byPaymentMethod',
        primaryKey: entry.paymentMethod,
        transactionCount: entry.transactionCount,
        quantity: entry.quantity,
        grossSales: entry.grossSales,
        discountTotal: entry.discountTotal,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        taxTotal: entry.taxTotal,
        refundTotal: entry.refundTotal,
        netSales: entry.netSales,
      })),
      ...report.byCashier.map((entry) => ({
        section: 'byCashier',
        primaryKey: entry.staffUserId,
        secondaryKey: entry.email,
        label: entry.displayName,
        transactionCount: entry.transactionCount,
        quantity: entry.quantity,
        grossSales: entry.grossSales,
        discountTotal: entry.discountTotal,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        taxTotal: entry.taxTotal,
        refundTotal: entry.refundTotal,
        netSales: entry.netSales,
      })),
      ...report.byProduct.map((entry) => ({
        section: 'byProduct',
        primaryKey: entry.variantId,
        secondaryKey: entry.sku,
        label: `${entry.productName} / ${entry.variantName}`,
        transactionCount: entry.transactionCount,
        quantity: entry.quantity,
        grossSales: entry.grossSales,
        discountTotal: entry.discountTotal,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        taxTotal: entry.taxTotal,
        refundTotal: entry.refundTotal,
        netSales: entry.netSales,
      })),
      ...report.orderStatuses.map((entry) => ({
        section: 'orderStatuses',
        primaryKey: entry.status,
        transactionCount: entry.transactionCount,
        netSales: entry.netSales,
      })),
      ...report.deliveryZones.map((entry) => ({
        section: 'deliveryZones',
        primaryKey: entry.code,
        label: entry.name,
        transactionCount: entry.transactionCount,
        deliveryFeeTotal: entry.deliveryFeeTotal,
        netSales: entry.netSales,
      })),
      ...report.notes.map((entry) => ({
        section: 'notes',
        notes: entry,
      })),
    ];
    return { content: toCsv(headers, rows), rowCount: rows.length };
  }

  private async buildLowStockExportCsv(filters: LowStockReportQuery) {
    const report = await this.lowStock(filters);
    const headers = [
      'variantId',
      'sku',
      'barcode',
      'productName',
      'variantName',
      'locationId',
      'locationCode',
      'locationName',
      'onHand',
      'reserved',
      'available',
      'threshold',
      'updatedAt',
    ];
    const rows = report.items.map((item) => ({
      ...item,
      threshold: report.threshold,
    }));
    return { content: toCsv(headers, rows), rowCount: rows.length };
  }

  private async buildInventoryMovementExportCsv(filters: MovementReportQuery) {
    const report = await this.inventoryMovements(filters);
    const headers = [
      'id',
      'businessDay',
      'createdAt',
      'type',
      'quantityDelta',
      'sourceType',
      'sourceDocumentId',
      'reason',
      'variantId',
      'sku',
      'barcode',
      'variantName',
      'productName',
      'locationId',
      'locationCode',
      'locationName',
    ];
    const rows = report.items.map((item) => ({
      id: item.id,
      businessDay: item.businessDay,
      createdAt: item.createdAt,
      type: item.type,
      quantityDelta: item.quantityDelta,
      sourceType: item.sourceType,
      sourceDocumentId: item.sourceDocumentId,
      reason: item.reason,
      variantId: item.variant.id,
      sku: item.variant.sku,
      barcode: item.variant.barcode,
      variantName: item.variant.name,
      productName: item.variant.productName,
      locationId: item.location.id,
      locationCode: item.location.code,
      locationName: item.location.name,
    }));
    return { content: toCsv(headers, rows), rowCount: rows.length };
  }

  async processExport(id: string) {
    const item = await this.prisma.reportExport.findUniqueOrThrow({
      where: { id },
      select: { id: true, reportType: true, filters: true },
    });
    try {
      let result: { content: string; rowCount: number };
      switch (item.reportType) {
        case ReportExportType.SALES:
          result = await this.buildSalesExportCsv(
            this.jsonFilters<SalesReportQuery>(item.filters),
          );
          break;
        case ReportExportType.LOW_STOCK:
          result = await this.buildLowStockExportCsv(
            this.jsonFilters<LowStockReportQuery>(item.filters),
          );
          break;
        case ReportExportType.INVENTORY_MOVEMENTS:
          result = await this.buildInventoryMovementExportCsv(
            this.jsonFilters<MovementReportQuery>(item.filters),
          );
          break;
        default:
          throw new ConflictException('Unsupported report export type');
      }
      await this.prisma.reportExport.update({
        where: { id: item.id },
        data: {
          status: ReportExportStatus.COMPLETED,
          content: result.content,
          rowCount: result.rowCount,
          completedAt: new Date(),
          failedAt: null,
          errorMessage: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 500) : 'Export failed';
      await this.prisma.reportExport.update({
        where: { id: item.id },
        data: {
          status: ReportExportStatus.FAILED,
          content: null,
          rowCount: null,
          completedAt: null,
          failedAt: new Date(),
          errorMessage: message,
        },
      });
      throw error;
    }
  }

  async sales(query: SalesReportQuery) {
    const range = parseBakuBusinessDateRange(query.from, query.to);
    const [orders, posSales, posReturns, refunds] = await Promise.all([
      this.salesOrders(range),
      this.posSales(range),
      this.posReturns(range),
      this.refunds(range),
    ]);

    const summary = zeroMetrics();
    const byDay = new Map<string, AggregateMetrics>();
    const byMonth = new Map<string, AggregateMetrics>();
    const byChannel = new Map<string, AggregateMetrics>();
    const byPaymentMethod = new Map<string, AggregateMetrics>();
    const byCashier = new Map<
      string,
      AggregateMetrics & {
        staffUserId: string;
        displayName: string;
        email: string;
      }
    >();
    const byProduct = new Map<string, ProductAggregate>();
    const orderStatuses = new Map<
      string,
      {
        status: string;
        transactionCount: number;
        netSales: Prisma.Decimal;
      }
    >();
    const deliveryZones = new Map<
      string,
      {
        code: string;
        name: string;
        transactionCount: number;
        deliveryFeeTotal: Prisma.Decimal;
        netSales: Prisma.Decimal;
      }
    >();

    for (const order of orders) {
      const paymentMethod = order.payment?.method ?? PaymentMethod.CASH;
      const metrics = {
        grossSales: order.subtotal,
        discountTotal: order.discountTotal,
        deliveryFeeTotal: order.deliveryFee,
        taxTotal: order.taxTotal,
        netSales: order.grandTotal,
      };
      addMetrics(summary, metrics);
      addMetrics(
        ensureMapEntry(byDay, bakuDayKey(order.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(
        ensureMapEntry(byMonth, bakuMonthKey(order.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(ensureMapEntry(byChannel, 'ONLINE', zeroMetrics), metrics);
      addMetrics(
        ensureMapEntry(byPaymentMethod, paymentMethod, zeroMetrics),
        metrics,
      );

      const orderStatus = ensureMapEntry(orderStatuses, order.status, () => ({
        status: order.status,
        transactionCount: 0,
        netSales: new Prisma.Decimal(0),
      }));
      orderStatus.transactionCount += 1;
      orderStatus.netSales = orderStatus.netSales.add(order.grandTotal);

      if (order.deliveryZone !== null) {
        const zone = ensureMapEntry(
          deliveryZones,
          order.deliveryZone.code,
          () => ({
            code: order.deliveryZone!.code,
            name: order.deliveryZone!.name,
            transactionCount: 0,
            deliveryFeeTotal: new Prisma.Decimal(0),
            netSales: new Prisma.Decimal(0),
          }),
        );
        zone.transactionCount += 1;
        zone.deliveryFeeTotal = zone.deliveryFeeTotal.add(order.deliveryFee);
        zone.netSales = zone.netSales.add(order.grandTotal);
      }

      for (const item of order.items) {
        const product = ensureMapEntry(byProduct, item.variantId, () => ({
          ...zeroMetrics(),
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          variantName: item.variantName,
        }));
        addMetrics(product, {
          quantity: item.quantity,
          grossSales: item.lineTotal,
          discountTotal: item.discountTotal,
          taxTotal: item.taxTotal,
          netSales: item.lineTotal,
        });
      }
    }

    for (const sale of posSales) {
      const metrics = {
        grossSales: sale.subtotal,
        discountTotal: sale.discountTotal,
        taxTotal: sale.taxTotal,
        netSales: sale.grandTotal,
      };
      addMetrics(summary, metrics);
      addMetrics(
        ensureMapEntry(byDay, bakuDayKey(sale.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(
        ensureMapEntry(byMonth, bakuMonthKey(sale.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(ensureMapEntry(byChannel, 'POS', zeroMetrics), metrics);
      addMetrics(
        ensureMapEntry(byPaymentMethod, sale.paymentMethod, zeroMetrics),
        metrics,
      );
      addMetrics(
        ensureMapEntry(byCashier, sale.staffUser.id, () => ({
          ...zeroMetrics(),
          staffUserId: sale.staffUser.id,
          displayName: sale.staffUser.displayName,
          email: sale.staffUser.email,
        })),
        metrics,
      );

      for (const item of sale.items) {
        const product = ensureMapEntry(byProduct, item.variantId, () => ({
          ...zeroMetrics(),
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          variantName: item.variantName,
        }));
        addMetrics(product, {
          quantity: item.quantity,
          grossSales: item.lineTotal,
          discountTotal: item.discountTotal,
          taxTotal: item.taxTotal,
          netSales: item.lineTotal,
        });
      }
    }

    for (const posReturn of posReturns) {
      const metrics = {
        transactionCount: 0,
        grossSales: new Prisma.Decimal(0),
        refundTotal: posReturn.refundAmount,
        netSales: posReturn.refundAmount.neg(),
      };
      addMetrics(summary, metrics);
      addMetrics(
        ensureMapEntry(byDay, bakuDayKey(posReturn.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(
        ensureMapEntry(byMonth, bakuMonthKey(posReturn.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(ensureMapEntry(byChannel, 'POS', zeroMetrics), metrics);
      addMetrics(
        ensureMapEntry(byPaymentMethod, posReturn.paymentMethod, zeroMetrics),
        metrics,
      );
      addMetrics(
        ensureMapEntry(byCashier, posReturn.staffUser.id, () => ({
          ...zeroMetrics(),
          staffUserId: posReturn.staffUser.id,
          displayName: posReturn.staffUser.displayName,
          email: posReturn.staffUser.email,
        })),
        metrics,
      );

      for (const item of posReturn.items) {
        const product = ensureMapEntry(byProduct, item.variantId, () => ({
          ...zeroMetrics(),
          variantId: item.variantId,
          sku: item.saleItem.sku,
          productName: item.saleItem.productName,
          variantName: item.saleItem.variantName,
        }));
        addMetrics(product, {
          transactionCount: 0,
          quantity: -item.quantity,
          grossSales: new Prisma.Decimal(0),
          refundTotal: item.lineTotal,
          netSales: item.lineTotal.neg(),
        });
      }
    }

    for (const refund of refunds) {
      const metrics = {
        transactionCount: 0,
        grossSales: new Prisma.Decimal(0),
        refundTotal: refund.amount,
        netSales: refund.amount.neg(),
      };
      addMetrics(summary, metrics);
      addMetrics(
        ensureMapEntry(byDay, bakuDayKey(refund.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(
        ensureMapEntry(byMonth, bakuMonthKey(refund.createdAt), zeroMetrics),
        metrics,
      );
      addMetrics(ensureMapEntry(byChannel, 'ONLINE', zeroMetrics), metrics);
      addMetrics(
        ensureMapEntry(byPaymentMethod, refund.payment.method, zeroMetrics),
        metrics,
      );

      if (refund.payment.order.deliveryZone !== null) {
        const zone = ensureMapEntry(
          deliveryZones,
          refund.payment.order.deliveryZone.code,
          () => ({
            code: refund.payment.order.deliveryZone!.code,
            name: refund.payment.order.deliveryZone!.name,
            transactionCount: 0,
            deliveryFeeTotal: new Prisma.Decimal(0),
            netSales: new Prisma.Decimal(0),
          }),
        );
        zone.netSales = zone.netSales.sub(refund.amount);
      }

      for (const item of refund.payment.order.items) {
        const product = ensureMapEntry(byProduct, item.variantId, () => ({
          ...zeroMetrics(),
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          variantName: item.variantName,
        }));
        addMetrics(product, {
          transactionCount: 0,
          quantity: 0,
          grossSales: new Prisma.Decimal(0),
          refundTotal: item.lineTotal,
          netSales: item.lineTotal.neg(),
        });
      }
    }

    return {
      range: {
        from: range.from,
        to: range.to,
        timeZone: BAKU_TIME_ZONE,
      },
      summary: serializeMetrics(summary),
      byDay: [...byDay.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([day, metrics]) => ({ day, ...serializeMetrics(metrics) })),
      byMonth: [...byMonth.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, metrics]) => ({ month, ...serializeMetrics(metrics) })),
      byChannel: [...byChannel.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([channel, metrics]) => ({
          channel,
          ...serializeMetrics(metrics),
        })),
      byPaymentMethod: [...byPaymentMethod.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([paymentMethod, metrics]) => ({
          paymentMethod,
          ...serializeMetrics(metrics),
        })),
      byCashier: [...byCashier.values()]
        .sort((left, right) => right.netSales.comparedTo(left.netSales))
        .map((cashier) => ({
          staffUserId: cashier.staffUserId,
          displayName: cashier.displayName,
          email: cashier.email,
          ...serializeMetrics(cashier),
        })),
      byProduct: [...byProduct.values()]
        .sort((left, right) => right.netSales.comparedTo(left.netSales))
        .slice(0, query.top)
        .map((product) => ({
          variantId: product.variantId,
          sku: product.sku,
          productName: product.productName,
          variantName: product.variantName,
          ...serializeMetrics(product),
        })),
      orderStatuses: [...orderStatuses.values()]
        .sort((left, right) => left.status.localeCompare(right.status))
        .map((status) => ({
          status: status.status,
          transactionCount: status.transactionCount,
          netSales: status.netSales.toFixed(2),
        })),
      deliveryZones: [...deliveryZones.values()]
        .sort((left, right) => right.netSales.comparedTo(left.netSales))
        .map((zone) => ({
          code: zone.code,
          name: zone.name,
          transactionCount: zone.transactionCount,
          deliveryFeeTotal: zone.deliveryFeeTotal.toFixed(2),
          netSales: zone.netSales.toFixed(2),
        })),
      notes: [
        'Refund totals reflect succeeded refund records in the selected Baku business date range.',
        'Storefront COD orders are included when they are confirmed and have no online payment row.',
        'POS return totals are subtracted from the POS channel and original payment method breakdowns.',
      ],
    };
  }

  async lowStock(query: LowStockReportQuery) {
    const threshold = await this.reportThreshold(query.threshold);
    const balances = await this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.locationId === undefined
          ? {}
          : { locationId: query.locationId }),
      },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ onHand: 'asc' }, { updatedAt: 'asc' }],
    });

    const items = balances
      .map((balance) => ({
        variantId: balance.variant.id,
        sku: balance.variant.sku,
        barcode: balance.variant.barcode,
        productName: balance.variant.product.name,
        variantName: balance.variant.name,
        locationId: balance.location.id,
        locationCode: balance.location.code,
        locationName: balance.location.name,
        onHand: balance.onHand,
        reserved: balance.reserved,
        available: balance.onHand - balance.reserved,
        updatedAt: balance.updatedAt.toISOString(),
      }))
      .filter((item) => item.available <= threshold)
      .sort(
        (left, right) =>
          left.available - right.available ||
          left.updatedAt.localeCompare(right.updatedAt),
      )
      .slice(0, query.limit);

    return {
      threshold,
      items,
    };
  }

  async inventoryMovements(query: MovementReportQuery) {
    const range = parseBakuBusinessDateRange(query.from, query.to);
    const items = await this.prisma.inventoryMovement.findMany({
      where: {
        createdAt: {
          gte: range.startUtc,
          lt: range.endUtcExclusive,
        },
        ...(query.variantId === undefined
          ? {}
          : { variantId: query.variantId }),
        ...(query.locationId === undefined
          ? {}
          : { locationId: query.locationId }),
      },
      include: {
        variant: {
          select: {
            sku: true,
            barcode: true,
            name: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return {
      range: {
        from: range.from,
        to: range.to,
        timeZone: BAKU_TIME_ZONE,
      },
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        quantityDelta: item.quantityDelta,
        sourceType: item.sourceType,
        sourceDocumentId: item.sourceDocumentId,
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        businessDay: bakuDayKey(item.createdAt),
        variant: {
          id: item.variantId,
          sku: item.variant.sku,
          barcode: item.variant.barcode,
          name: item.variant.name,
          productName: item.variant.product.name,
        },
        location: {
          id: item.locationId,
          code: item.location.code,
          name: item.location.name,
        },
      })),
    };
  }
}

@ApiTags('reports')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.REPORT_READ)
@Controller({ path: 'reports', version: '1' })
class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales')
  sales(@Query() query: SalesReportQuery) {
    return this.reports.sales(query);
  }

  @Get('inventory/low-stock')
  lowStock(@Query() query: LowStockReportQuery) {
    return this.reports.lowStock(query);
  }

  @Get('inventory/movements')
  movements(@Query() query: MovementReportQuery) {
    return this.reports.inventoryMovements(query);
  }

  @Post('exports')
  createExport(
    @Body() dto: CreateReportExportDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.reports.createExport(dto, actor);
  }

  @Get('exports')
  exports(@Query() query: ListReportExportsQuery) {
    return this.reports.listExports(query);
  }

  @Get('exports/:id')
  export(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.getExport(id);
  }

  @Get('exports/:id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const item = await this.reports.downloadExport(id);
    response.setHeader('Content-Type', item.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${item.fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    return item.content;
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
