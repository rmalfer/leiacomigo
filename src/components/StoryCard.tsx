import { cn } from "@/lib/utils";
import { BookOpen, Clock, Star } from "lucide-react";

interface StoryCardProps {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  duration: string;
  imageEmoji: string;
  completed?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StoryCard = ({
  title,
  description,
  difficulty,
  duration,
  imageEmoji,
  completed = false,
  onClick,
  className,
}: StoryCardProps) => {
  const difficultyConfig = {
    easy: {
      label: "Fácil",
      color: "bg-success/10 text-success",
      stars: 1,
    },
    medium: {
      label: "Médio",
      color: "bg-warning/10 text-warning-foreground",
      stars: 2,
    },
    hard: {
      label: "Difícil",
      color: "bg-accent/10 text-accent",
      stars: 3,
    },
  };

  const config = difficultyConfig[difficulty];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-3xl bg-card shadow-card",
        "border-2 border-transparent",
        "transition-all duration-300 ease-out",
        "hover:shadow-float hover:scale-[1.02] hover:border-primary/20",
        "active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        completed && "border-success/30 bg-success/5",
        className
      )}
    >
      <div className="flex gap-4">
        {/* Story illustration */}
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl gradient-warm flex items-center justify-center text-4xl shadow-soft">
          {imageEmoji}
        </div>

        {/* Story info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-bold text-lg text-foreground truncate">
              {title}
            </h3>
            {completed && (
              <span className="flex-shrink-0 text-success text-xl">✓</span>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-3">
            {/* Difficulty */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
              config.color
            )}>
              {Array.from({ length: config.stars }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-current" />
              ))}
              <span className="ml-1">{config.label}</span>
            </span>

            {/* Duration */}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {duration}
            </span>

            {/* Word count indicator */}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="w-3 h-3" />
              Ler
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
