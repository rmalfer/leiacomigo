import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  type: "mic" | "speaker";
  isActive?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  size?: "default" | "lg" | "xl";
  className?: string;
}

export const VoiceButton = ({
  type,
  isActive = false,
  isLoading = false,
  onClick,
  size = "default",
  className,
}: VoiceButtonProps) => {
  const sizeMap = {
    default: "icon" as const,
    lg: "icon-lg" as const,
    xl: "icon-xl" as const,
  };

  const iconSize = {
    default: "w-5 h-5",
    lg: "w-7 h-7",
    xl: "w-9 h-9",
  };

  const getMicIcon = () => {
    if (isLoading) return <Loader2 className={cn(iconSize[size], "animate-spin")} />;
    if (isActive) return <Mic className={iconSize[size]} />;
    return <MicOff className={iconSize[size]} />;
  };

  const getSpeakerIcon = () => {
    if (isLoading) return <Loader2 className={cn(iconSize[size], "animate-spin")} />;
    if (isActive) return <Volume2 className={iconSize[size]} />;
    return <VolumeX className={iconSize[size]} />;
  };

  return (
    <Button
      variant={type === "mic" ? "mic" : "speaker"}
      size={sizeMap[size]}
      onClick={onClick}
      className={cn(
        "relative",
        isActive && type === "mic" && "animate-pulse-glow",
        className
      )}
    >
      {type === "mic" ? getMicIcon() : getSpeakerIcon()}
      
      {/* Active indicator ring */}
      {isActive && !isLoading && (
        <span className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
      )}
    </Button>
  );
};
