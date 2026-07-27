import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Environment } from '../config/environment';
import {
  NotificationDispatcher,
  type OutboundEmail,
} from './notification-dispatcher.port';

@Injectable()
export class SmtpNotificationDispatcher extends NotificationDispatcher {
  private readonly logger = new Logger(SmtpNotificationDispatcher.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Environment, true>) {
    super();
  }

  async sendEmail(message: OutboundEmail): Promise<void> {
    const transporter = this.getTransporter();
    const from = this.config.get('EMAIL_FROM', { infer: true });
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    this.logger.debug(`Sent email to=${message.to} subject=${message.subject}`);
  }

  private getTransporter(): Transporter {
    if (this.transporter !== null) {
      return this.transporter;
    }

    const host = this.config.get('SMTP_HOST', { infer: true });
    const port = this.config.get('SMTP_PORT', { infer: true });
    const secure = this.config.get('SMTP_SECURE', { infer: true });
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user !== undefined && pass !== undefined
        ? { auth: { user, pass } }
        : {}),
    });
    return this.transporter;
  }
}
