import { AccessState } from "../../components/feedback";

export default function SessionUnavailablePage() {
  return (
    <AccessState
      actionLabel="Try again"
      description="We could not verify your session. Please try again in a moment."
      title="Session temporarily unavailable"
    />
  );
}
