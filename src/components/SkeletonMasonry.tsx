import React from 'react';

interface SkeletonMasonryProps {
  count?: number;
}

// Preset realistic Pinterest aspect ratios to produce a natural waterfall
const SKELETON_ASPECTS = [
  'aspect-[3/4.5]', // Tall
  'aspect-[3/4]',   // Portrait
  'aspect-[1/1]',   // Square
  'aspect-[3/4.2]', // Tall portrait
  'aspect-[4/3]',   // Wide
  'aspect-[3/4]',   // Portrait
  'aspect-[3/4.6]', // Tall
  'aspect-[1/1]',   // Square
  'aspect-[3/4.2]', // Tall portrait
  'aspect-[3/4]',   // Portrait
];

export const SkeletonMasonry: React.FC<SkeletonMasonryProps> = ({ count = 18 }) => {
  const items = Array.from({ length: count }, (_, i) => ({
    id: `skeleton-${i}`,
    aspect: SKELETON_ASPECTS[i % SKELETON_ASPECTS.length],
  }));

  return (
    <div id="skeleton-masonry-container" className="w-full animate-in fade-in duration-300">
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-4 xl:columns-5 2xl:columns-6 3xl:columns-7 gap-4 lg:gap-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="break-inside-avoid mb-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col p-3 space-y-3"
          >
            {/* Shimmer Image Box */}
            <div className={`relative w-full ${item.aspect} rounded-2xl bg-slate-200/80 animate-pulse overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
              
              {/* Fake top badge */}
              <div className="absolute top-2.5 left-2.5 w-16 h-5 rounded-full bg-slate-300/80" />
              {/* Fake top price */}
              <div className="absolute top-2.5 right-2.5 w-12 h-5 rounded-xl bg-slate-300/80" />
            </div>

            {/* Content lines */}
            <div className="space-y-2 px-1">
              <div className="h-4 bg-slate-200 rounded-md w-4/5 animate-pulse" />
              <div className="h-3 bg-slate-100 rounded-md w-full animate-pulse" />
              <div className="h-3 bg-slate-100 rounded-md w-2/3 animate-pulse" />
            </div>

            {/* Bottom bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-slate-200 animate-pulse" />
                <div className="w-14 h-3 bg-slate-200 rounded-md animate-pulse" />
              </div>
              <div className="w-16 h-6 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
