import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto do quadro Kanban: colunas com cards fantasmas.
export default function CardsLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando cards">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:-mx-6 md:px-6">
        {[3, 2, 2, 1].map((count, column) => (
          <div key={column} className="w-72 shrink-0 space-y-2 rounded-2xl border bg-muted/30 p-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
