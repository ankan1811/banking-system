export default function Loading() {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        {/* Header skeleton */}
        <div className="space-y-2 mb-6">
          <div className="h-7 w-48 bg-slate-700/50 rounded animate-pulse" />
          <div className="h-4 w-72 bg-slate-700/30 rounded animate-pulse" />
        </div>
        {/* Card skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 mb-4 animate-pulse">
            <div className="h-4 w-full bg-slate-700/30 rounded mb-3" />
            <div className="h-4 w-2/3 bg-slate-700/20 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
