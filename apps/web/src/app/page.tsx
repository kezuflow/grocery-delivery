import { StorefrontContent } from "../features/storefront";
import { loadStorefront } from "../lib/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const storefront = await loadStorefront();

  return <StorefrontContent session={null} storefront={storefront} />;
}
