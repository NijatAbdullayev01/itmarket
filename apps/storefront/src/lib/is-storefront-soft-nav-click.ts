export function isStorefrontSoftNavUrl(
  next: URL,
  current: Pick<URL, "origin" | "pathname" | "search">,
): boolean {
  if (next.origin !== current.origin) {
    return false;
  }

  return (
    next.pathname !== current.pathname || next.search !== current.search
  );
}

/** Same-origin `<a>` click that should start a Next.js client navigation. */
export function isStorefrontSoftNavClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }
  if (anchor.target !== "" && anchor.target !== "_self") {
    return false;
  }
  if (anchor.hasAttribute("download")) {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (href === null || href === "" || href.startsWith("#")) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return false;
  }

  return isStorefrontSoftNavUrl(url, window.location);
}
