import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { NotificationComposer } from './notification-composer';
import { NotificationDispatcher } from './notification-dispatcher.port';
import { NotificationOutboxProcessor } from './notification-outbox.processor';
import { SmtpNotificationDispatcher } from './smtp-notification.dispatcher';

/** Mail/outbox providers without AuthModule (avoids circular import with auth). */
@Module({
  imports: [PrismaModule],
  providers: [
    NotificationComposer,
    NotificationOutboxProcessor,
    {
      provide: NotificationDispatcher,
      useClass: SmtpNotificationDispatcher,
    },
  ],
  exports: [
    NotificationDispatcher,
    NotificationComposer,
    NotificationOutboxProcessor,
  ],
})
export class NotificationsCoreModule {}
