'use client';

interface ProgressDisplayProps {
  current: number;
  total: number;
}

export default function ProgressDisplay({ current, total }: ProgressDisplayProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-slate-400 font-medium">
        <span>Processing Rows...</span>
        <span>{current} / {total} ({percentage}%)</span>
      </div>
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
