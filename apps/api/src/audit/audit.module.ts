import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AuthModule,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
} from '../auth/auth.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

class AuditQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

@ApiTags('audit')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.AUDIT_READ)
@Controller({ path: 'audit', version: '1' })
class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: AuditQuery) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(query.entityType === undefined
          ? {}
          : { entityType: query.entityType }),
        ...(query.actorId === undefined ? {} : { actorId: query.actorId }),
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AuditController],
})
export class AuditModule {}
