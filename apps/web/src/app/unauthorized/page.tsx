import { AccessState } from "../../components/feedback";

export default function UnauthorizedPage() {
  return (
    <AccessState
      actionLabel="Sign in"
      description="Sign in to continue to this protected area."
      title="Sign-in required"
    />
  );
}
