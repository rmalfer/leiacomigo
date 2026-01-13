import { cn } from "@/lib/utils";

export type WordStatus = "pending" | "current" | "correct" | "incorrect";

interface ReadingWordProps {
  word: string;
  status: WordStatus;
  onClick?: () => void;
}

export const ReadingWord = ({ word, status, onClick }: ReadingWordProps) => {
  const statusClasses: Record<WordStatus, string> = {
    pending: "text-muted-foreground/50",
    current: "text-primary font-extrabold scale-110 bg-primary/10 px-2 py-1 rounded-xl",
    correct: "text-success font-bold",
    incorrect: "text-destructive font-bold underline decoration-wavy decoration-2",
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-block mx-1 my-1 transition-all duration-300 ease-out cursor-pointer",
        "hover:scale-105",
        statusClasses[status]
      )}
    >
      {word}
    </span>
  );
};
