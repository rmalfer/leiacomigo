import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StoryCard } from "@/components/StoryCard";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const SAMPLE_STORIES = [
  {
    id: "1",
    title: "O Gato de Botas",
    description: "Um gatinho esperto ajuda seu dono a se tornar um príncipe.",
    difficulty: "easy" as const,
    duration: "3 min",
    imageEmoji: "🐱",
    completed: true,
  },
  {
    id: "2",
    title: "A Tartaruga e a Lebre",
    description: "Quem será mais rápido? Uma história sobre persistência.",
    difficulty: "easy" as const,
    duration: "2 min",
    imageEmoji: "🐢",
    completed: false,
  },
  {
    id: "3",
    title: "João e o Pé de Feijão",
    description: "Uma aventura mágica nas nuvens com gigantes e tesouros.",
    difficulty: "medium" as const,
    duration: "5 min",
    imageEmoji: "🌱",
    completed: false,
  },
  {
    id: "4",
    title: "A Pequena Sereia",
    description: "Uma sereia sonha em conhecer o mundo dos humanos.",
    difficulty: "medium" as const,
    duration: "6 min",
    imageEmoji: "🧜‍♀️",
    completed: false,
  },
  {
    id: "5",
    title: "O Patinho Feio",
    description: "Um patinho diferente descobre sua verdadeira beleza.",
    difficulty: "hard" as const,
    duration: "7 min",
    imageEmoji: "🦢",
    completed: false,
  },
];

const Stories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Safe area spacer */}
      <div className="h-safe-top" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="font-display font-bold text-xl">Histórias</h1>

          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar histórias..."
              className="pl-10 bg-muted border-none rounded-xl h-11"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Section: Continue Reading */}
        <section>
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <span>📖</span> Continue Lendo
          </h2>
          <StoryCard
            title="A Tartaruga e a Lebre"
            description="Quem será mais rápido? Uma história sobre persistência."
            difficulty="easy"
            duration="2 min"
            imageEmoji="🐢"
            onClick={() => navigate("/read/2")}
          />
        </section>

        {/* Section: All Stories */}
        <section>
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <span>✨</span> Todas as Histórias
          </h2>
          <div className="space-y-3">
            {SAMPLE_STORIES.map((story) => (
              <StoryCard
                key={story.id}
                title={story.title}
                description={story.description}
                difficulty={story.difficulty}
                duration={story.duration}
                imageEmoji={story.imageEmoji}
                completed={story.completed}
                onClick={() => navigate(`/read/${story.id}`)}
              />
            ))}
          </div>
        </section>

        {/* Create new story CTA */}
        <section className="pt-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full border-dashed border-2"
            onClick={() => navigate("/stories")}
          >
            <Plus className="w-5 h-5" />
            Criar Nova História com IA
          </Button>
        </section>
      </main>

      {/* Safe area spacer */}
      <div className="h-safe-bottom pb-6" />
    </div>
  );
};

export default Stories;
