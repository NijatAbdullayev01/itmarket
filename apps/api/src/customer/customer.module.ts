import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  CustomerAddressContract,
  CustomerOrderSummaryContract,
  CustomerProfileContract,
} from '@itmarket/contracts';
import {
  AuthModule,
  CurrentCustomer,
  CustomerAuthGuard,
  type CustomerPrincipal,
} from '../auth/auth.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  mapOrderSummary,
  orderSummaryInclude,
} from '../orders/order-summary.mapper';
import { OrdersModule, OrdersService } from '../orders/orders.module';

class UpdateCustomerProfileDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone?: string;
}

class CustomerAddressDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  administrativeArea?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class AttachCartDto {
  @IsUUID()
  cartId!: string;
}

@Injectable()
class CustomerAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  async getProfile(customerId: string): Promise<CustomerProfileContract> {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });
    return {
      id: customer.id,
      email: customer.email ?? '',
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    };
  }

  async updateProfile(
    customerId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileContract> {
    const phone = dto.phone?.trim() || null;
    if (phone !== null) {
      const conflict = await this.prisma.customer.findFirst({
        where: {
          phone,
          NOT: { id: customerId },
        },
        select: { id: true },
      });
      if (conflict !== null) {
        throw new BadRequestException('Bu telefon nömrəsi artıq istifadə olunur');
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email ?? '',
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
    };
  }

  async listOrders(
    customerId: string,
  ): Promise<CustomerOrderSummaryContract[]> {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: orderSummaryInclude,
    });

    return orders.map((order) => mapOrderSummary(order));
  }

  async listAddresses(
    customerId: string,
  ): Promise<CustomerAddressContract[]> {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return addresses.map((address) => this.mapAddress(address));
  }

  async createAddress(
    customerId: string,
    dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    const isDefault = dto.isDefault === true;
    const created = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const count = await tx.customerAddress.count({ where: { customerId } });
      return tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName,
          phone: dto.phone,
          administrativeArea: dto.administrativeArea?.trim() || null,
          addressLine: dto.addressLine,
          notes: dto.notes?.trim() || null,
          isDefault: isDefault || count === 0,
        },
      });
    });
    return this.mapAddress(created);
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (existing === null) {
      throw new NotFoundException('Ünvan tapılmadı');
    }

    const isDefault = dto.isDefault === true;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true, NOT: { id: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName,
          phone: dto.phone,
          administrativeArea: dto.administrativeArea?.trim() || null,
          addressLine: dto.addressLine,
          notes: dto.notes?.trim() || null,
          ...(dto.isDefault === undefined ? {} : { isDefault }),
        },
      });
    });
    return this.mapAddress(updated);
  }

  async deleteAddress(customerId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (existing === null) {
      throw new NotFoundException('Ünvan tapılmadı');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.delete({ where: { id: addressId } });
      if (existing.isDefault) {
        const next = await tx.customerAddress.findFirst({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
        });
        if (next !== null) {
          await tx.customerAddress.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { deleted: true };
  }

  async attachCart(customerId: string, cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { id: true, status: true, customerId: true },
    });
    if (cart === null || cart.status !== 'ACTIVE') {
      throw new NotFoundException('Aktiv səbət tapılmadı');
    }
    if (cart.customerId !== null && cart.customerId !== customerId) {
      throw new BadRequestException('Səbət başqa hesaba bağlıdır');
    }
    if (cart.customerId === customerId) {
      return { attached: true };
    }
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { customerId },
    });
    return { attached: true };
  }

  cancelOrder(customerId: string, orderId: string) {
    return this.orders.cancelByCustomer(customerId, orderId);
  }

  private mapAddress(address: {
    id: string;
    label: string | null;
    recipientName: string;
    phone: string;
    administrativeArea: string | null;
    addressLine: string;
    notes: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerAddressContract {
    return {
      id: address.id,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      administrativeArea: address.administrativeArea,
      addressLine: address.addressLine,
      notes: address.notes,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }
}

@ApiTags('customer-account')
@ApiCookieAuth('itmarket_customer_session')
@UseGuards(CustomerAuthGuard)
@Controller({ path: 'customer', version: '1' })
class CustomerAccountController {
  constructor(private readonly account: CustomerAccountService) {}

  @Get('me')
  getProfile(
    @CurrentCustomer() customer: CustomerPrincipal,
  ): Promise<CustomerProfileContract> {
    return this.account.getProfile(customer.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileContract> {
    return this.account.updateProfile(customer.id, dto);
  }

  @Get('orders')
  listOrders(
    @CurrentCustomer() customer: CustomerPrincipal,
  ): Promise<CustomerOrderSummaryContract[]> {
    return this.account.listOrders(customer.id);
  }

  @Post('orders/:id/cancel')
  cancelOrder(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerOrderSummaryContract> {
    return this.account.cancelOrder(customer.id, id);
  }

  @Get('addresses')
  listAddresses(
    @CurrentCustomer() customer: CustomerPrincipal,
  ): Promise<CustomerAddressContract[]> {
    return this.account.listAddresses(customer.id);
  }

  @Post('addresses')
  createAddress(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    return this.account.createAddress(customer.id, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    return this.account.updateAddress(customer.id, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.account.deleteAddress(customer.id, id);
  }

  @Post('carts/attach')
  attachCart(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() dto: AttachCartDto,
  ) {
    return this.account.attachCart(customer.id, dto.cartId);
  }
}

@Module({
  imports: [PrismaModule, AuthModule, OrdersModule],
  controllers: [CustomerAccountController],
  providers: [CustomerAccountService],
})
export class CustomerModule {}
