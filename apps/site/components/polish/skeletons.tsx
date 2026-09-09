function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <span className="polish-skeleton-line" style={{ width }} />;
}

export function BoardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="polish-board-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="polish-card-skeleton" key={`board-skeleton-${index}`}>
          <SkeletonLine width="34%" />
          <SkeletonLine width="82%" />
          <SkeletonLine width="58%" />
        </div>
      ))}
    </div>
  );
}

export function RouteSkeleton() {
  return (
    <main className="route-skeleton" aria-label="Loading page" aria-busy="true">
      <span className="sr-only">Loading page</span>
      <div className="route-skeleton__header">
        <SkeletonLine width="24%" />
        <SkeletonLine width="62%" />
      </div>
      <div className="route-skeleton__content">
        <div className="route-skeleton__intro">
          <SkeletonLine width="18%" />
          <SkeletonLine width="76%" />
          <SkeletonLine width="48%" />
        </div>
        <BoardSkeleton rows={4} />
      </div>
    </main>
  );
}
