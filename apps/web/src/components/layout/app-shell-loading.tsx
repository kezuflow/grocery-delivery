import { Skeleton } from "../ui";

export function AppShellLoading({ summaryCards = 0 }: Readonly<{ summaryCards?: number }>) {
  return (
    <main className="min-h-screen bg-paper px-5 py-8 sm:px-8">
      <div className="mx-auto grid max-w-[1180px] gap-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-64 max-w-full" />
        {summaryCards > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: summaryCards }, (_, index) => (
              <Skeleton className="h-28" key={index} />
            ))}
          </div>
        ) : null}
        <Skeleton className="h-72 w-full" />
      </div>
    </main>
  );
}
