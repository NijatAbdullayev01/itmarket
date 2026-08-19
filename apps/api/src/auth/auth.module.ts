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
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment';
import { getClientIp } from '../security/client-ip';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { NotificationComposer } from '../notifications/notification-composer';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.port';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { StaffRoleCode } from '../generated/prisma/client';
import {
  decryptMfaSecret,
  encryptMfaSecret,
  findMatchingRecoveryCodeHash,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from './staff-mfa.crypto';
import {
  buildTotpUri,
  createTotpSecret,
  verifyTotpCode,
} from './staff-mfa.totp';
import { isRotatedRefreshReuse } from './refresh-reuse';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
  evaluatePasswordPolicy,
  passwordPolicyMessage,
} from './password-policy';

function IsStrongAccountPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStrongAccountPassword',
      target: object.constructor,
      propertyName,
      ...(validationOptions === undefined ? {} : { options: validationOptions }),
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'string' && evaluatePasswordPolicy(value).ok
          );
        },
        defaultMessage() {
          return `Password must be ${ACCOUNT_PASSWORD_MIN_LENGTH}–${ACCOUNT_PASSWORD_MAX_LENGTH} chars with at least three of: lowercase, uppercase, digit, symbol`;
        },
      },
    });
  };
}

function assertStrongAccountPassword(password: string): void {
  const result = evaluatePasswordPolicy(password);
  if (!result.ok) {
    throw new BadRequestException(passwordPolicyMessage(result.code));
  }
}
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
const STAFF_MFA_AUDIENCE = 'itmarket:staff-mfa';
const CUSTOMER_AUDIENCE = 'itmarket:customer';
const ACCESS_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Touch lastActivityAt at most once per minute to limit write amplification. */
const STAFF_ACTIVITY_TOUCH_MS = 60 * 1000;
const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const MFA_ISSUER = 'ITMarket Staff';
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
  /** Legacy / növbəli POS; növbəsiz modeldə admin UI-də təyin olunmur. */
  CASH_SHIFT_OPEN: 'cash-shift.open',
  /** Legacy / növbəli POS; növbəsiz modeldə admin UI-də təyin olunmur. */
  CASH_SHIFT_CLOSE: 'cash-shift.close',
  /** Legacy / növbəli POS; növbəsiz modeldə admin UI-də təyin olunmur. */
  CASH_MOVEMENT_WRITE: 'cash-shift.cash-movement',
  POS_SALE: 'pos.sale',
  /** Reserved/unused — POS-da manual endirim yolu yoxdur; admin UI-də təyin olunmur. */
  MANUAL_DISCOUNT: 'sales.manual-discount',
  REFUND: 'sales.refund',
  /** Legacy / növbəli POS; növbəsiz modeldə admin UI-də təyin olunmur. */
  SHIFT_APPROVAL: 'cash-shift.approve-discrepancy',
  STAFF_MANAGEMENT: 'staff.manage',
  CUSTOMERS_READ: 'customers.read',
  INQUIRIES_READ: 'inquiries.read',
  INQUIRIES_WRITE: 'inquiries.write',
  CREDIT_APPLICATIONS_MANAGE: 'credit-applications.manage',
  SUPPORT_MESSAGES_MANAGE: 'support-messages.manage',
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
  mfaEnabled: boolean;
};

export type StaffMfaChallenge = {
  mfaRequired: true;
  mfaToken: string;
};

export type CustomerPrincipal = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  sessionId: string;
};

export type CustomerProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export function hasPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((permission) => granted.includes(permission));
}

type AuthenticatedRequest = Request & {
  staff?: StaffPrincipal;
  customer?: CustomerPrincipal;
};

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

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerPrincipal => {
    const principal = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().customer;
    if (principal === undefined) {
      throw new UnauthorizedException('Customer authentication is required');
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

  /** Login verifies the hash only — strength policy applies on create/reset. */
  @IsString()
  @MinLength(8)
  @MaxLength(ACCOUNT_PASSWORD_MAX_LENGTH)
  password!: string;
}

class StaffMfaEnableDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(6, 6)
  code!: string;
}

class StaffMfaDisableDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(6, 6)
  code?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  recoveryCode?: string;
}

class StaffMfaVerifyDto {
  @IsString()
  @MinLength(20)
  mfaToken!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(6, 6)
  code?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  recoveryCode?: string;
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
  @MinLength(ACCOUNT_PASSWORD_MIN_LENGTH)
  @MaxLength(ACCOUNT_PASSWORD_MAX_LENGTH)
  @IsStrongAccountPassword()
  password!: string;

  @IsString()
  @MinLength(ACCOUNT_PASSWORD_MIN_LENGTH)
  @MaxLength(ACCOUNT_PASSWORD_MAX_LENGTH)
  passwordConfirm!: string;
}

class CustomerLoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
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
  @MinLength(ACCOUNT_PASSWORD_MIN_LENGTH)
  @MaxLength(ACCOUNT_PASSWORD_MAX_LENGTH)
  @IsStrongAccountPassword()
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
  @MinLength(ACCOUNT_PASSWORD_MIN_LENGTH)
  @MaxLength(ACCOUNT_PASSWORD_MAX_LENGTH)
  @IsStrongAccountPassword()
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
  @MinLength(ACCOUNT_PASSWORD_MIN_LENGTH)
  @MaxLength(ACCOUNT_PASSWORD_MAX_LENGTH)
  @IsStrongAccountPassword()
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
  return getClientIp(request);
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

  /** Sentinel IP hash bucket for per-identifier global ceilings. */
  private globalIpHash(): string {
    return this.digest('__global__');
  }

  async assertAllowed(
    scope: string,
    identifier: string,
    ip: string,
  ): Promise<void> {
    const identifierHash = this.digest(identifier);
    const attempts = await this.prisma.authLoginAttempt.findMany({
      where: {
        scope,
        identifierHash,
        ipHash: { in: [this.digest(ip), this.globalIpHash()] },
      },
    });
    const now = Date.now();
    for (const attempt of attempts) {
      if (
        attempt.blockedUntil !== null &&
        attempt.blockedUntil.getTime() > now
      ) {
        throw new ForbiddenException('Temporarily blocked');
      }
    }
  }

  async failure(scope: string, identifier: string, ip: string): Promise<void> {
    await Promise.all([
      this.recordFailure(scope, identifier, this.digest(ip), 12, 3),
      // Stricter global ceiling across IP rotation (credential stuffing).
      this.recordFailure(scope, identifier, this.globalIpHash(), 20, 5),
    ]);
  }

  private async recordFailure(
    scope: string,
    identifier: string,
    ipHash: string,
    maxFailedCount: number,
    freeAttempts: number,
  ): Promise<void> {
    const key = {
      scope,
      identifierHash: this.digest(identifier),
      ipHash,
    };
    const current = await this.prisma.authLoginAttempt.findUnique({
      where: { scope_identifierHash_ipHash: key },
    });
    const failedCount = Math.min((current?.failedCount ?? 0) + 1, maxFailedCount);
    const delaySeconds =
      failedCount < freeAttempts
        ? 0
        : Math.min(2 ** (failedCount - freeAttempts), 900);
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
    const identifierHash = this.digest(identifier);
    await this.prisma.authLoginAttempt.deleteMany({
      where: {
        scope,
        identifierHash,
        ipHash: { in: [this.digest(ip), this.globalIpHash()] },
      },
    });
  }

  /**
   * Rate-limit successful mutating creates (support/credit/availability spam).
   * Call after assertAllowed; does not clear the bucket (unlike success()).
   */
  async consumeSuccessQuota(
    scope: string,
    identifier: string,
    ip: string,
    options: { maxUses: number; windowSeconds: number } = {
      maxUses: 5,
      windowSeconds: 3600,
    },
  ): Promise<void> {
    await Promise.all([
      this.recordUse(scope, identifier, this.digest(ip), options),
      this.recordUse(scope, identifier, this.globalIpHash(), {
        maxUses: Math.max(options.maxUses * 2, options.maxUses + 3),
        windowSeconds: options.windowSeconds,
      }),
    ]);
  }

  private async recordUse(
    scope: string,
    identifier: string,
    ipHash: string,
    options: { maxUses: number; windowSeconds: number },
  ): Promise<void> {
    const key = {
      scope,
      identifierHash: this.digest(identifier),
      ipHash,
    };
    const current = await this.prisma.authLoginAttempt.findUnique({
      where: { scope_identifierHash_ipHash: key },
    });
    const now = Date.now();
    const windowExpired =
      current?.blockedUntil !== null &&
      current?.blockedUntil !== undefined &&
      current.blockedUntil.getTime() <= now;
    const failedCount = windowExpired
      ? 1
      : Math.min((current?.failedCount ?? 0) + 1, options.maxUses);
    const blockedUntil =
      failedCount >= options.maxUses
        ? new Date(now + options.windowSeconds * 1000)
        : null;
    await this.prisma.authLoginAttempt.upsert({
      where: { scope_identifierHash_ipHash: key },
      create: {
        ...key,
        failedCount,
        blockedUntil,
      },
      update: {
        failedCount,
        blockedUntil,
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
    private readonly redis: RedisService,
  ) {}

  private appSecret(): string {
    return this.config.get('APP_SECRET', { infer: true });
  }

  private signStaffToken(claims: Record<string, unknown>): string {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = createHmac('sha256', this.appSecret())
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private verifySignedStaffToken(token: string): Record<string, unknown> {
    const [payload, signature] = token.split('.');
    if (payload === undefined || signature === undefined) {
      throw new UnauthorizedException();
    }
    const expected = createHmac('sha256', this.appSecret())
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
      return JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private issueAccessToken(userId: string, sessionId: string): string {
    return this.signStaffToken({
      sub: userId,
      sid: sessionId,
      aud: STAFF_AUDIENCE,
      exp: Date.now() + ACCESS_TTL_MS,
    });
  }

  private async issueMfaChallengeToken(userId: string): Promise<string> {
    const jti = randomUUID();
    await this.redis.putOnce(`staff-mfa-jti:${jti}`, MFA_CHALLENGE_TTL_MS);
    return this.signStaffToken({
      sub: userId,
      aud: STAFF_MFA_AUDIENCE,
      jti,
      exp: Date.now() + MFA_CHALLENGE_TTL_MS,
    });
  }

  private verifyAccessToken(token: string): {
    sub: string;
    sid: string;
    aud: string;
    exp: number;
  } {
    const claims = this.verifySignedStaffToken(token);
    if (
      claims.aud !== STAFF_AUDIENCE ||
      typeof claims.exp !== 'number' ||
      claims.exp <= Date.now() ||
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string'
    ) {
      throw new UnauthorizedException();
    }
    return {
      sub: claims.sub,
      sid: claims.sid,
      aud: claims.aud,
      exp: claims.exp,
    };
  }

  private async verifyMfaChallengeToken(
    token: string,
  ): Promise<{ sub: string; jti: string }> {
    const claims = this.verifySignedStaffToken(token);
    if (
      claims.aud !== STAFF_MFA_AUDIENCE ||
      typeof claims.exp !== 'number' ||
      claims.exp <= Date.now() ||
      typeof claims.sub !== 'string' ||
      typeof claims.jti !== 'string' ||
      claims.jti.trim() === ''
    ) {
      throw new UnauthorizedException('MFA challenge expired or invalid');
    }
    const consumed = await this.redis.consumeOnce(
      `staff-mfa-jti:${claims.jti}`,
    );
    if (!consumed) {
      throw new UnauthorizedException('MFA challenge expired or invalid');
    }
    return { sub: claims.sub, jti: claims.jti };
  }

  private async verifyEncryptedTotp(
    encryptedSecret: string | null,
    code: string,
  ): Promise<boolean> {
    if (encryptedSecret === null) return false;
    let secret: string;
    try {
      secret = decryptMfaSecret(encryptedSecret, this.appSecret());
    } catch {
      return false;
    }
    return verifyTotpCode(secret, code);
  }

  private async createStaffSession(
    user: {
      id: string;
      email: string;
      displayName: string;
      mfaEnabled: boolean;
      role: {
        code: string;
        permissions: { permission: { code: string } }[];
      };
    },
    request: Request,
    auditAction: string,
  ) {
    const token = randomBytes(32).toString('base64url');
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staffSession.create({
        data: {
          staffUserId: user.id,
          tokenHash: hashToken(token),
          audience: STAFF_AUDIENCE,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          lastActivityAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: user.id,
          action: auditAction,
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

  async login(
    email: string,
    password: string,
    request: Request,
  ): Promise<
    | StaffMfaChallenge
    | {
        refreshToken: string;
        accessToken: string;
        principal: StaffPrincipal;
      }
  > {
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

    const mfaRequiredGlobally = this.config.get('STAFF_MFA_REQUIRED', {
      infer: true,
    });
    if (mfaRequiredGlobally && !user.mfaEnabled) {
      throw new ForbiddenException(
        'MFA enrollment is required before staff login',
      );
    }

    if (user.mfaEnabled) {
      await this.prisma.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: user.id,
          action: 'staff.login.mfa_challenge',
          entityType: 'staff-auth',
          entityId: user.id,
          userAgent: safeUserAgent(request) ?? null,
          correlationId: correlationId(request),
        },
      });
      return {
        mfaRequired: true,
        mfaToken: await this.issueMfaChallengeToken(user.id),
      };
    }

    return this.createStaffSession(user, request, 'staff.login.succeeded');
  }

  async beginMfaSetup(actor: StaffPrincipal) {
    if (actor.mfaEnabled) {
      throw new BadRequestException(
        'MFA is already enabled; disable it before re-enrollment',
      );
    }
    const user = await this.prisma.staffUser.findUniqueOrThrow({
      where: { id: actor.id },
      select: { email: true, mfaEnabled: true },
    });
    if (user.mfaEnabled) {
      throw new BadRequestException(
        'MFA is already enabled; disable it before re-enrollment',
      );
    }
    const secret = createTotpSecret();
    const encrypted = encryptMfaSecret(secret, this.appSecret());
    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id: actor.id },
        data: {
          mfaSecretEncrypted: encrypted,
          mfaRecoveryCodesHash: [],
          mfaEnabled: false,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'staff.mfa.setup_started',
          entityType: 'staff-user',
          entityId: actor.id,
        },
      });
    });
    return {
      secret,
      otpauthUrl: buildTotpUri({
        issuer: MFA_ISSUER,
        label: user.email,
        secret,
      }),
    };
  }

  async enableMfa(actor: StaffPrincipal, code: string) {
    if (actor.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }
    const user = await this.prisma.staffUser.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        mfaEnabled: true,
        mfaSecretEncrypted: true,
      },
    });
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }
    if (user.mfaSecretEncrypted === null) {
      throw new BadRequestException('MFA setup has not been started');
    }
    const valid = await this.verifyEncryptedTotp(user.mfaSecretEncrypted, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    const recoveryCodes = generateRecoveryCodes();
    const recoveryHashes = hashRecoveryCodes(recoveryCodes, this.appSecret());
    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id: actor.id },
        data: {
          mfaEnabled: true,
          mfaRecoveryCodesHash: recoveryHashes,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'staff.mfa.enabled',
          entityType: 'staff-user',
          entityId: actor.id,
        },
      });
    });
    return { enabled: true as const, recoveryCodes };
  }

  async disableMfa(
    actor: StaffPrincipal,
    input: { code?: string; recoveryCode?: string },
  ) {
    if (!actor.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }
    const code = input.code?.trim();
    const recoveryCode = input.recoveryCode?.trim();
    if (
      (code === undefined || code.length === 0) &&
      (recoveryCode === undefined || recoveryCode.length === 0)
    ) {
      throw new BadRequestException('MFA code or recovery code is required');
    }

    const user = await this.prisma.staffUser.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        mfaRecoveryCodesHash: true,
      },
    });
    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    let matchedRecoveryHash: string | null = null;
    if (code !== undefined && code.length > 0) {
      const valid = await this.verifyEncryptedTotp(
        user.mfaSecretEncrypted,
        code,
      );
      if (!valid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    } else if (recoveryCode !== undefined) {
      matchedRecoveryHash = findMatchingRecoveryCodeHash(
        recoveryCode,
        user.mfaRecoveryCodesHash,
        this.appSecret(),
      );
      if (matchedRecoveryHash === null) {
        throw new UnauthorizedException('Invalid recovery code');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id: actor.id },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaRecoveryCodesHash: [],
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'staff.mfa.disabled',
          entityType: 'staff-user',
          entityId: actor.id,
          after: {
            usedRecoveryCode: matchedRecoveryHash !== null,
          },
        },
      });
    });
    return { enabled: false as const };
  }

  async verifyMfaChallenge(
    mfaToken: string,
    input: { code?: string; recoveryCode?: string },
    request: Request,
  ) {
    const { sub: userId } = await this.verifyMfaChallengeToken(mfaToken);
    const ip = requestIp(request);
    await this.throttle.assertAllowed('staff-mfa', userId, ip);

    const code = input.code?.trim();
    const recoveryCode = input.recoveryCode?.trim();
    if (
      (code === undefined || code.length === 0) &&
      (recoveryCode === undefined || recoveryCode.length === 0)
    ) {
      throw new BadRequestException('MFA code or recovery code is required');
    }

    const user = await this.prisma.staffUser.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
    if (user === null || !user.active || !user.mfaEnabled) {
      await this.throttle.failure('staff-mfa', userId, ip);
      throw new UnauthorizedException('Invalid MFA challenge');
    }

    let consumedRecoveryHash: string | null = null;
    if (code !== undefined && code.length > 0) {
      const valid = await this.verifyEncryptedTotp(
        user.mfaSecretEncrypted,
        code,
      );
      if (!valid) {
        await this.throttle.failure('staff-mfa', userId, ip);
        throw new UnauthorizedException('Invalid MFA code');
      }
    } else if (recoveryCode !== undefined) {
      consumedRecoveryHash = findMatchingRecoveryCodeHash(
        recoveryCode,
        user.mfaRecoveryCodesHash,
        this.appSecret(),
      );
      if (consumedRecoveryHash === null) {
        await this.throttle.failure('staff-mfa', userId, ip);
        throw new UnauthorizedException('Invalid recovery code');
      }
      await this.prisma.staffUser.update({
        where: { id: user.id },
        data: {
          mfaRecoveryCodesHash: user.mfaRecoveryCodesHash.filter(
            (hash) => hash !== consumedRecoveryHash,
          ),
        },
      });
    }

    await this.throttle.success('staff-mfa', userId, ip);
    return this.createStaffSession(user, request, 'staff.login.succeeded');
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
    const now = Date.now();
    const inactivityTtlMs = this.config.get('STAFF_INACTIVITY_TTL_MS', {
      infer: true,
    });
    if (
      session === null ||
      session.audience !== STAFF_AUDIENCE ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now ||
      session.lastActivityAt.getTime() + inactivityTtlMs <= now ||
      !session.staffUser.active ||
      session.staffUserId !== claims.sub
    ) {
      throw new UnauthorizedException();
    }
    if (now - session.lastActivityAt.getTime() >= STAFF_ACTIVITY_TOUCH_MS) {
      await this.prisma.staffSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { lastActivityAt: new Date(now) },
      });
    }
    return this.toPrincipal(session.staffUser, session.id);
  }

  async rotate(token: string, request: Request) {
    const current = await this.prisma.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (current === null || current.audience !== STAFF_AUDIENCE) {
      throw new UnauthorizedException();
    }
    if (isRotatedRefreshReuse(current)) {
      await this.revokeStaffRefreshFamilyOnReuse(current, request);
      throw new UnauthorizedException();
    }
    const now = Date.now();
    const inactivityTtlMs = this.config.get('STAFF_INACTIVITY_TTL_MS', {
      infer: true,
    });
    if (
      current.revokedAt !== null ||
      current.expiresAt.getTime() <= now ||
      current.lastActivityAt.getTime() + inactivityTtlMs <= now
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
          expiresAt: new Date(now + SESSION_TTL_MS),
          lastActivityAt: new Date(now),
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

  /**
   * Stolen refresh reuse: revoke every still-active session in the rotation
   * chain that followed the reused token (and audit the detection).
   */
  private async revokeStaffRefreshFamilyOnReuse(
    reused: {
      id: string;
      staffUserId: string;
      rotatedToId: string | null;
    },
    request: Request,
  ): Promise<void> {
    const now = new Date();
    const revokedSessionIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const seen = new Set<string>();
      let nextId = reused.rotatedToId;
      while (nextId !== null && !seen.has(nextId)) {
        seen.add(nextId);
        const session = await tx.staffSession.findUnique({
          where: { id: nextId },
          select: { id: true, rotatedToId: true, revokedAt: true },
        });
        if (session === null) {
          break;
        }
        if (session.revokedAt === null) {
          await tx.staffSession.update({
            where: { id: session.id },
            data: { revokedAt: now },
          });
          revokedSessionIds.push(session.id);
        }
        nextId = session.rotatedToId;
      }
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: reused.staffUserId,
          action: 'staff.session.refresh-reuse-detected',
          entityType: 'staff-session',
          entityId: reused.id,
          after: { revokedSessionIds },
          userAgent: safeUserAgent(request) ?? null,
          correlationId: correlationId(request),
        },
      });
    });
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
      mfaEnabled: boolean;
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
      mfaEnabled: user.mfaEnabled,
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
    if ('mfaRequired' in result && result.mfaRequired === true) {
      return {
        mfaRequired: true as const,
        mfaToken: result.mfaToken,
      };
    }
    const session = result as {
      refreshToken: string;
      accessToken: string;
      principal: StaffPrincipal;
    };
    setSessionCookie(
      response,
      STAFF_COOKIE,
      session.refreshToken,
      this.secureCookie,
    );
    setSessionCookie(
      response,
      STAFF_ACCESS_COOKIE,
      session.accessToken,
      this.secureCookie,
      ACCESS_TTL_MS,
    );
    return session.principal;
  }

  @Post('mfa/verify')
  async verifyMfa(
    @Body() dto: StaffMfaVerifyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const challenge: { code?: string; recoveryCode?: string } = {};
    if (dto.code !== undefined) challenge.code = dto.code;
    if (dto.recoveryCode !== undefined) {
      challenge.recoveryCode = dto.recoveryCode;
    }
    const result = await this.auth.verifyMfaChallenge(
      dto.mfaToken,
      challenge,
      request,
    );
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

  @ApiCookieAuth(STAFF_ACCESS_COOKIE)
  @UseGuards(StaffAuthGuard)
  @Post('mfa/setup')
  beginMfaSetup(@CurrentStaff() staff: StaffPrincipal) {
    return this.auth.beginMfaSetup(staff);
  }

  @ApiCookieAuth(STAFF_ACCESS_COOKIE)
  @UseGuards(StaffAuthGuard)
  @Post('mfa/enable')
  enableMfa(
    @Body() dto: StaffMfaEnableDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    return this.auth.enableMfa(staff, dto.code);
  }

  @ApiCookieAuth(STAFF_ACCESS_COOKIE)
  @UseGuards(StaffAuthGuard)
  @Post('mfa/disable')
  disableMfa(
    @Body() dto: StaffMfaDisableDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    const payload: { code?: string; recoveryCode?: string } = {};
    if (dto.code !== undefined) payload.code = dto.code;
    if (dto.recoveryCode !== undefined) {
      payload.recoveryCode = dto.recoveryCode;
    }
    return this.auth.disableMfa(staff, payload);
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
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly throttle: LoginThrottle,
    private readonly mailer: NotificationDispatcher,
    private readonly mailComposer: NotificationComposer,
  ) {}

  async register(dto: CustomerRegisterDto, request: Request) {
    const ip = requestIp(request);
    await this.throttle.assertAllowed('customer-register', dto.email, ip);
    assertStrongAccountPassword(dto.password);

    if (dto.password !== dto.passwordConfirm) {
      await this.throttle.failure('customer-register', dto.email, ip);
      throw new BadRequestException('Passwords do not match');
    }

    const passwordHash = await this.hasher.hash(dto.password);
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
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
            actorId: created.id,
            action: 'customer.registered',
            entityType: 'customer',
            entityId: created.id,
          },
        });
        return created;
      });
      await this.throttle.success('customer-register', dto.email, ip);
      return customer;
    } catch {
      await this.throttle.failure('customer-register', dto.email, ip);
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
    return {
      token,
      customer: {
        id: customer.id,
        email: customer.email ?? '',
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      },
    };
  }

  async authenticate(token: string | undefined): Promise<CustomerPrincipal> {
    if (token === undefined) {
      throw new UnauthorizedException('Customer authentication is required');
    }
    const session = await this.prisma.customerSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            active: true,
          },
        },
      },
    });
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.audience !== CUSTOMER_AUDIENCE ||
      !session.customer.active ||
      session.customer.email === null
    ) {
      throw new UnauthorizedException('Customer authentication is required');
    }
    return {
      id: session.customer.id,
      email: session.customer.email,
      firstName: session.customer.firstName,
      lastName: session.customer.lastName,
      phone: session.customer.phone,
      sessionId: session.id,
    };
  }

  async rotate(token: string): Promise<string> {
    const current = await this.prisma.customerSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (current === null || current.audience !== CUSTOMER_AUDIENCE) {
      throw new UnauthorizedException();
    }
    if (isRotatedRefreshReuse(current)) {
      await this.revokeCustomerRefreshFamilyOnReuse(current);
      throw new UnauthorizedException();
    }
    if (
      current.revokedAt !== null ||
      current.expiresAt.getTime() <= Date.now()
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

  private async revokeCustomerRefreshFamilyOnReuse(reused: {
    id: string;
    customerId: string;
    rotatedToId: string | null;
  }): Promise<void> {
    const now = new Date();
    const revokedSessionIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const seen = new Set<string>();
      let nextId = reused.rotatedToId;
      while (nextId !== null && !seen.has(nextId)) {
        seen.add(nextId);
        const session = await tx.customerSession.findUnique({
          where: { id: nextId },
          select: { id: true, rotatedToId: true, revokedAt: true },
        });
        if (session === null) {
          break;
        }
        if (session.revokedAt === null) {
          await tx.customerSession.update({
            where: { id: session.id },
            data: { revokedAt: now },
          });
          revokedSessionIds.push(session.id);
        }
        nextId = session.rotatedToId;
      }
      await tx.auditLog.create({
        data: {
          actorType: 'customer',
          actorId: reused.customerId,
          action: 'customer.session.refresh-reuse-detected',
          entityType: 'customer-session',
          entityId: reused.id,
          after: { revokedSessionIds },
        },
      });
    });
  }

  async logout(token: string | undefined): Promise<void> {
    if (token === undefined) return;
    await this.prisma.customerSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(
    email: string,
    request: Request,
  ): Promise<{ token?: string }> {
    const ip = requestIp(request);
    await this.throttle.assertAllowed('customer-forgot', email, ip);

    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (customer === null || !customer.active) {
      // Count every attempt so reset spam is rate-limited without revealing
      // whether the email exists.
      await this.throttle.failure('customer-forgot', email, ip);
      return {};
    }

    const token = randomBytes(32).toString('base64url');
    const resetPath = `/account/reset-password?token=${encodeURIComponent(token)}`;
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

    try {
      await this.mailer.sendEmail(
        this.mailComposer.composePasswordReset(email, resetPath),
      );
    } catch {
      // Retry without persisting the plaintext token — worker mints a fresh one.
      await this.prisma.notificationOutbox.create({
        data: {
          topic: 'customer.password-reset',
          referenceType: 'customer',
          referenceId: customer.id,
          payload: {
            email,
          },
        },
      });
    }

    await this.throttle.failure('customer-forgot', email, ip);
    return { token };
  }

  async resetPassword(
    token: string,
    password: string,
    request: Request,
  ): Promise<void> {
    assertStrongAccountPassword(password);
    const ip = requestIp(request);
    const identifier = hashToken(token);
    await this.throttle.assertAllowed('customer-reset', identifier, ip);

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
      await this.throttle.failure('customer-reset', identifier, ip);
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
    await this.throttle.success('customer-reset', identifier, ip);
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
  register(@Body() dto: CustomerRegisterDto, @Req() request: Request) {
    return this.auth.register(dto, request);
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
  async forgotPassword(
    @Body() dto: CustomerForgotPasswordDto,
    @Req() request: Request,
  ) {
    const result = await this.auth.requestPasswordReset(dto.email, request);
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
  resetPassword(
    @Body() dto: CustomerResetPasswordDto,
    @Req() request: Request,
  ) {
    return this.auth
      .resetPassword(dto.token, dto.password, request)
      .then(() => ({
        reset: true,
      }));
  }

  @ApiCookieAuth(CUSTOMER_COOKIE)
  @Get('me')
  async me(@Req() request: Request): Promise<CustomerProfile> {
    const principal = await this.auth.authenticate(
      parseCookie(request, CUSTOMER_COOKIE),
    );
    return {
      id: principal.id,
      email: principal.email,
      firstName: principal.firstName,
      lastName: principal.lastName,
      phone: principal.phone,
    };
  }
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly auth: CustomerAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.customer = await this.auth.authenticate(
      parseCookie(request, CUSTOMER_COOKIE),
    );
    return true;
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

  listRoles() {
    return this.prisma.role.findMany({
      select: {
        code: true,
        name: true,
        permissions: {
          select: {
            permission: { select: { code: true, description: true } },
          },
          orderBy: { permission: { code: 'asc' } },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async create(dto: CreateStaffDto, actor: StaffPrincipal) {
    assertStrongAccountPassword(dto.password);
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
    if (dto.password !== undefined) {
      assertStrongAccountPassword(dto.password);
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

  @Get('roles')
  listRoles() {
    return this.staff.listRoles().then((roles) =>
      roles.map((role) => ({
        code: role.code,
        name: role.name,
        permissions: role.permissions.map((entry) => entry.permission),
      })),
    );
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
  imports: [PrismaModule, NotificationsCoreModule],
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
    CustomerAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    PasswordHasher,
    LoginThrottle,
    StaffAuthService,
    CustomerAuthService,
    StaffAuthGuard,
    CustomerAuthGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
