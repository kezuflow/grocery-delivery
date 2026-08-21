import type { PaymentMethodListResponse } from "@carbon/contracts";

import { EmptyState, StatusPill } from "../../components/ui";

export function PaymentMethodsPanel({
  methods,
  unavailableMessage,
}: Readonly<{
  methods: PaymentMethodListResponse["data"]["methods"];
  unavailableMessage?: string | null;
}>) {
  if (methods.length === 0) {
    return (
      <EmptyState
        description={
          unavailableMessage ??
          "Payment setup will open through the provider's secure hosted flow. Raw card and wallet credentials are never collected by this app."
        }
        title="No saved payment method"
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {methods.map((method) => (
        <li
          className="flex items-center justify-between gap-4 border border-line p-4"
          key={method.id}
        >
          <div>
            <strong className="capitalize">{method.type.replace("_", " ")}</strong>
            <p className="mt-1 text-xs text-muted">
              Added {new Date(method.createdAt).toLocaleDateString("en-PH")}
            </p>
          </div>
          <StatusPill status={method.status} />
        </li>
      ))}
    </ul>
  );
}
