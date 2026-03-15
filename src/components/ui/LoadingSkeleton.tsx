"use client";

export default function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-44 flex-shrink-0" />
        ))}
      </div>
      <div className="skeleton h-80 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    </div>
  );
}
