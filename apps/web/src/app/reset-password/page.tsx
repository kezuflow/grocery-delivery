import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string; token?: string }> }>) {
  const query = await searchParams;

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <a className="wordmark" href="/" aria-label="Carbon Food Delivery home">
          <span className="wordmark-mark">C</span>
          <span>Carbon</span>
        </a>
        <p className="eyebrow">Account recovery</p>
        <h1>Reset your password</h1>
        <p>Choose a new password for your Carbon Food Delivery account.</p>
        <ResetPasswordForm token={query.error ? null : (query.token ?? null)} />
      </section>
    </main>
  );
}
