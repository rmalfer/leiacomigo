import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onPermissionDenied?: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useSpeechRecognition = ({
  language = "pt-BR",
  continuous = true,
  onResult,
  onError,
  onPermissionDenied,
}: UseSpeechRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldBeListeningRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout>();
  const consecutiveRestartsRef = useRef(0);
  const lastStartTimeRef = useRef<number>(0);
  const isSafariRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onPermissionDeniedRef = useRef(onPermissionDenied);

  // Keep callbacks updated
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    onPermissionDeniedRef.current = onPermissionDenied;
  }, [onResult, onError, onPermissionDenied]);

  // Initialize recognition ONCE on mount
  useEffect(() => {
    // Check browser support
    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      console.warn("Speech Recognition API not supported in this browser");
      return;
    }

    // Detect Safari - it has issues with continuous mode
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    isSafariRef.current = isSafari;
    console.log("Browser detection - isSafari:", isSafari);

    const recognition = new SpeechRecognitionAPI();
    // Safari works better without continuous mode
    recognition.continuous = isSafari ? false : continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
      lastStartTimeRef.current = Date.now();
      consecutiveRestartsRef.current = 0; // Reset counter on successful start
    };

    recognition.onend = () => {
      const timeSinceStart = Date.now() - lastStartTimeRef.current;
      console.log("Speech recognition ended (ran for", timeSinceStart, "ms)");
      setIsListening(false);
      
      // Only auto-restart in continuous mode (non-Safari)
      // In Safari (non-continuous), restart happens in onresult after each recognition
      const effectiveContinuous = isSafariRef.current ? false : continuous;
      
      if (shouldBeListeningRef.current && effectiveContinuous) {
        // Check if we're in a restart loop (ended too quickly)
        if (timeSinceStart < 1000) {
          consecutiveRestartsRef.current++;
          console.log("Quick restart detected, count:", consecutiveRestartsRef.current);
          
          // If too many quick restarts, stop to prevent infinite loop
          if (consecutiveRestartsRef.current > 5) {
            console.error("Too many quick restarts - stopping auto-restart");
            shouldBeListeningRef.current = false;
            onErrorRef.current?.("O reconhecimento de voz não está funcionando. Tente novamente.");
            return;
          }
        } else {
          consecutiveRestartsRef.current = 0;
        }
        
        console.log("Auto-restarting recognition (continuous mode)...");
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (shouldBeListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error("Failed to auto-restart:", error);
              shouldBeListeningRef.current = false;
            }
          }
        }, 150); // Reduced from 300ms to 150ms for faster restart
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log("Got speech result!");
      let finalTranscript = "";
      let interimResult = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimResult += result[0].transcript;
        }
      }

      // Process final results
      if (finalTranscript) {
        console.log("Final transcript:", finalTranscript);
        setTranscript(prev => prev + " " + finalTranscript);
        onResultRef.current?.(finalTranscript.trim().toLowerCase());
        
        // For Safari (non-continuous mode), restart recognition after getting result
        if (shouldBeListeningRef.current && isSafariRef.current) {
          console.log("Restarting after result (Safari non-continuous mode)");
          setTimeout(() => {
            if (shouldBeListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error("Error restarting after result:", e);
              }
            }
          }, 50); // Reduced from 100ms to 50ms for faster restart
        }
      }
      
      // Also process interim results for better UX
      if (interimResult) {
        console.log("Interim result:", interimResult);
        // Send interim results too for immediate feedback
        onResultRef.current?.(interimResult.trim().toLowerCase());
      }
      setInterimTranscript(interimResult);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      console.log("Full error event:", JSON.stringify({
        error: event.error,
        message: event.message,
        type: event.type
      }));
      
      // Handle critical errors that should stop recognition
      const criticalErrors = ["not-allowed", "aborted", "audio-capture", "network", "service-not-allowed"];
      if (criticalErrors.includes(event.error)) {
        console.error("CRITICAL ERROR detected:", event.error);
        shouldBeListeningRef.current = false;
        clearTimeout(restartTimeoutRef.current);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setHasPermission(false);
          onPermissionDeniedRef.current?.();
        }
        onErrorRef.current?.(event.error);
      } else if (event.error !== "no-speech") {
        // Non-critical errors still get reported but don't stop recognition
        console.warn("Non-critical error:", event.error);
        onErrorRef.current?.(event.error);
      } else {
        console.log("no-speech error - this is normal when there's silence");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      // Final cleanup on unmount
      console.log("Cleaning up recognition on unmount");
      shouldBeListeningRef.current = false;
      clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore errors on abort
        }
      }
    };
  }, []); // Empty deps - only create once

  // Request microphone permission explicitly
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      console.log("Microphone permission granted");
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setHasPermission(false);
      onPermissionDenied?.();
      return false;
    }
  }, [onPermissionDenied]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || !isSupported) {
      console.log("Cannot start - no recognition or not supported");
      return;
    }
    
    console.log("Starting listening...");
    
    try {
      // Set flag that we want to be listening
      shouldBeListeningRef.current = true;
      
      setTranscript("");
      setInterimTranscript("");
      recognitionRef.current.start();
    } catch (error: any) {
      console.error("Error starting speech recognition:", error);
      setIsListening(false);
      
      // Handle specific error types
      if (error.name === "InvalidStateError") {
        // Recognition is already started, try to restart
        console.log("InvalidStateError, attempting to restart...");
        try {
          recognitionRef.current.stop();
          await new Promise(resolve => setTimeout(resolve, 100));
          recognitionRef.current.start();
        } catch (retryError) {
          console.error("Failed to restart recognition:", retryError);
          shouldBeListeningRef.current = false;
          onErrorRef.current?.("Não foi possível iniciar o reconhecimento de voz. Tente novamente.");
        }
      } else if (error.name === "NotAllowedError" || error.message?.includes("permission")) {
        shouldBeListeningRef.current = false;
        setHasPermission(false);
        onPermissionDeniedRef.current?.();
        onErrorRef.current?.("Permissão do microfone negada.");
      } else {
        shouldBeListeningRef.current = false;
        onErrorRef.current?.("Erro ao iniciar reconhecimento de voz.");
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    // Set flag that we don't want to be listening anymore
    shouldBeListeningRef.current = false;
    clearTimeout(restartTimeoutRef.current);
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    isSupported,
    hasPermission,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    requestMicrophonePermission,
  };
};
