import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import {
  createFiscalReceiptProvider,
  LoggingFiscalReceiptProvider,
  UnconfiguredFiscalReceiptProvider,
} from './fiscal-receipt.provider';

function configWith(
  provider: Environment['FISCAL_RECEIPT_PROVIDER'],
): ConfigService<Environment, true> {
  return {
    get: (key: keyof Environment) =>
      key === 'FISCAL_RECEIPT_PROVIDER' ? provider : undefined,
  } as ConfigService<Environment, true>;
}

describe('createFiscalReceiptProvider', () => {
  it('returns the unconfigured provider for none', () => {
    const provider = createFiscalReceiptProvider(configWith('none'));
    expect(provider).toBeInstanceOf(UnconfiguredFiscalReceiptProvider);
    expect(provider.configured).toBe(false);
  });

  it('returns the logging rehearsal provider for log', async () => {
    const provider = createFiscalReceiptProvider(configWith('log'));
    expect(provider).toBeInstanceOf(LoggingFiscalReceiptProvider);
    expect(provider.configured).toBe(true);
    const result = await provider.issueReceipt({
      saleId: 'sale-1',
      saleNumber: 'POS-1',
      receiptNumber: 'R-1',
      grandTotal: '10.00',
      currency: 'AZN',
      paymentMethod: 'CASH',
    });
    expect(result?.provider).toBe('log');
    expect(result?.fiscalReceiptNumber).toBe('LOG-R-1');
  });
});
