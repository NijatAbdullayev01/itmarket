import { CreditApplicationStatus } from '../generated/prisma/client';

const ALLOWED_STATUS_TRANSITIONS: Record<
  CreditApplicationStatus,
  readonly CreditApplicationStatus[]
> = {
  [CreditApplicationStatus.PENDING]: [
    CreditApplicationStatus.PROCESSING,
    CreditApplicationStatus.REJECTED,
  ],
  [CreditApplicationStatus.PROCESSING]: [
    CreditApplicationStatus.APPROVED,
    CreditApplicationStatus.REJECTED,
  ],
  [CreditApplicationStatus.APPROVED]: [],
  [CreditApplicationStatus.REJECTED]: [],
};

export function canTransitionCreditApplicationStatus(
  from: CreditApplicationStatus,
  to: CreditApplicationStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
