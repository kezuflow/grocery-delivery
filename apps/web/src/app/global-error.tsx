"use client";

import { RouteError } from "../components/feedback";

export default function GlobalError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <html lang="en">
      <body>
        <RouteError reset={reset} />
      </body>
    </html>
  );
}
