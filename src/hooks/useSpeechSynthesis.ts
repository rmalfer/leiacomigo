import { useState, useCallback, useRef } from "react";

interface UseSpeechSynthesisOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useSpeechSynthesis = ({
  language = "pt-BR",
  rate = 0.9,
  pitch = 1.1,
  onStart,
  onEnd,
  onError,
}: UseSpeechSynthesisOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => "speechSynthesis" in window);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a Portuguese voice
    const ptVoice = voices.find(
      (voice) => voice.lang.startsWith("pt") && voice.localService
    );
    
    const ptAnyVoice = voices.find((voice) => voice.lang.startsWith("pt"));
    
    return ptVoice || ptAnyVoice || voices[0];
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        onError?.("Speech synthesis not supported");
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Set voice (might need to wait for voices to load)
      const setVoiceAndSpeak = () => {
        const voice = getVoice();
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          onStart?.();
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          onEnd?.();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
          onError?.(event.error);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      // Voices might not be loaded yet
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
      } else {
        setVoiceAndSpeak();
      }
    },
    [isSupported, language, rate, pitch, getVoice, onStart, onEnd, onError]
  );

  const speakWord = useCallback(
    (word: string) => {
      speak(word);
    },
    [speak]
  );

  const speakSentence = useCallback(
    (sentence: string) => {
      speak(sentence);
    },
    [speak]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    speakWord,
    speakSentence,
    stop,
    pause,
    resume,
  };
};
