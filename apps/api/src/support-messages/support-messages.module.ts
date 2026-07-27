import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  Page,
  StaffSupportMessageNavCountsContract,
  StaffSupportMessageSummaryContract,
  StaffSupportThreadDetailContract,
  SupportChatMessageContract,
  SupportChatRealtimeEvent,
} from '@itmarket/contracts';
import {
  AuthModule,
  CurrentStaff,
  LoginThrottle,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
  type StaffPrincipal,
} from '../auth/auth.module';
import {
  Prisma,
  SupportChatSenderType,
  SupportMessageStatus,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { SupportChatRealtimeService } from './support-chat.realtime';
import { canTransitionSupportMessageStatus } from './support-message-status.domain';

export class CreateSupportMessageDto {
  @ApiProperty({ example: 'Aysel Məmmədova' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+994501112233' })
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({ example: 'aysel@example.az' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ example: 'Məhsul haqqında məlumat almaq istəyirəm.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ example: '/products/iphone-15' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pagePath?: string;
}

export class PostSupportChatMessageDto {
  @ApiProperty({ example: 'Salam, hələ gözləyirəm.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class StaffSupportMessagesListQuery {
  @ApiPropertyOptional({
    description: 'Filter by message status',
    enum: SupportMessageStatus,
  })
  @IsOptional()
  @IsEnum(SupportMessageStatus)
  status?: SupportMessageStatus;

  @ApiPropertyOptional({
    description: 'Page size',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @ApiPropertyOptional({
    description: 'Cursor (thread id) for the next page',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class UpdateStaffSupportMessageDto {
  @ApiProperty({
    description: 'Next status. Allowed: PENDING→OPEN|CLOSED; OPEN→CLOSED',
    enum: SupportMessageStatus,
    example: SupportMessageStatus.OPEN,
  })
  @IsEnum(SupportMessageStatus)
  status!: SupportMessageStatus;
}

const chatMessageSelect = {
  id: true,
  threadId: true,
  senderType: true,
  staffUserId: true,
  body: true,
  createdAt: true,
  staffUser: { select: { displayName: true } },
} satisfies Prisma.SupportChatMessageSelect;

type ChatMessageRow = Prisma.SupportChatMessageGetPayload<{
  select: typeof chatMessageSelect;
}>;

const staffThreadSelect = {
  id: true,
  status: true,
  name: true,
  phone: true,
  email: true,
  body: true,
  pagePath: true,
  customerId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { body: true },
  },
} satisfies Prisma.SupportMessageSelect;

type StaffThreadRow = Prisma.SupportMessageGetPayload<{
  select: typeof staffThreadSelect;
}>;

function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function guestTokenHashesEqual(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex, 'utf8');
  const right = Buffer.from(rightHex, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

function requestIp(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

export const SUPPORT_GUEST_TOKEN_HEADER = 'x-support-guest-token';

function formatPersonDisplayName(
  person: { firstName: string | null; lastName: string | null } | null,
): string | null {
  if (person === null) {
    return null;
  }
  const parts = [person.firstName, person.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : null;
}

function mapChatMessage(row: ChatMessageRow): SupportChatMessageContract {
  return {
    id: row.id,
    threadId: row.threadId,
    senderType: row.senderType,
    staffUserId: row.staffUserId,
    staffDisplayName: row.staffUser?.displayName ?? null,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapStaffThread(row: StaffThreadRow): StaffSupportMessageSummaryContract {
  const lastPreview = row.messages[0]?.body ?? row.body;
  return {
    id: row.id,
    status: row.status,
    name: row.name,
    phone: row.phone,
    email: row.email,
    body: row.body,
    lastMessagePreview: lastPreview,
    lastMessageAt: row.lastMessageAt.toISOString(),
    pagePath: row.pagePath,
    customerId: row.customerId,
    customerName: formatPersonDisplayName(row.customer),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function writeSse(
  request: Request,
  response: Response,
  subscribe: (
    handler: (event: SupportChatRealtimeEvent) => void,
  ) => Promise<() => Promise<void>>,
): Promise<void> {
  response.status(200);
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  if (typeof response.flushHeaders === 'function') {
    response.flushHeaders();
  }

  const send = (event: string, data: unknown) => {
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('ready', { ok: true });

  const unsubscribe = await subscribe((event) => {
    send(event.type, event);
  });

  const heartbeat = setInterval(() => {
    response.write(': ping\n\n');
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    void unsubscribe();
  };

  request.on('close', cleanup);
  request.on('error', cleanup);
}

@Injectable()
export class SupportMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: SupportChatRealtimeService,
    private readonly throttle: LoginThrottle,
  ) {}

  async createThread(dto: CreateSupportMessageDto, ip: string) {
    await this.throttle.assertAllowed(
      'support-create',
      dto.phone.trim(),
      ip,
    );
    const guestToken = randomBytes(32).toString('hex');
    const body = dto.body.trim();
    const created = await this.prisma.$transaction(async (tx) => {
      const thread = await tx.supportMessage.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone.trim(),
          body,
          guestTokenHash: hashGuestToken(guestToken),
          lastMessageAt: new Date(),
          ...(dto.email === undefined
            ? {}
            : { email: dto.email.trim().toLowerCase() }),
          ...(dto.pagePath === undefined || dto.pagePath.trim() === ''
            ? {}
            : { pagePath: dto.pagePath.trim().slice(0, 500) }),
        },
        select: staffThreadSelect,
      });

      const message = await tx.supportChatMessage.create({
        data: {
          threadId: thread.id,
          senderType: SupportChatSenderType.CUSTOMER,
          body,
        },
        select: chatMessageSelect,
      });

      return { thread, message };
    });

    await this.throttle.success('support-create', dto.phone.trim(), ip);

    const summary = mapStaffThread(created.thread);
    const message = mapChatMessage(created.message);
    await this.realtime.publish({
      type: 'thread',
      threadId: summary.id,
      thread: summary,
    });
    await this.realtime.publish({
      type: 'message',
      threadId: summary.id,
      message,
    });

    return {
      id: summary.id,
      status: summary.status,
      guestToken,
      messages: [message],
    };
  }

  async assertCustomerThreadAccess(
    threadId: string,
    guestToken: string | undefined,
    customerId: string | undefined,
  ) {
    const thread = await this.prisma.supportMessage.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        status: true,
        guestTokenHash: true,
        customerId: true,
      },
    });
    if (thread === null) {
      throw new NotFoundException({
        code: 'SUPPORT_MESSAGE_NOT_FOUND',
        message: 'Söhbət tapılmadı',
      });
    }

    const guestOk =
      guestToken !== undefined &&
      thread.guestTokenHash !== null &&
      guestTokenHashesEqual(
        hashGuestToken(guestToken),
        thread.guestTokenHash,
      );
    const customerOk =
      customerId !== undefined &&
      thread.customerId !== null &&
      thread.customerId === customerId;

    if (!guestOk && !customerOk) {
      throw new ForbiddenException({
        code: 'SUPPORT_THREAD_FORBIDDEN',
        message: 'Bu söhbətə giriş icazəniz yoxdur',
      });
    }

    return thread;
  }

  async listCustomerMessages(
    threadId: string,
    guestToken: string | undefined,
    customerId: string | undefined,
  ) {
    await this.assertCustomerThreadAccess(threadId, guestToken, customerId);
    const messages = await this.prisma.supportChatMessage.findMany({
      where: { threadId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: chatMessageSelect,
    });
    const thread = await this.prisma.supportMessage.findUniqueOrThrow({
      where: { id: threadId },
      select: { id: true, status: true },
    });
    return {
      id: thread.id,
      status: thread.status,
      messages: messages.map(mapChatMessage),
    };
  }

  async postCustomerMessage(
    threadId: string,
    body: string,
    guestToken: string | undefined,
    customerId: string | undefined,
    ip: string,
  ) {
    await this.throttle.assertAllowed('support-message', threadId, ip);
    const thread = await this.assertCustomerThreadAccess(
      threadId,
      guestToken,
      customerId,
    );
    if (thread.status === SupportMessageStatus.CLOSED) {
      throw new BadRequestException({
        code: 'SUPPORT_THREAD_CLOSED',
        message: 'Bu söhbət bağlanıb',
      });
    }

    const trimmed = body.trim();
    const reopen = thread.status !== SupportMessageStatus.PENDING;
    const message = await this.prisma.$transaction(async (tx) => {
      const row = await tx.supportChatMessage.create({
        data: {
          threadId,
          senderType: SupportChatSenderType.CUSTOMER,
          body: trimmed,
        },
        select: chatMessageSelect,
      });
      await tx.supportMessage.update({
        where: { id: threadId },
        data: {
          lastMessageAt: row.createdAt,
          body: trimmed,
          ...(reopen ? { status: SupportMessageStatus.PENDING } : {}),
        },
      });
      return row;
    });

    const mapped = mapChatMessage(message);
    await this.realtime.publish({
      type: 'message',
      threadId,
      message: mapped,
    });
    if (reopen) {
      await this.realtime.publish({
        type: 'status',
        threadId,
        status: SupportMessageStatus.PENDING,
      });
    }
    await this.throttle.success('support-message', threadId, ip);
    return mapped;
  }

  async counts(): Promise<StaffSupportMessageNavCountsContract> {
    const pending = await this.prisma.supportMessage.count({
      where: { status: SupportMessageStatus.PENDING },
    });
    return { pending };
  }

  async list(
    query: StaffSupportMessagesListQuery,
  ): Promise<Page<StaffSupportMessageSummaryContract>> {
    const where: Prisma.SupportMessageWhereInput = {
      ...(query.status === undefined ? {} : { status: query.status }),
    };

    const rows = await this.prisma.supportMessage.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      select: staffThreadSelect,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: pageRows.map(mapStaffThread),
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }

  async getStaffThread(
    id: string,
  ): Promise<StaffSupportThreadDetailContract> {
    const thread = await this.prisma.supportMessage.findUnique({
      where: { id },
      select: staffThreadSelect,
    });
    if (thread === null) {
      throw new NotFoundException({
        code: 'SUPPORT_MESSAGE_NOT_FOUND',
        message: 'Mesaj tapılmadı',
      });
    }
    const messages = await this.prisma.supportChatMessage.findMany({
      where: { threadId: id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: chatMessageSelect,
    });
    return {
      ...mapStaffThread(thread),
      messages: messages.map(mapChatMessage),
    };
  }

  async postStaffMessage(
    threadId: string,
    body: string,
    actor: StaffPrincipal,
  ): Promise<SupportChatMessageContract> {
    const existing = await this.prisma.supportMessage.findUnique({
      where: { id: threadId },
      select: { id: true, status: true },
    });
    if (existing === null) {
      throw new NotFoundException({
        code: 'SUPPORT_MESSAGE_NOT_FOUND',
        message: 'Mesaj tapılmadı',
      });
    }
    if (existing.status === SupportMessageStatus.CLOSED) {
      throw new BadRequestException({
        code: 'SUPPORT_THREAD_CLOSED',
        message: 'Bağlı söhbətə cavab yazıla bilməz',
      });
    }

    const trimmed = body.trim();
    const message = await this.prisma.$transaction(async (tx) => {
      const row = await tx.supportChatMessage.create({
        data: {
          threadId,
          senderType: SupportChatSenderType.STAFF,
          staffUserId: actor.id,
          body: trimmed,
        },
        select: chatMessageSelect,
      });
      await tx.supportMessage.update({
        where: { id: threadId },
        data: {
          lastMessageAt: row.createdAt,
          body: trimmed,
          ...(existing.status === SupportMessageStatus.PENDING
            ? { status: SupportMessageStatus.OPEN }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'support-message.replied',
          entityType: 'support_message',
          entityId: threadId,
          after: { messageId: row.id },
        },
      });
      return row;
    });

    const mapped = mapChatMessage(message);
    await this.realtime.publish({
      type: 'message',
      threadId,
      message: mapped,
    });
    if (existing.status === SupportMessageStatus.PENDING) {
      await this.realtime.publish({
        type: 'status',
        threadId,
        status: SupportMessageStatus.OPEN,
      });
    }
    return mapped;
  }

  async updateStatus(
    id: string,
    status: SupportMessageStatus,
    actor: StaffPrincipal,
  ): Promise<StaffSupportMessageSummaryContract> {
    const existing = await this.prisma.supportMessage.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (existing === null) {
      throw new NotFoundException({
        code: 'SUPPORT_MESSAGE_NOT_FOUND',
        message: 'Mesaj tapılmadı',
      });
    }

    if (existing.status === status) {
      const unchanged = await this.prisma.supportMessage.findUniqueOrThrow({
        where: { id },
        select: staffThreadSelect,
      });
      return mapStaffThread(unchanged);
    }

    if (!canTransitionSupportMessageStatus(existing.status, status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Status keçidi icazəli deyil: ${existing.status} → ${status}`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.supportMessage.update({
        where: { id },
        data: { status },
        select: staffThreadSelect,
      });

      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'support-message.status-changed',
          entityType: 'support_message',
          entityId: row.id,
          before: { status: existing.status },
          after: { status: row.status },
        },
      });

      return row;
    });

    const summary = mapStaffThread(updated);
    await this.realtime.publish({
      type: 'status',
      threadId: id,
      status: summary.status,
    });
    return summary;
  }
}

@ApiTags('storefront-support-messages')
@Controller({ path: 'storefront/support-messages', version: '1' })
class StorefrontSupportMessagesController {
  constructor(
    private readonly supportMessages: SupportMessagesService,
    private readonly realtime: SupportChatRealtimeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start a live support chat thread' })
  @ApiOkResponse({ description: 'Created support chat thread' })
  create(@Body() dto: CreateSupportMessageDto, @Req() request: Request) {
    return this.supportMessages.createThread(dto, requestIp(request));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Load support chat messages for a thread' })
  @ApiHeader({ name: SUPPORT_GUEST_TOKEN_HEADER, required: true })
  getThread(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(SUPPORT_GUEST_TOKEN_HEADER) guestToken: string | undefined,
  ) {
    return this.supportMessages.listCustomerMessages(
      id,
      guestToken,
      undefined,
    );
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a customer message in a live chat thread' })
  @ApiHeader({ name: SUPPORT_GUEST_TOKEN_HEADER, required: true })
  postMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostSupportChatMessageDto,
    @Headers(SUPPORT_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: Request,
  ) {
    if (guestToken === undefined || guestToken.trim() === '') {
      throw new BadRequestException({
        code: 'GUEST_TOKEN_REQUIRED',
        message: 'Söhbət tokeni tələb olunur',
      });
    }
    return this.supportMessages.postCustomerMessage(
      id,
      dto.body,
      guestToken,
      undefined,
      requestIp(request),
    );
  }

  @Get(':id/events')
  @ApiOperation({
    summary:
      'SSE stream for a customer support chat thread (guestToken query required; EventSource cannot set headers)',
  })
  async events(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('guestToken') guestToken: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.supportMessages.assertCustomerThreadAccess(
      id,
      guestToken,
      undefined,
    );
    await writeSse(request, response, (handler) =>
      this.realtime.subscribeThread(id, handler),
    );
  }
}

@ApiTags('support-messages')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.SUPPORT_MESSAGES_MANAGE)
@Controller({ path: 'support-messages', version: '1' })
class StaffSupportMessagesController {
  constructor(
    private readonly supportMessages: SupportMessagesService,
    private readonly realtime: SupportChatRealtimeService,
  ) {}

  @Get('counts')
  @ApiOperation({
    summary: 'Pending support chat counts for backoffice navigation',
  })
  @ApiOkResponse({ description: 'Pending support thread total' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing support-messages.manage permission',
  })
  counts(): Promise<StaffSupportMessageNavCountsContract> {
    return this.supportMessages.counts();
  }

  @Get()
  @ApiOperation({
    summary: 'List storefront support chat threads for staff',
  })
  @ApiOkResponse({ description: 'Paginated support thread summaries' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing support-messages.manage permission',
  })
  list(
    @Query() query: StaffSupportMessagesListQuery,
  ): Promise<Page<StaffSupportMessageSummaryContract>> {
    return this.supportMessages.list(query);
  }

  @Get('events')
  @ApiOperation({ summary: 'SSE stream for staff support inbox' })
  async inboxEvents(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await writeSse(request, response, (handler) =>
      this.realtime.subscribeInbox(handler),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a support chat thread with messages' })
  @ApiNotFoundResponse({ description: 'Support thread not found' })
  getThread(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffSupportThreadDetailContract> {
    return this.supportMessages.getStaffThread(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'SSE stream for a staff support chat thread' })
  async threadEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.supportMessages.getStaffThread(id);
    await writeSse(request, response, (handler) =>
      this.realtime.subscribeThread(id, handler),
    );
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Reply to a support chat thread as staff' })
  postMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostSupportChatMessageDto,
    @CurrentStaff() staff: StaffPrincipal,
  ): Promise<SupportChatMessageContract> {
    return this.supportMessages.postStaffMessage(id, dto.body, staff);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update support thread status with allowed transitions',
  })
  @ApiOkResponse({ description: 'Updated support thread summary' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing support-messages.manage permission',
  })
  @ApiNotFoundResponse({ description: 'Support thread not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffSupportMessageDto,
    @CurrentStaff() staff: StaffPrincipal,
  ): Promise<StaffSupportMessageSummaryContract> {
    return this.supportMessages.updateStatus(id, dto.status, staff);
  }
}

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [
    StorefrontSupportMessagesController,
    StaffSupportMessagesController,
  ],
  providers: [SupportMessagesService, SupportChatRealtimeService],
})
export class SupportMessagesModule {}
