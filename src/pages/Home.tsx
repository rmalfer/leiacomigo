import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { BookOpen, Sparkles, Mic } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Safe area spacer for iPhone notch */}
      <div className="h-safe-top" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-8 text-4xl animate-float opacity-60">📚</div>
      <div className="absolute top-32 right-10 text-3xl animate-float opacity-60" style={{ animationDelay: "1s" }}>⭐</div>
      <div className="absolute bottom-40 left-12 text-3xl animate-float opacity-60" style={{ animationDelay: "2s" }}>✨</div>
      <div className="absolute bottom-60 right-8 text-4xl animate-float opacity-60" style={{ animationDelay: "0.5s" }}>🌈</div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo/Mascot section */}
        <div className="mb-8 animate-scale-in">
          <Mascot size="xl" mood="excited" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-display font-bold text-center mb-3 animate-slide-up">
          <span className="text-gradient-primary">Leia</span>{" "}
          <span className="text-foreground">Comigo!</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-muted-foreground text-center max-w-xs mb-12 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          Aprenda a ler de forma divertida com histórias mágicas! 🪄
        </p>

        {/* Action buttons */}
        <div className="w-full max-w-sm space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Button
            variant="default"
            size="xl"
            className="w-full"
            onClick={() => navigate("/stories")}
          >
            <BookOpen className="w-6 h-6" />
            Começar a Ler
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate("/stories")}
          >
            <Sparkles className="w-5 h-5" />
            Criar História Nova
          </Button>
        </div>

        {/* Features preview */}
        <div className="mt-16 grid grid-cols-3 gap-6 w-full max-w-sm animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <FeatureIcon icon="🎤" label="Fale" />
          <FeatureIcon icon="📖" label="Leia" />
          <FeatureIcon icon="🏆" label="Ganhe" />
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="h-24 relative">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/50 to-transparent" />
      </div>
      
      {/* Safe area spacer for iPhone home indicator */}
      <div className="h-safe-bottom" />
    </div>
  );
};

const FeatureIcon = ({ icon, label }: { icon: string; label: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="w-14 h-14 rounded-2xl bg-card shadow-soft flex items-center justify-center text-2xl">
      {icon}
    </div>
    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
  </div>
);

export default Home;
