export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export abstract class NotificationDispatcher {
  abstract sendEmail(message: OutboundEmail): Promise<void>;
}
