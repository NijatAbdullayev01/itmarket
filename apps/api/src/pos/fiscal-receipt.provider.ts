import { Injectable } from '@nestjs/common';
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

export function createFiscalReceiptProvider(
  config: ConfigService<Environment, true>,
): FiscalReceiptProvider {
  const provider = config.get('FISCAL_RECEIPT_PROVIDER', { infer: true });
  if (provider === 'none') {
    return new UnconfiguredFiscalReceiptProvider();
  }
  return new UnconfiguredFiscalReceiptProvider();
}

export const FISCAL_RECEIPT_PROVIDER = Symbol('FISCAL_RECEIPT_PROVIDER');
