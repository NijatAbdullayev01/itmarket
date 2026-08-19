/**
 * Instant top reset for client navigations.
 * CSS `scroll-behavior: smooth` and Next `data-scroll-behavior="smooth"`
 * would otherwise animate the swap and look like a broken refresh.
 */
export function resetStorefrontScroll(): void {
  const html = document.documentElement;
  const previousInline = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  html.scrollTop = 0;
  document.body.scrollTop = 0;
  html.style.scrollBehavior = previousInline;
}
