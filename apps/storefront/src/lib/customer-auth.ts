const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
).replace(/\/+$/, "");

const SESSION_COOKIE = "itmarket_customer_session";

export type CustomerAuthCustomer = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

type CustomerAuthSuccess = {
  ok: true;
  customer: CustomerAuthCustomer;
  sessionToken: string;
};

type CustomerAuthFailure = {
  ok: false;
  message: string;
};

export type CustomerAuthResult = CustomerAuthSuccess | CustomerAuthFailure;

function parseSessionToken(setCookieHeaders: string[]): string | undefined {
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`^${SESSION_COOKIE}=([^;]+)`));
    if (match?.[1] !== undefined) {
      return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

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
    // Fall through to generic message.
  }

  return "Sorğu uğursuz oldu";
}

async function customerAuthRequest(
  path: string,
  body?: Record<string, string>,
  sessionToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (sessionToken !== undefined) {
    headers.Cookie = `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}`;
  }

  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
}

export async function loginCustomer(
  email: string,
  password: string,
): Promise<CustomerAuthResult> {
  const response = await customerAuthRequest("/customer/auth/login", {
    email,
    password,
  });
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }

  const customer = (await response.json()) as CustomerAuthCustomer;
  const sessionToken = parseSessionToken(response.headers.getSetCookie?.() ?? []);
  if (sessionToken === undefined) {
    return { ok: false, message: "Sessiya yaradıla bilmədi" };
  }

  return { ok: true, customer, sessionToken };
}

export type CustomerRegisterInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  passwordConfirm: string;
};

export async function registerCustomer(
  input: CustomerRegisterInput,
): Promise<CustomerAuthResult> {
  const response = await customerAuthRequest("/customer/auth/register", input);
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }

  return loginCustomer(input.email, input.password);
}

export async function logoutCustomer(
  sessionToken: string | undefined,
): Promise<void> {
  if (sessionToken === undefined) return;

  try {
    await customerAuthRequest("/customer/auth/logout", undefined, sessionToken);
  } catch {
    // Local session is cleared even if API is unreachable.
  }
}

export type ForgotPasswordResult =
  | { ok: true; devResetUrl?: string }
  | { ok: false; message: string };

export async function requestPasswordReset(
  email: string,
): Promise<ForgotPasswordResult> {
  const response = await customerAuthRequest("/customer/auth/forgot-password", {
    email,
  });
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }

  const body = (await response.json()) as {
    accepted: true;
    devResetUrl?: string;
  };
  return { ok: true, devResetUrl: body.devResetUrl };
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; message: string };

export async function resetCustomerPassword(
  token: string,
  password: string,
): Promise<ResetPasswordResult> {
  const response = await customerAuthRequest("/customer/auth/reset-password", {
    token,
    password,
  });
  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response) };
  }

  return { ok: true };
}
