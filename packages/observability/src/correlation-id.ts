const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function isValidCorrelationId(value: string): boolean {
  return CORRELATION_ID_PATTERN.test(value);
}

export function resolveCorrelationId(
  incomingValue: string | undefined,
  generate: () => string,
): string {
  return incomingValue && isValidCorrelationId(incomingValue) ? incomingValue : generate();
}
