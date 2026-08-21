import { Badge } from "../ui";
import type { SessionSummary } from "../../lib/permissions";
import { getRoleLabel } from "./navigation";
import { SignOutButton } from "./sign-out-button";

export function AccountMenu({ session }: Readonly<{ session: SessionSummary }>) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Badge className="hidden sm:inline-flex" tone="accent">
        {getRoleLabel(session.role)}
      </Badge>
      <SignOutButton />
    </div>
  );
}
