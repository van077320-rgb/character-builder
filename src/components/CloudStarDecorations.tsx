import React from "react";

export const StarIcon: React.FC<{ className?: string; size?: number }> = ({ className = "w-4 h-4 text-amber-300", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path d="M12 2L14.85 8.65L22 9.24L16.5 13.97L18.18 21L12 17.27L5.82 21L7.5 13.97L2 9.24L9.15 8.65L12 2Z" />
  </svg>
);

export const FourPointStar: React.FC<{ className?: string; size?: number }> = ({ className = "w-4 h-4 text-sky-400", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
  </svg>
);

export const CloudIcon: React.FC<{ className?: string; size?: number }> = ({ className = "w-6 h-6 text-sky-200", size }) => (
  <svg
    viewBox="0 0 64 40"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path d="M18 36H48C54.6274 36 60 30.6274 60 24C60 17.5855 54.9576 12.3503 48.6083 12.0194C46.8624 5.23438 40.751 0.222229 33.5 0.222229C25.0487 0.222229 18.0645 6.61198 17.1128 14.8624C16.1042 14.3989 14.9806 14.1389 13.7917 14.1389C8.38401 14.1389 4 18.5229 4 23.9306C4 29.3382 8.38401 33.7222 13.7917 33.7222H18V36Z" />
  </svg>
);

export const CloudBannerDecoration: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="flex items-center justify-center gap-2 py-1 select-none pointer-events-none opacity-80">
    <CloudIcon className={isDark ? "w-5 h-5 text-indigo-400/40" : "w-5 h-5 text-sky-300"} />
    <FourPointStar className={isDark ? "w-3 h-3 text-amber-300/70" : "w-3 h-3 text-sky-400"} />
    <span className={`h-px w-12 sm:w-24 ${isDark ? "bg-indigo-700/50" : "bg-sky-200"}`} />
    <StarIcon className={isDark ? "w-4 h-4 text-amber-300" : "w-4 h-4 text-amber-400"} />
    <span className={`h-px w-12 sm:w-24 ${isDark ? "bg-indigo-700/50" : "bg-sky-200"}`} />
    <FourPointStar className={isDark ? "w-3 h-3 text-sky-300" : "w-3 h-3 text-sky-400"} />
    <CloudIcon className={isDark ? "w-5 h-5 text-indigo-400/40" : "w-5 h-5 text-sky-300"} />
  </div>
);
