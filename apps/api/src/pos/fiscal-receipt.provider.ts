import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';

export type FiscalReceiptSaleContext = {
  saleId: string;
  saleNumber: string;
  receiptNumber: string;
  grandTotal: string;
  currency: string;
  paymentMethod: string;
};

export type FiscalReceiptIssueResult = {
  provider: string;
  fiscalReceiptNumber: string;
  issuedAt: string;
};

export interface FiscalReceiptProvider {
  readonly code: string;
  readonly configured: boolean;
  issueReceipt(
    sale: FiscalReceiptSaleContext,
  ): Promise<FiscalReceiptIssueResult | null>;
}

@Injectable()
export class UnconfiguredFiscalReceiptProvider implements FiscalReceiptProvider {
  readonly code = 'none';
  readonly configured = false;

  issueReceipt(): Promise<null> {
    return Promise.resolve(null);
  }
}

/**
 * Staging/dev rehearsal adapter. Does not submit to an official e-kassa.
 * Replace with a real provider adapter when D-010 is closed.
 */
@Injectable()
export class LoggingFiscalReceiptProvider implements FiscalReceiptProvider {
  readonly code = 'log';
  readonly configured = true;
  private readonly logger = new Logger(LoggingFiscalReceiptProvider.name);

  async issueReceipt(
    sale: FiscalReceiptSaleContext,
  ): Promise<FiscalReceiptIssueResult> {
    const fiscalReceiptNumber = `LOG-${sale.receiptNumber}`;
    const issuedAt = new Date().toISOString();
    this.logger.log(
      `Fiscal rehearsal receipt sale=${sale.saleNumber} fiscal=${fiscalReceiptNumber} total=${sale.grandTotal} ${sale.currency}`,
    );
    return {
      provider: this.code,
      fiscalReceiptNumber,
      issuedAt,
    };
  }
}

export function createFiscalReceiptProvider(
  config: ConfigService<Environment, true>,
): FiscalReceiptProvider {
  const provider = config.get('FISCAL_RECEIPT_PROVIDER', { infer: true });
  if (provider === 'log') {
    return new LoggingFiscalReceiptProvider();
  }
  return new UnconfiguredFiscalReceiptProvider();
}

export const FISCAL_RECEIPT_PROVIDER = Symbol('FISCAL_RECEIPT_PROVIDER');
