import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar = ({ 
  progress, 
  className,
  showLabel = true 
}: ProgressBarProps) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-muted-foreground">
            Progresso
          </span>
          <span className="text-sm font-bold text-primary">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
      
      <div className="relative h-4 rounded-full bg-muted overflow-hidden shadow-inner">
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 gradient-success rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
        </div>

        {/* Milestone markers */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className={cn(
                "w-0.5 h-full transition-colors duration-300",
                clampedProgress >= milestone ? "bg-success-foreground/30" : "bg-muted-foreground/20"
              )}
              style={{ marginLeft: `${milestone - 1}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
