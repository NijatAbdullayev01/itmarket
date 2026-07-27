import { SupportMessageStatus } from '../generated/prisma/client';

const ALLOWED_STATUS_TRANSITIONS: Record<
  SupportMessageStatus,
  readonly SupportMessageStatus[]
> = {
  [SupportMessageStatus.PENDING]: [
    SupportMessageStatus.OPEN,
    SupportMessageStatus.CLOSED,
  ],
  [SupportMessageStatus.OPEN]: [SupportMessageStatus.CLOSED],
  [SupportMessageStatus.CLOSED]: [],
};

export function canTransitionSupportMessageStatus(
  from: SupportMessageStatus,
  to: SupportMessageStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
