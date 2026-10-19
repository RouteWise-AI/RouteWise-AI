import React from 'react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-800/70 rounded-lg ${className}`} />
);

export const ComparisonSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Recommendation Banner Skeleton */}
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-5 w-40" />
        <SkeletonBox className="h-4 w-24" />
      </div>
      <SkeletonBox className="h-8 w-64" />
      <SkeletonBox className="h-4 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-7 w-20" />
          </div>
        ))}
      </div>
      <SkeletonBox className="h-16 w-full rounded-xl" />
    </div>

    {/* Alternatives List Skeleton */}
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <SkeletonBox className="h-5 w-48" />
        <SkeletonBox className="h-4 w-32" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <SkeletonBox className="h-4 w-56" />
            <SkeletonBox className="h-3 w-40" />
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <SkeletonBox className="h-5 w-16" />
              <SkeletonBox className="h-3 w-12" />
            </div>
            <SkeletonBox className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ChatMessageSkeleton: React.FC = () => (
  <div className="flex gap-3 items-start">
    <SkeletonBox className="w-8 h-8 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBox className="h-4 w-3/4" />
      <SkeletonBox className="h-4 w-1/2" />
    </div>
  </div>
);

