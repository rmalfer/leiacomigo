import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ReadingWord, WordStatus } from "@/components/ReadingWord";
import { ProgressBar } from "@/components/ProgressBar";
import { VoiceButton } from "@/components/VoiceButton";
import { Mascot } from "@/components/Mascot";
import { ArrowLeft, X, RotateCcw, ChevronRight, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { wordsMatch, extractWords } from "@/lib/textMatching";
import { toast } from "sonner";

const STORIES_DATA: Record<string, { title: string; emoji: string; text: string }> = {
  "1": {
    title: "O Gato de Botas",
    emoji: "🐱",
    text: "Era uma vez um gato muito esperto. Ele usava botas grandes e um chapéu bonito. O gato ajudou seu dono a ficar rico.",
  },
  "2": {
    title: "A Tartaruga e a Lebre",
    emoji: "🐢", 
    text: "Era uma vez uma tartaruga muito sábia. Um dia, uma lebre veloz passou por ela. A tartaruga venceu a corrida.",
  },
  "3": {
    title: "João e o Pé de Feijão",
    emoji: "🌱",
    text: "João plantou um feijão mágico. O feijão cresceu até as nuvens. Lá em cima havia um gigante e muito ouro.",
  },
  "4": {
    title: "A Pequena Sereia",
    emoji: "🧜‍♀️",
    text: "Uma sereia vivia no fundo do mar. Ela sonhava em conhecer a terra. Um dia ela nadou para a superfície.",
  },
  "5": {
    title: "O Patinho Feio",
    emoji: "🦢",
    text: "Um patinho era diferente dos irmãos. Todos riam dele por ser feio. Mas ele cresceu e virou um lindo cisne.",
  },
};

const Reading = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const story = STORIES_DATA[id || "2"] || STORIES_DATA["2"];
  const words = story.text.split(/\s+/);
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>(
    words.map((_, i) => (i === 0 ? "current" : "pending"))
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout>();

  const progress = (currentWordIndex / words.length) * 100;
  const isComplete = currentWordIndex >= words.length;

  // Speech Recognition Hook
  const { 
    isListening, 
    isSupported: isRecognitionSupported,
    hasPermission,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: "pt-BR",
    continuous: true,
    onResult: (transcript) => {
      console.log("Heard:", transcript);
      processSpokenWords(transcript);
    },
    onError: (error) => {
      if (error !== "no-speech") {
        console.log("Speech error:", error);
      }
    },
    onPermissionDenied: () => {
      setPermissionDenied(true);
      toast.error("Por favor, permita o acesso ao microfone para ler em voz alta!");
    },
  });

  // Speech Synthesis Hook
  const {
    isSpeaking,
    isSupported: isSynthesisSupported,
    speakWord,
    speakSentence,
    stop: stopSpeaking,
  } = useSpeechSynthesis({
    language: "pt-BR",
    rate: 0.85,
    pitch: 1.1,
  });

  // Process spoken words and match against expected
  const processSpokenWords = useCallback((transcript: string) => {
    const spokenWords = extractWords(transcript);
    console.log("Processing spoken words:", spokenWords);
    
    spokenWords.forEach((spokenWord) => {
      if (currentWordIndex >= words.length) return;
      
      const expectedWord = words[currentWordIndex];
      const isMatch = wordsMatch(spokenWord, expectedWord);
      
      console.log(`Checking: "${spokenWord}" vs expected "${expectedWord}" = ${isMatch ? "✓ MATCH" : "✗ no match"}`);
      
      if (isMatch) {
        console.log(`✓ Advancing from word ${currentWordIndex} (${expectedWord}) to ${currentWordIndex + 1}`);
        
        // Mark current word as correct
        setWordStatuses(prev => {
          const newStatuses = [...prev];
          newStatuses[currentWordIndex] = "correct";
          if (currentWordIndex + 1 < words.length) {
            newStatuses[currentWordIndex + 1] = "current";
          }
          return newStatuses;
        });
        
        setCurrentWordIndex(prev => prev + 1);
        
        // Show mini celebration every 5 words
        if ((currentWordIndex + 1) % 5 === 0) {
          setShowCelebration(true);
          clearTimeout(celebrationTimeoutRef.current);
          celebrationTimeoutRef.current = setTimeout(() => {
            setShowCelebration(false);
          }, 1000);
        }
      }
    });
  }, [currentWordIndex, words]);

  // Handle mic toggle
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  // Handle speaker - read current sentence aloud
  const handleSpeakerToggle = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakSentence(story.text);
    }
  }, [isSpeaking, stopSpeaking, speakSentence, story.text]);

  // Handle word click - read that word
  const handleWordClick = useCallback((index: number) => {
    speakWord(words[index]);
  }, [words, speakWord]);

  // Restart reading
  const handleRestart = useCallback(() => {
    stopListening();
    stopSpeaking();
    setCurrentWordIndex(0);
    setWordStatuses(words.map((_, i) => (i === 0 ? "current" : "pending")));
    resetTranscript();
  }, [words, stopListening, stopSpeaking, resetTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
      clearTimeout(celebrationTimeoutRef.current);
    };
  }, [stopListening, stopSpeaking]);

  // Auto-stop when complete
  useEffect(() => {
    if (isComplete && isListening) {
      stopListening();
    }
  }, [isComplete, isListening, stopListening]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Safe area spacer */}
      <div className="h-safe-top" />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/stories")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 mx-4">
          <ProgressBar progress={progress} showLabel={false} />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/stories")}
        >
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Story title bar */}
      <div className="px-4 py-3 bg-muted/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{story.emoji}</span>
          <div>
            <h1 className="font-display font-bold text-lg">{story.title}</h1>
            <p className="text-xs text-muted-foreground">
              {isListening 
                ? "🎤 Estou ouvindo você ler..." 
                : "Toque no microfone e leia em voz alta!"}
            </p>
          </div>
        </div>
      </div>

      {/* Browser support warning */}
      {(!isRecognitionSupported || !isSynthesisSupported) && (
        <div className="mx-4 mt-4 p-3 bg-warning/10 border border-warning/30 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-warning" />
          <span className="text-warning-foreground">
            {!isRecognitionSupported 
              ? "Seu navegador não suporta reconhecimento de voz. Use Chrome ou Safari."
              : "Seu navegador não suporta leitura em voz alta."}
          </span>
        </div>
      )}

      {/* Permission denied warning */}
      {permissionDenied && (
        <div className="mx-4 mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎤</span>
            <div>
              <p className="font-semibold text-foreground mb-1">Permita o microfone</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para ler em voz alta, você precisa permitir o acesso ao microfone.
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Abra <strong>Ajustes</strong> no seu iPhone</li>
                <li>Vá em <strong>Safari → Configurações para Sites</strong></li>
                <li>Ative <strong>Microfone</strong></li>
                <li>Volte aqui e tente novamente!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Reading area */}
      <main className="flex-1 overflow-auto px-6 py-8 relative">
        {/* Celebration overlay */}
        {showCelebration && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-scale-in">
            <div className="bg-success text-success-foreground px-4 py-2 rounded-full font-bold shadow-float">
              ⭐ Muito bem!
            </div>
          </div>
        )}

        <div className="reading-text leading-loose">
          {words.map((word, index) => (
            <ReadingWord
              key={`${word}-${index}`}
              word={word}
              status={wordStatuses[index]}
              onClick={() => handleWordClick(index)}
            />
          ))}
        </div>

        {/* Completion celebration */}
        {isComplete && (
          <div className="mt-12 text-center animate-scale-in">
            <Mascot size="lg" mood="celebrating" className="mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl text-success mb-2">
              Parabéns! 🎉
            </h2>
            <p className="text-muted-foreground mb-6">
              Você leu a história toda!
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4" />
                Ler Novamente
              </Button>
              <Button onClick={() => navigate("/stories")}>
                Próxima História
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom controls */}
      {!isComplete && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t border-border px-6 py-4">
          <div className="flex items-center justify-center gap-6">
            {/* Speaker button */}
            <VoiceButton
              type="speaker"
              size="lg"
              isActive={isSpeaking}
              onClick={handleSpeakerToggle}
            />

            {/* Main mic button */}
            <VoiceButton
              type="mic"
              size="xl"
              isActive={isListening}
              onClick={handleMicToggle}
            />

            {/* Restart button */}
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleRestart}
              className="text-muted-foreground"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
          </div>

          {/* Hint text */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            {isListening
              ? "🎤 Continue lendo! Toque nas palavras para ouvir."
              : isSpeaking 
                ? "🔊 Ouça a história..."
                : "Toque 🎤 para ler ou 🔊 para ouvir"}
          </p>
        </div>
      )}

      {/* Safe area spacer */}
      <div className="h-safe-bottom" />
    </div>
  );
};

export default Reading;
