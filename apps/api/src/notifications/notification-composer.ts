import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import type { OutboundEmail } from './notification-dispatcher.port';

type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

@Injectable()
export class NotificationComposer {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  composePasswordReset(email: string, resetPath: string): OutboundEmail {
    const origin = this.config.get('STOREFRONT_ORIGIN', { infer: true });
    const resetUrl = `${origin}${resetPath}`;
    return {
      to: email,
      subject: 'ITMarket — şifrə sıfırlama',
      text: `Şifrənizi sıfırlamaq üçün bu linkə keçin (1 saat etibarlıdır):\n\n${resetUrl}\n\nƏgər bu sorğunu siz göndərməmisinizsə, bu məktubu nəzərə almayın.`,
      html: `<p>Şifrənizi sıfırlamaq üçün <a href="${resetUrl}">bu linkə</a> keçin (1 saat etibarlıdır).</p><p>Əgər bu sorğunu siz göndərməmisinizsə, bu məktubu nəzərə almayın.</p>`,
    };
  }

  composeFromOutbox(
    topic: string,
    payload: unknown,
    recipientEmail: string | null,
  ): OutboundEmail | null {
    if (recipientEmail === null) {
      return null;
    }

    const data = isRecord(payload) ? payload : {};
    const orderNumber = asString(data.orderNumber);
    const productName = asString(data.productName);

    switch (topic) {
      case 'customer.password-reset': {
        const resetPath = asString(data.resetPath);
        if (resetPath === null) {
          return null;
        }
        return this.composePasswordReset(recipientEmail, resetPath);
      }
      case 'orders.confirmed':
        return simpleMail(
          recipientEmail,
          'ITMarket — sifariş təsdiqləndi',
          `Sifarişiniz təsdiqləndi${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'orders.processing.started':
        return simpleMail(
          recipientEmail,
          'ITMarket — sifariş hazırlanır',
          `Sifarişiniz hazırlanır${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'orders.pickup.ready':
        return simpleMail(
          recipientEmail,
          'ITMarket — sifariş təhvilə hazırdır',
          `Sifarişiniz təhvilə hazırdır${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'orders.delivery.ready':
      case 'orders.delivery.dispatched':
        return simpleMail(
          recipientEmail,
          'ITMarket — çatdırılma yeniləməsi',
          `Sifarişinizin çatdırılma statusu yeniləndi${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'orders.completed':
        return simpleMail(
          recipientEmail,
          'ITMarket — sifariş tamamlandı',
          `Sifarişiniz tamamlandı${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'orders.cancelled':
        return simpleMail(
          recipientEmail,
          'ITMarket — sifariş ləğv edildi',
          `Sifarişiniz ləğv edildi${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'orders.refunded':
      case 'payments.refunded':
        return simpleMail(
          recipientEmail,
          'ITMarket — geri ödəmə',
          `Sifarişiniz üzrə geri ödəmə emal edildi${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'payments.paid':
        return simpleMail(
          recipientEmail,
          'ITMarket — ödəniş qəbul edildi',
          `Ödənişiniz qəbul edildi${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'payments.cancelled':
      case 'payments.failed':
      case 'payments.timeout.expired':
        return simpleMail(
          recipientEmail,
          'ITMarket — ödəniş tamamlanmadı',
          `Ödəniş tamamlanmadı${orderNumber ? `: ${orderNumber}` : ''}.`,
        );
      case 'storefront.stock_alert.fulfilled':
        return simpleMail(
          recipientEmail,
          'ITMarket — məhsul stokda',
          `${productName ?? 'Məhsul'} yenidən stokdadır.`,
        );
      case 'storefront.preorder.requested':
      case 'storefront.stock_alert.requested':
        return simpleMail(
          recipientEmail,
          'ITMarket — sorğunuz qəbul edildi',
          `${productName ?? 'Məhsul'} üzrə sorğunuz qəbul edildi.`,
        );
      case 'credit-application.processing':
        return simpleMail(
          recipientEmail,
          'ITMarket — kredit müraciəti baxılır',
          `${productName ?? 'Məhsul'} üzrə kredit müraciətinizə baxılır.`,
        );
      case 'credit-application.approved':
        return simpleMail(
          recipientEmail,
          'ITMarket — kredit müraciəti təsdiqləndi',
          `${productName ?? 'Məhsul'} üzrə kredit müraciətiniz təsdiqləndi.`,
        );
      case 'credit-application.rejected':
        return simpleMail(
          recipientEmail,
          'ITMarket — kredit müraciəti rədd edildi',
          `${productName ?? 'Məhsul'} üzrə kredit müraciətiniz rədd edildi.`,
        );
      default:
        // Operational topics (manual-review, mismatch, reconcile) stay log-only.
        return null;
    }
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function simpleMail(to: string, subject: string, text: string): OutboundEmail {
  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  return {
    to,
    subject,
    text,
    html: `<p>${escaped}</p>`,
  };
}
