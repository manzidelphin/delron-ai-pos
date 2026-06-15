import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("bg-slate-700 rounded animate-pulse", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Bone className="w-48 h-7" />
          <Bone className="w-72 h-4" />
        </div>
        <Bone className="w-28 h-9 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <Bone className="w-10 h-10 rounded-lg" />
              <Bone className="w-16 h-6 rounded-full" />
            </div>
            <Bone className="w-24 h-7" />
            <Bone className="w-32 h-4" />
          </div>
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <Bone className="w-36 h-5" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-700/50">
            <Bone className="w-8 h-4 rounded-full" />
            <Bone className="w-32 h-4" />
            <Bone className="w-20 h-4" />
            <Bone className="w-24 h-4 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <Bone className="w-32 h-5" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="w-3/4 h-4" />
            <Bone className="w-1/2 h-3" />
          </div>
          <Bone className="w-20 h-4" />
        </div>
      ))}
    </div>
  );
}
