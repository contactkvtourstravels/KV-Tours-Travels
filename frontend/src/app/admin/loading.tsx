export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-850 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-800 rounded-lg" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="w-8 h-8 rounded-lg bg-slate-800" />
            </div>
            <div className="h-8 w-20 bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Grid Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
