export function getAuthErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const value = payload as {
    message?: unknown;
    error?: unknown;
  };
  if (typeof value.message === "string" && value.message.trim()) return value.message;
  if (typeof value.error === "string" && value.error.trim()) return value.error;
  if (value.error && typeof value.error === "object") {
    const nestedMessage = (value.error as { message?: unknown }).message;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) return nestedMessage;
  }
  return fallback;
}
