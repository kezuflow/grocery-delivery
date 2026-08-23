export function normalizeSubscriptionReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/shop";
  return value;
}

export function subscriptionReturnHref(returnTo: string): string {
  return `/account/subscribe?returnTo=${encodeURIComponent(normalizeSubscriptionReturnTo(returnTo))}`;
}
