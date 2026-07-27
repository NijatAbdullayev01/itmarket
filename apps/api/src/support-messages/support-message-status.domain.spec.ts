import { SupportMessageStatus } from '../generated/prisma/client';
import { canTransitionSupportMessageStatus } from './support-message-status.domain';

describe('canTransitionSupportMessageStatus', () => {
  it('allows PENDING → OPEN and PENDING → CLOSED', () => {
    expect(
      canTransitionSupportMessageStatus(
        SupportMessageStatus.PENDING,
        SupportMessageStatus.OPEN,
      ),
    ).toBe(true);
    expect(
      canTransitionSupportMessageStatus(
        SupportMessageStatus.PENDING,
        SupportMessageStatus.CLOSED,
      ),
    ).toBe(true);
  });

  it('allows OPEN → CLOSED only', () => {
    expect(
      canTransitionSupportMessageStatus(
        SupportMessageStatus.OPEN,
        SupportMessageStatus.CLOSED,
      ),
    ).toBe(true);
    expect(
      canTransitionSupportMessageStatus(
        SupportMessageStatus.OPEN,
        SupportMessageStatus.PENDING,
      ),
    ).toBe(false);
  });

  it('blocks transitions from CLOSED', () => {
    expect(
      canTransitionSupportMessageStatus(
        SupportMessageStatus.CLOSED,
        SupportMessageStatus.OPEN,
      ),
    ).toBe(false);
  });
});
