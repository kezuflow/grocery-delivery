import { AccessState } from "../../components/feedback";

export default function ForbiddenPage() {
  return (
    <AccessState
      description="Your account is signed in, but it does not have access to this area."
      title="Access not available"
    />
  );
}
