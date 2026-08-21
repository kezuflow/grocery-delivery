import { Skeleton } from "../components/ui";

export default function StorefrontLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="border-b border-line bg-white px-5 py-4 sm:px-8">
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-[36rem] w-full rounded-none" />
      <div className="mx-auto grid max-w-[1180px] gap-5 px-5 py-16 sm:px-8 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton className="h-52" key={index} />
        ))}
      </div>
    </main>
  );
}
