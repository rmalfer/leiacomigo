import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  
  // CRITICAL: Memoize words array to prevent recreation on every render
  // Without this, words array changes every render, causing infinite loops
  const words = useMemo(() => story.text.split(/\s+/), [story.text]);
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>(
    words.map((_, i) => (i === 0 ? "current" : "pending"))
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout>();

  const progress = (currentWordIndex / words.length) * 100;
  const isComplete = currentWordIndex >= words.length;
  
  // Log only on mount
  useEffect(() => {
    console.log("\n📖 Reading component MOUNTED");
    console.log("Story:", story.title);
    console.log("Total words:", words.length);
  }, []); // Empty deps = runs once on mount
  
  // Monitor currentWordIndex changes
  useEffect(() => {
    console.log("📍 currentWordIndex changed to:", currentWordIndex);
  }, [currentWordIndex]);
  
  // Monitor wordStatuses changes
  useEffect(() => {
    console.log("🎨 wordStatuses changed:", wordStatuses.slice(0, Math.min(5, wordStatuses.length)));
    console.log("   Breakdown:", wordStatuses.slice(0, 5).map((status, i) => `${words[i]}:${status}`).join(", "));
  }, [wordStatuses]); // words is now memoized, no need in deps

  // Speech Recognition Hook
  const { 
    isListening, 
    isSupported: isRecognitionSupported,
    hasPermission,
    interimTranscript,
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
    // Safety check: don't process if not listening anymore
    if (!isListening) {
      console.log("⚠️ Ignoring transcript - not listening");
      return;
    }
    
    const spokenWords = extractWords(transcript);
    
    console.log("\n=== Processing transcript:", transcript);
    console.log("=== Extracted words:", spokenWords);
    console.log("=== Starting at index:", currentWordIndex);
    console.log("=== Expected word:", currentWordIndex < words.length ? words[currentWordIndex] : "NONE (finished)");
    
    // IMPORTANT: Reset "incorrect" back to "current" for retry
    // This allows the user to try again after making a mistake
    setWordStatuses(prev => {
      const newStatuses = [...prev];
      if (newStatuses[currentWordIndex] === "incorrect") {
        console.log(`🔄 Resetting word ${currentWordIndex} from "incorrect" to "current" for retry`);
        newStatuses[currentWordIndex] = "current";
      }
      return newStatuses;
    });
    
    // Use local variable to track index during batch processing
    // This fixes the bug where currentWordIndex doesn't update during forEach
    let localWordIndex = currentWordIndex;
    
    spokenWords.forEach((spokenWord, idx) => {
      if (localWordIndex >= words.length) return;
      
      const expectedWord = words[localWordIndex];
      console.log(`\n[Word ${idx}] Checking: spoken="${spokenWord}" vs expected="${expectedWord}" (index ${localWordIndex})`);
      
      const isMatch = wordsMatch(spokenWord, expectedWord);
      
      console.log(`  Result: ${isMatch ? "✓ MATCH" : "✗ NO MATCH"}`);
      
      // CRITICAL: Capture the index value BEFORE any state updates
      const indexToMark = localWordIndex;
      
      if (isMatch) {
        console.log(`\n🎉 CORRECT! Word "${words[indexToMark]}" at index ${indexToMark}`);
        
        // Mark current word as correct and advance
        setWordStatuses(prev => {
          const newStatuses = [...prev];
          newStatuses[indexToMark] = "correct";
          if (indexToMark + 1 < words.length) {
            newStatuses[indexToMark + 1] = "current";
          }
          return newStatuses;
        });
        
        localWordIndex++; // Advance to next word
        
        // Show mini celebration every 5 words
        if (localWordIndex % 5 === 0) {
          setShowCelebration(true);
          clearTimeout(celebrationTimeoutRef.current);
          celebrationTimeoutRef.current = setTimeout(() => {
            setShowCelebration(false);
          }, 1000);
        }
      } else {
        // Word is incorrect - mark it but DON'T advance index
        console.log(`\n❌ INCORRECT! Heard "${spokenWord}" but expected "${expectedWord}" at index ${indexToMark}`);
        console.log(`   User needs to say "${expectedWord}" correctly to proceed`);
        
        setWordStatuses(prev => {
          const newStatuses = [...prev];
          newStatuses[indexToMark] = "incorrect";
          return newStatuses;
        });
        
        // DON'T increment localWordIndex - user must say the correct word
        // The index stays at the current word until they get it right
        
        // Break out of forEach - don't process remaining words if we hit an error
        // This prevents multiple incorrect markings in one go
        return;
      }
    });
    
    // Update state with final index after processing all words
    if (localWordIndex !== currentWordIndex) {
      console.log(`📊 Updating currentWordIndex: ${currentWordIndex} → ${localWordIndex}`);
      setCurrentWordIndex(localWordIndex);
    } else {
      console.log(`📊 Index unchanged: ${currentWordIndex}`);
    }
  }, [currentWordIndex, words, isListening]);

  // Handle mic toggle
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      console.log("🛑 Stopping listening...");
      stopListening();
    } else {
      console.log("\n🔄🔄🔄 RESETTING READING SESSION 🔄🔄🔄");
      console.log("  Setting currentWordIndex: 0");
      console.log("  Resetting all wordStatuses to pending (except first)");
      // Reset everything for a fresh start
      setCurrentWordIndex(0);
      setWordStatuses(words.map((_, i) => (i === 0 ? "current" : "pending")));
      resetTranscript();
      console.log("  Starting listening...");
      startListening();
      console.log("🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄\n");
    }
  }, [isListening, startListening, stopListening, resetTranscript, words]);

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
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">{story.title}</h1>
            <p className="text-xs text-muted-foreground">
              {isListening 
                ? "🎤 Estou ouvindo você ler..." 
                : "Toque no microfone e leia em voz alta!"}
            </p>
            {/* Show what Safari is hearing in real-time */}
            {interimTranscript && (
              <div className="mt-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">Ouvindo agora:</p>
                <p className="text-sm font-medium text-primary">{interimTranscript}</p>
              </div>
            )}
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
