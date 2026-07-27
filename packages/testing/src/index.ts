/**
 * Shared test helpers for ITMarket apps.
 * Keep factories deterministic and free of production secrets.
 */

export function createTestId(prefix = 'test'): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

export function expectDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected value to be defined');
  }
  return value;
}
