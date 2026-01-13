import { cn } from "@/lib/utils";

interface MascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: "happy" | "excited" | "thinking" | "celebrating";
  className?: string;
  animate?: boolean;
}

export const Mascot = ({ 
  size = "md", 
  mood = "happy", 
  className,
  animate = true 
}: MascotProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
  };

  const getMoodEmoji = () => {
    switch (mood) {
      case "excited": return "🦉";
      case "thinking": return "🦉";
      case "celebrating": return "🦉";
      default: return "🦉";
    }
  };

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        animate && "animate-bounce-gentle",
        className
      )}
    >
      {/* Mascot container with glow effect */}
      <div className="relative">
        {/* Glow background */}
        <div className="absolute inset-0 rounded-full gradient-primary opacity-20 blur-xl scale-150" />
        
        {/* Main mascot circle */}
        <div className={cn(
          "relative rounded-full gradient-primary flex items-center justify-center shadow-float",
          sizeClasses[size]
        )}>
          {/* Eyes and face using emoji for simplicity */}
          <span className={cn(
            "select-none",
            size === "sm" && "text-3xl",
            size === "md" && "text-5xl",
            size === "lg" && "text-6xl",
            size === "xl" && "text-8xl",
          )}>
            {getMoodEmoji()}
          </span>
        </div>

        {/* Decorative stars for celebrating mood */}
        {mood === "celebrating" && (
          <>
            <span className="absolute -top-2 -left-2 text-2xl animate-star-burst">⭐</span>
            <span className="absolute -top-1 -right-3 text-xl animate-star-burst" style={{ animationDelay: "0.1s" }}>✨</span>
            <span className="absolute -bottom-1 -left-3 text-lg animate-star-burst" style={{ animationDelay: "0.2s" }}>🌟</span>
          </>
        )}
      </div>
    </div>
  );
};
