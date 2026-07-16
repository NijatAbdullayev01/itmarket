import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { StaffRoleCode } from '../generated/prisma/client';

function deriveKey(
  password: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, key) => {
      if (error !== null) reject(error);
      else resolve(key);
    });
  });
}
const STAFF_ACCESS_COOKIE = 'itmarket_staff_access';
const STAFF_COOKIE = 'itmarket_staff_refresh';
const CUSTOMER_COOKIE = 'itmarket_customer_session';
const STAFF_AUDIENCE = 'itmarket:staff';
const CUSTOMER_AUDIENCE = 'itmarket:customer';
const ACCESS_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PERMISSIONS_KEY = 'itmarket:permissions';

export const Permission = {
  CATALOG_READ: 'catalog.read',
  CATALOG_WRITE: 'catalog.write',
  PRICE_CHANGE: 'pricing.price-change',
  ORDERS_READ: 'orders.read',
  FULFILLMENT_WRITE: 'fulfillment.write',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_RECEIPT: 'inventory.receipt',
  STOCK_ADJUSTMENT: 'inventory.adjustment',
  INVENTORY_TRANSFER: 'inventory.transfer',
  CASH_REGISTER_MANAGE: 'cash-register.manage',
  CASH_SHIFT_OPEN: 'cash-shift.open',
  CASH_SHIFT_CLOSE: 'cash-shift.close',
  CASH_MOVEMENT_WRITE: 'cash-shift.cash-movement',
  POS_SALE: 'pos.sale',
  MANUAL_DISCOUNT: 'sales.manual-discount',
  REFUND: 'sales.refund',
  SHIFT_APPROVAL: 'cash-shift.approve-discrepancy',
  STAFF_MANAGEMENT: 'staff.manage',
  REPORT_READ: 'reports.read',
  AUDIT_READ: 'audit.read',
} as const;

export type StaffPrincipal = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
  sessionId: string;
};

export function hasPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((permission) => granted.includes(permission));
}

type AuthenticatedRequest = Request & { staff?: StaffPrincipal };

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentStaff = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StaffPrincipal => {
    const principal = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().staff;
    if (principal === undefined) {
      throw new UnauthorizedException('Staff authentication is required');
    }
    return principal;
  },
);

class StaffLoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

class CustomerRegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

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

  @IsString()
  @MinLength(12)
  password!: string;

  @IsString()
  @MinLength(12)
  passwordConfirm!: string;
}

class CustomerLoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

class CustomerForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}

class CustomerResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

class CreateStaffDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 120)
  displayName!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsEnum(StaffRoleCode)
  role!: StaffRoleCode;
}

class UpdateStaffDto {
  @IsEnum(StaffRoleCode)
  role!: StaffRoleCode;

  @IsBoolean()
  active!: boolean;

  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;
}

function parseCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.cookie;
  if (cookie === undefined) return undefined;
  for (const part of cookie.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function requestIp(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function safeUserAgent(request: Request): string | undefined {
  const value = request.get('user-agent');
  return value?.slice(0, 300);
}

function correlationId(request: Request): string | null {
  return typeof request.id === 'string' || typeof request.id === 'number'
    ? String(request.id)
    : null;
}

function setSessionCookie(
  response: Response,
  name: string,
  token: string,
  secure: boolean,
  maxAge = SESSION_TTL_MS,
): void {
  response.cookie(name, token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}

function clearSessionCookie(
  response: Response,
  name: string,
  secure: boolean,
): void {
  response.clearCookie(name, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
  });
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await deriveKey(password, salt, 64, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    return `scrypt$16384$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const [algorithm, n, r, p, saltValue, hashValue] = encoded.split('$');
    if (
      algorithm !== 'scrypt' ||
      n === undefined ||
      r === undefined ||
      p === undefined ||
      saltValue === undefined ||
      hashValue === undefined
    ) {
      return false;
    }
    const expected = Buffer.from(hashValue, 'base64');
    const actual = await deriveKey(
      password,
      Buffer.from(saltValue, 'base64'),
      expected.length,
      {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: 64 * 1024 * 1024,
      },
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}

@Injectable()
export class LoginThrottle {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private digest(value: string): string {
    return createHmac('sha256', this.config.get('APP_SECRET', { infer: true }))
      .update(value)
      .digest('hex');
  }

  async assertAllowed(
    scope: string,
    identifier: string,
    ip: string,
  ): Promise<void> {
    const attempt = await this.prisma.authLoginAttempt.findUnique({
      where: {
        scope_identifierHash_ipHash: {
          scope,
          identifierHash: this.digest(identifier),
          ipHash: this.digest(ip),
        },
      },
    });
    if (attempt?.blockedUntil !== null && attempt?.blockedUntil !== undefined) {
      if (attempt.blockedUntil.getTime() > Date.now()) {
        throw new ForbiddenException('Login temporarily blocked');
      }
    }
  }

  async failure(scope: string, identifier: string, ip: string): Promise<void> {
    const key = {
      scope,
      identifierHash: this.digest(identifier),
      ipHash: this.digest(ip),
    };
    const current = await this.prisma.authLoginAttempt.findUnique({
      where: { scope_identifierHash_ipHash: key },
    });
    const failedCount = Math.min((current?.failedCount ?? 0) + 1, 12);
    const delaySeconds =
      failedCount < 3 ? 0 : Math.min(2 ** (failedCount - 3), 900);
    await this.prisma.authLoginAttempt.upsert({
      where: { scope_identifierHash_ipHash: key },
      create: {
        ...key,
        failedCount,
        blockedUntil:
          delaySeconds === 0
            ? null
            : new Date(Date.now() + delaySeconds * 1000),
      },
      update: {
        failedCount,
        blockedUntil:
          delaySeconds === 0
            ? null
            : new Date(Date.now() + delaySeconds * 1000),
      },
    });
  }

  async success(scope: string, identifier: string, ip: string): Promise<void> {
    await this.prisma.authLoginAttempt.deleteMany({
      where: {
        scope,
        identifierHash: this.digest(identifier),
        ipHash: this.digest(ip),
      },
    });
  }
}

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly throttle: LoginThrottle,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private issueAccessToken(userId: string, sessionId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        sid: sessionId,
        aud: STAFF_AUDIENCE,
        exp: Date.now() + ACCESS_TTL_MS,
      }),
    ).toString('base64url');
    const signature = createHmac(
      'sha256',
      this.config.get('APP_SECRET', { infer: true }),
    )
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private verifyAccessToken(token: string): {
    sub: string;
    sid: string;
    aud: string;
    exp: number;
  } {
    const [payload, signature] = token.split('.');
    if (payload === undefined || signature === undefined)
      throw new UnauthorizedException();
    const expected = createHmac(
      'sha256',
      this.config.get('APP_SECRET', { infer: true }),
    )
      .update(payload)
      .digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedException();
    }
    try {
      const claims = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as { sub: string; sid: string; aud: string; exp: number };
      if (
        claims.aud !== STAFF_AUDIENCE ||
        claims.exp <= Date.now() ||
        typeof claims.sub !== 'string' ||
        typeof claims.sid !== 'string'
      ) {
        throw new UnauthorizedException();
      }
      return claims;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async login(email: string, password: string, request: Request) {
    const ip = requestIp(request);
    await this.throttle.assertAllowed('staff', email, ip);
    const user = await this.prisma.staffUser.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
    const valid =
      user !== null &&
      user.active &&
      (await this.hasher.verify(password, user.passwordHash));
    if (!valid) {
      await this.throttle.failure('staff', email, ip);
      await this.prisma.auditLog.create({
        data: {
          actorType: 'anonymous',
          action: 'staff.login.failed',
          entityType: 'staff-auth',
          entityId: createHash('sha256').update(email).digest('hex'),
          userAgent: safeUserAgent(request) ?? null,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.throttle.success('staff', email, ip);
    const token = randomBytes(32).toString('base64url');
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staffSession.create({
        data: {
          staffUserId: user.id,
          tokenHash: hashToken(token),
          audience: STAFF_AUDIENCE,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: user.id,
          action: 'staff.login.succeeded',
          entityType: 'staff-session',
          entityId: created.id,
          userAgent: safeUserAgent(request) ?? null,
          correlationId: correlationId(request),
        },
      });
      return created;
    });
    return {
      refreshToken: token,
      accessToken: this.issueAccessToken(user.id, session.id),
      principal: this.toPrincipal(user, session.id),
    };
  }

  async authenticate(accessToken: string | undefined): Promise<StaffPrincipal> {
    if (accessToken === undefined) throw new UnauthorizedException();
    const claims = this.verifyAccessToken(accessToken);
    const session = await this.prisma.staffSession.findUnique({
      where: { id: claims.sid },
      include: {
        staffUser: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (
      session === null ||
      session.audience !== STAFF_AUDIENCE ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.staffUser.active ||
      session.staffUserId !== claims.sub
    ) {
      throw new UnauthorizedException();
    }
    return this.toPrincipal(session.staffUser, session.id);
  }

  async rotate(token: string, request: Request) {
    const current = await this.prisma.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (
      current === null ||
      current.revokedAt !== null ||
      current.expiresAt.getTime() <= Date.now() ||
      current.audience !== STAFF_AUDIENCE
    ) {
      throw new UnauthorizedException();
    }
    const nextToken = randomBytes(32).toString('base64url');
    const nextSessionId = await this.prisma.$transaction(async (tx) => {
      const next = await tx.staffSession.create({
        data: {
          staffUserId: current.staffUserId,
          tokenHash: hashToken(nextToken),
          audience: STAFF_AUDIENCE,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });
      const revoked = await tx.staffSession.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date(), rotatedToId: next.id },
      });
      if (revoked.count !== 1) throw new UnauthorizedException();
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: current.staffUserId,
          action: 'staff.session.rotated',
          entityType: 'staff-session',
          entityId: current.id,
          correlationId: correlationId(request),
        },
      });
      return next.id;
    });
    return {
      refreshToken: nextToken,
      accessToken: this.issueAccessToken(current.staffUserId, nextSessionId),
    };
  }

  async logout(token: string | undefined, request: Request): Promise<void> {
    if (token === undefined) return;
    const session = await this.prisma.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (session === null || session.revokedAt !== null) return;
    await this.prisma.$transaction([
      this.prisma.staffSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: session.staffUserId,
          action: 'staff.logout',
          entityType: 'staff-session',
          entityId: session.id,
          correlationId: correlationId(request),
        },
      }),
    ]);
  }

  private toPrincipal(
    user: {
      id: string;
      email: string;
      displayName: string;
      role: {
        code: string;
        permissions: { permission: { code: string } }[];
      };
    },
    sessionId: string,
  ): StaffPrincipal {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role.code,
      permissions: user.role.permissions.map((entry) => entry.permission.code),
      sessionId,
    };
  }
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(private readonly auth: StaffAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.staff = await this.auth.authenticate(
      parseCookie(request, STAFF_ACCESS_COOKIE),
    );
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.staff === undefined) throw new UnauthorizedException();
    if (!hasPermissions(request.staff.permissions, required)) {
      throw new ForbiddenException('Insufficient permission');
    }
    return true;
  }
}

@ApiTags('staff-auth')
@Controller({ path: 'staff/auth', version: '1' })
export class StaffAuthController {
  constructor(
    private readonly auth: StaffAuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private get secureCookie(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Post('login')
  async login(
    @Body() dto: StaffLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, request);
    setSessionCookie(
      response,
      STAFF_COOKIE,
      result.refreshToken,
      this.secureCookie,
    );
    setSessionCookie(
      response,
      STAFF_ACCESS_COOKIE,
      result.accessToken,
      this.secureCookie,
      ACCESS_TTL_MS,
    );
    return result.principal;
  }

  @Post('rotate')
  async rotate(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = parseCookie(request, STAFF_COOKIE);
    if (token === undefined) throw new UnauthorizedException();
    const next = await this.auth.rotate(token, request);
    setSessionCookie(
      response,
      STAFF_COOKIE,
      next.refreshToken,
      this.secureCookie,
    );
    setSessionCookie(
      response,
      STAFF_ACCESS_COOKIE,
      next.accessToken,
      this.secureCookie,
      ACCESS_TTL_MS,
    );
    return { rotated: true };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(parseCookie(request, STAFF_COOKIE), request);
    clearSessionCookie(response, STAFF_COOKIE, this.secureCookie);
    clearSessionCookie(response, STAFF_ACCESS_COOKIE, this.secureCookie);
    return { loggedOut: true };
  }

  @ApiCookieAuth(STAFF_ACCESS_COOKIE)
  @Get('me')
  async me(@Req() request: Request) {
    return this.auth.authenticate(parseCookie(request, STAFF_ACCESS_COOKIE));
  }
}

@Injectable()
class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly throttle: LoginThrottle,
  ) {}

  async register(dto: CustomerRegisterDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const passwordHash = await this.hasher.hash(dto.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            passwordHash,
          },
          select: { id: true, email: true, createdAt: true },
        });
        await tx.auditLog.create({
          data: {
            actorType: 'customer',
            actorId: customer.id,
            action: 'customer.registered',
            entityType: 'customer',
            entityId: customer.id,
          },
        });
        return customer;
      });
    } catch {
      throw new BadRequestException('Customer account cannot be created');
    }
  }

  async login(email: string, password: string, request: Request) {
    const ip = requestIp(request);
    await this.throttle.assertAllowed('customer', email, ip);
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (
      customer === null ||
      !customer.active ||
      !(await this.hasher.verify(password, customer.passwordHash))
    ) {
      await this.throttle.failure('customer', email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.throttle.success('customer', email, ip);
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.customerSession.create({
        data: {
          customerId: customer.id,
          tokenHash: hashToken(token),
          audience: CUSTOMER_AUDIENCE,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'customer',
          actorId: customer.id,
          action: 'customer.login.succeeded',
          entityType: 'customer-session',
          entityId: session.id,
        },
      });
    });
    return { token, customer: { id: customer.id, email: customer.email } };
  }

  async rotate(token: string): Promise<string> {
    const current = await this.prisma.customerSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (
      current === null ||
      current.revokedAt !== null ||
      current.expiresAt.getTime() <= Date.now() ||
      current.audience !== CUSTOMER_AUDIENCE
    ) {
      throw new UnauthorizedException();
    }
    const nextToken = randomBytes(32).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.customerSession.create({
        data: {
          customerId: current.customerId,
          tokenHash: hashToken(nextToken),
          audience: CUSTOMER_AUDIENCE,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });
      const revoked = await tx.customerSession.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date(), rotatedToId: next.id },
      });
      if (revoked.count !== 1) throw new UnauthorizedException();
    });
    return nextToken;
  }

  async logout(token: string | undefined): Promise<void> {
    if (token === undefined) return;
    await this.prisma.customerSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<{ token?: string }> {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (customer === null || !customer.active) {
      return {};
    }

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      await tx.customerPasswordReset.updateMany({
        where: { customerId: customer.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.customerPasswordReset.create({
        data: {
          customerId: customer.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'customer',
          actorId: customer.id,
          action: 'customer.password-reset.requested',
          entityType: 'customer',
          entityId: customer.id,
        },
      });
    });

    return { token };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const reset = await this.prisma.customerPasswordReset.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { customer: true },
    });
    if (
      reset === null ||
      reset.usedAt !== null ||
      reset.expiresAt.getTime() <= Date.now() ||
      !reset.customer.active
    ) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    const passwordHash = await this.hasher.hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: reset.customerId },
        data: { passwordHash },
      });
      await tx.customerPasswordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      });
      await tx.customerSession.updateMany({
        where: { customerId: reset.customerId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'customer',
          actorId: reset.customerId,
          action: 'customer.password-reset.completed',
          entityType: 'customer',
          entityId: reset.customerId,
        },
      });
    });
  }
}

@ApiTags('customer-auth')
@Controller({ path: 'customer/auth', version: '1' })
class CustomerAuthController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Post('register')
  register(@Body() dto: CustomerRegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: CustomerLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, request);
    setSessionCookie(
      response,
      CUSTOMER_COOKIE,
      result.token,
      this.config.get('NODE_ENV', { infer: true }) === 'production',
    );
    return result.customer;
  }

  @Post('rotate')
  async rotate(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const current = parseCookie(request, CUSTOMER_COOKIE);
    if (current === undefined) throw new UnauthorizedException();
    const next = await this.auth.rotate(current);
    setSessionCookie(
      response,
      CUSTOMER_COOKIE,
      next,
      this.config.get('NODE_ENV', { infer: true }) === 'production',
    );
    return { rotated: true };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(parseCookie(request, CUSTOMER_COOKIE));
    clearSessionCookie(
      response,
      CUSTOMER_COOKIE,
      this.config.get('NODE_ENV', { infer: true }) === 'production',
    );
    return { loggedOut: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: CustomerForgotPasswordDto) {
    const result = await this.auth.requestPasswordReset(dto.email);
    const response: { accepted: true; devResetUrl?: string } = {
      accepted: true,
    };
    if (
      result.token !== undefined &&
      this.config.get('NODE_ENV', { infer: true }) !== 'production'
    ) {
      response.devResetUrl = `/account/reset-password?token=${encodeURIComponent(result.token)}`;
    }
    return response;
  }

  @Post('reset-password')
  resetPassword(@Body() dto: CustomerResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password).then(() => ({
      reset: true,
    }));
  }
}

@Injectable()
class StaffAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
  ) {}

  list() {
    return this.prisma.staffUser.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateStaffDto, actor: StaffPrincipal) {
    const passwordHash = await this.hasher.hash(dto.password);
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({
        where: { code: dto.role },
      });
      const created = await tx.staffUser.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash,
          roleId: role.id,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          active: true,
          role: { select: { code: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'staff.created',
          entityType: 'staff-user',
          entityId: created.id,
          after: {
            role: created.role.code,
            active: created.active,
          },
        },
      });
      return created;
    });
  }

  async update(id: string, dto: UpdateStaffDto, actor: StaffPrincipal) {
    if (id === actor.id && !dto.active) {
      throw new BadRequestException('A staff user cannot deactivate itself');
    }
    const passwordHash =
      dto.password === undefined
        ? undefined
        : await this.hasher.hash(dto.password);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.staffUser.findUniqueOrThrow({
        where: { id },
        include: { role: true },
      });
      const role = await tx.role.findUniqueOrThrow({
        where: { code: dto.role },
      });
      const updated = await tx.staffUser.update({
        where: { id },
        data: {
          roleId: role.id,
          active: dto.active,
          ...(passwordHash === undefined ? {} : { passwordHash }),
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          active: true,
          role: { select: { code: true } },
        },
      });
      if (!updated.active || passwordHash !== undefined) {
        await tx.staffSession.updateMany({
          where: { staffUserId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'staff.updated',
          entityType: 'staff-user',
          entityId: id,
          before: { role: before.role.code, active: before.active },
          after: {
            role: updated.role.code,
            active: updated.active,
            passwordRotated: passwordHash !== undefined,
          },
        },
      });
      return updated;
    });
  }
}

@ApiTags('staff')
@ApiCookieAuth(STAFF_ACCESS_COOKIE)
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.STAFF_MANAGEMENT)
@Controller({ path: 'staff/users', version: '1' })
class StaffAdministrationController {
  constructor(private readonly staff: StaffAdministrationService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post()
  create(@Body() dto: CreateStaffDto, @CurrentStaff() actor: StaffPrincipal) {
    return this.staff.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.staff.update(id, dto, actor);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [
    StaffAuthController,
    CustomerAuthController,
    StaffAdministrationController,
  ],
  providers: [
    PasswordHasher,
    LoginThrottle,
    StaffAuthService,
    CustomerAuthService,
    StaffAdministrationService,
    StaffAuthGuard,
    PermissionsGuard,
  ],
  exports: [PasswordHasher, StaffAuthService, StaffAuthGuard, PermissionsGuard],
})
export class AuthModule {}
