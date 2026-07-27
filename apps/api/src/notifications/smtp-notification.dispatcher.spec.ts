import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { SmtpNotificationDispatcher } from './smtp-notification.dispatcher';

const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: () => ({ sendMail }),
  },
}));

describe('SmtpNotificationDispatcher', () => {
  beforeEach(() => {
    sendMail.mockClear();
  });

  it('sends mail through the configured SMTP transport', async () => {
    const config = {
      get: (key: keyof Environment) => {
        const values: Partial<Environment> = {
          EMAIL_FROM: 'ITMarket <no-reply@itmarket.local>',
          SMTP_HOST: 'localhost',
          SMTP_PORT: 1025,
          SMTP_SECURE: false,
        };
        return values[key];
      },
    } as ConfigService<Environment, true>;

    const dispatcher = new SmtpNotificationDispatcher(config);
    await dispatcher.sendEmail({
      to: 'customer@example.test',
      subject: 'Test',
      text: 'Hello',
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: 'ITMarket <no-reply@itmarket.local>',
      to: 'customer@example.test',
      subject: 'Test',
      text: 'Hello',
      html: undefined,
    });
  });
});
