import { StorefrontContent } from "../features/storefront";
import { loadCurrentSession } from "../lib/session";
import { loadStorefront } from "../lib/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [storefront, auth] = await Promise.all([loadStorefront(), loadCurrentSession()]);

  return (
    <StorefrontContent session={auth.session} sessionError={auth.error} storefront={storefront} />
  );
}
