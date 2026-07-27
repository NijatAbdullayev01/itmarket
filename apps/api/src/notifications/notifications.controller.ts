import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
} from '../auth/auth.module';
import { NotificationOutboxProcessor } from './notification-outbox.processor';

@ApiTags('staff-notifications')
@ApiCookieAuth()
@UseGuards(StaffAuthGuard, PermissionsGuard)
@Controller('staff/notifications')
export class NotificationsController {
  constructor(private readonly outbox: NotificationOutboxProcessor) {}

  @Post('outbox/:id/requeue')
  @RequirePermissions(Permission.AUDIT_READ)
  requeueFailed(@Param('id', ParseUUIDPipe) id: string) {
    return this.outbox.requeueFailed(id);
  }
}
