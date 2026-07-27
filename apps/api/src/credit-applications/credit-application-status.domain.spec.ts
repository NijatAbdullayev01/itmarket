import { CreditApplicationStatus } from '../generated/prisma/client';
import { canTransitionCreditApplicationStatus } from './credit-application-status.domain';

describe('canTransitionCreditApplicationStatus', () => {
  it('allows PENDING → PROCESSING and PENDING → REJECTED', () => {
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.PENDING,
        CreditApplicationStatus.PROCESSING,
      ),
    ).toBe(true);
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.PENDING,
        CreditApplicationStatus.REJECTED,
      ),
    ).toBe(true);
  });

  it('rejects PENDING → APPROVED (must process first)', () => {
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.PENDING,
        CreditApplicationStatus.APPROVED,
      ),
    ).toBe(false);
  });

  it('allows PROCESSING → APPROVED and PROCESSING → REJECTED', () => {
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.PROCESSING,
        CreditApplicationStatus.APPROVED,
      ),
    ).toBe(true);
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.PROCESSING,
        CreditApplicationStatus.REJECTED,
      ),
    ).toBe(true);
  });

  it('rejects transitions from terminal statuses', () => {
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.APPROVED,
        CreditApplicationStatus.REJECTED,
      ),
    ).toBe(false);
    expect(
      canTransitionCreditApplicationStatus(
        CreditApplicationStatus.REJECTED,
        CreditApplicationStatus.PROCESSING,
      ),
    ).toBe(false);
  });
});
