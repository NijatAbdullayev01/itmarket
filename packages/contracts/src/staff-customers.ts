export interface CustomerNavCountsContract {
  /** Storefront-da qeydiyyatdan keçmiş müştərilərin ümumi sayı. */
  registered: number;
  /**
   * Qeydiyyatsız (guest) sifariş verən unikal müştəri sayı.
   * `orders.customer_id IS NULL` üzrə e-poçt/telefon aqreqasiyası.
   */
  unregistered: number;
}

export interface StaffCustomerSummaryContract {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  active: boolean;
  createdAt: string;
}

/**
 * Qeydiyyatsız checkout ilə sifariş verən şəxslərin aqreqat profili.
 * `identityKey`: `e:<email>` | `p:<digits>` | `o:<orderId>` (fallback).
 */
export interface StaffUnregisteredCustomerSummaryContract {
  identityKey: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  orderCount: number;
  lastOrderAt: string;
  firstOrderAt: string;
  /** AZN məbləğ, decimal string. */
  totalSpent: string;
}
