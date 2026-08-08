import { BROWSER_API_BASE } from "./resolve-api-base-url";

let rotateInFlight: Promise<boolean> | null = null;

/** Refreshes the staff access cookie via the refresh token (same as operations `api()`). */
export async function rotateStaffSession(): Promise<boolean> {
  if (rotateInFlight !== null) {
    return rotateInFlight;
  }

  rotateInFlight = (async () => {
    try {
      const response = await fetch(`${BROWSER_API_BASE}/staff/auth/rotate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      return response.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    rotateInFlight = null;
  });

  return rotateInFlight;
}
