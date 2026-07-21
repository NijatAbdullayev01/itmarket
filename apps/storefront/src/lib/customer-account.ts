import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL, window.location);
  }
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

const SESSION_COOKIE = "itmarket_customer_session";

export type CustomerAccountProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export type CustomerAccountAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  administrativeArea: string | null;
  addressLine: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAccountOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  recipientName: string | null;
  itemCount: number;
  grandTotal: string;
  currency: "AZN";
  createdAt: string;
  updatedAt: string;
};

type AccountFailure = { ok: false; message: string };
type AccountSuccess<T> = { ok: true; data: T };
export type AccountResult<T> = AccountSuccess<T> | AccountFailure;

async function parseErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  if (body.trim() === "") {
    return "Sorğu uğursuz oldu";
  }

  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }
    if (typeof parsed.message === "string" && parsed.message.trim() !== "") {
      return parsed.message;
    }
  } catch {
    // Fall through.
  }

  return "Sorğu uğursuz oldu";
}

async function customerAccountRequest(
  path: string,
  sessionToken: string,
  init?: {
    method?: string;
    body?: Record<string, unknown>;
  },
): Promise<Response> {
  const headers: Record<string, string> = {
    Cookie: `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}`,
  };
  if (init?.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  return fetch(`${getApiBase()}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
}

export async function fetchCustomerProfile(
  sessionToken: string,
): Promise<AccountResult<CustomerAccountProfile>> {
  const response = await customerAccountRequest("/customer/me", sessionToken);
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return { ok: true, data: (await response.json()) as CustomerAccountProfile };
}

export async function updateCustomerProfile(
  sessionToken: string,
  input: {
    firstName: string;
    lastName: string;
    phone?: string;
  },
): Promise<AccountResult<CustomerAccountProfile>> {
  const response = await customerAccountRequest("/customer/me", sessionToken, {
    method: "PATCH",
    body: input,
  });
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return { ok: true, data: (await response.json()) as CustomerAccountProfile };
}

export async function fetchCustomerOrders(
  sessionToken: string,
): Promise<AccountResult<CustomerAccountOrder[]>> {
  const response = await customerAccountRequest(
    "/customer/orders",
    sessionToken,
  );
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return {
    ok: true,
    data: (await response.json()) as CustomerAccountOrder[],
  };
}

export async function cancelCustomerOrder(
  sessionToken: string,
  orderId: string,
): Promise<AccountResult<CustomerAccountOrder>> {
  const response = await customerAccountRequest(
    `/customer/orders/${orderId}/cancel`,
    sessionToken,
    { method: "POST" },
  );
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return {
    ok: true,
    data: (await response.json()) as CustomerAccountOrder,
  };
}

export async function fetchCustomerAddresses(
  sessionToken: string,
): Promise<AccountResult<CustomerAccountAddress[]>> {
  const response = await customerAccountRequest(
    "/customer/addresses",
    sessionToken,
  );
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return {
    ok: true,
    data: (await response.json()) as CustomerAccountAddress[],
  };
}

export type CustomerAddressInput = {
  label?: string;
  recipientName: string;
  phone: string;
  administrativeArea?: string;
  addressLine: string;
  notes?: string;
  isDefault?: boolean;
};

export async function createCustomerAddress(
  sessionToken: string,
  input: CustomerAddressInput,
): Promise<AccountResult<CustomerAccountAddress>> {
  const response = await customerAccountRequest(
    "/customer/addresses",
    sessionToken,
    { method: "POST", body: input },
  );
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return {
    ok: true,
    data: (await response.json()) as CustomerAccountAddress,
  };
}

export async function updateCustomerAddress(
  sessionToken: string,
  addressId: string,
  input: CustomerAddressInput,
): Promise<AccountResult<CustomerAccountAddress>> {
  const response = await customerAccountRequest(
    `/customer/addresses/${addressId}`,
    sessionToken,
    { method: "PATCH", body: input },
  );
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return {
    ok: true,
    data: (await response.json()) as CustomerAccountAddress,
  };
}

export async function deleteCustomerAddress(
  sessionToken: string,
  addressId: string,
): Promise<AccountResult<{ deleted: true }>> {
  const response = await customerAccountRequest(
    `/customer/addresses/${addressId}`,
    sessionToken,
    { method: "DELETE" },
  );
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }
  return { ok: true, data: { deleted: true } };
}

export async function attachCustomerCart(
  sessionToken: string,
  cartId: string,
): Promise<void> {
  try {
    await customerAccountRequest("/customer/carts/attach", sessionToken, {
      method: "POST",
      body: { cartId },
    });
  } catch {
    // Checkout can still link by email if attach fails.
  }
}
