/**
 * Assets are served dynamically via the Next.js /images/[...slug] route handler
 * from the filesystem on both storefront and backoffice.
 *
 * PM2 reload/restart is NO LONGER needed on asset upload, preventing downtime
 * and avoiding 502 Bad Gateway / EADDRINUSE errors.
 */
export async function reloadStorefrontForNewPublicAssets(): Promise<void> {
  // No-op: dynamic route handler serves newly written files immediately.
}
