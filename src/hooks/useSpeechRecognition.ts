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
  const safariRestartTimeoutRef = useRef<NodeJS.Timeout>(); // Separate timeout for Safari restarts
  const consecutiveRestartsRef = useRef(0);
  const lastStartTimeRef = useRef<number>(0);
  const lastResultTimeRef = useRef<number>(0); // Track last result to prevent rapid fire
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

    // Detect Safari for specific workarounds
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    isSafariRef.current = isSafari;
    console.log("Browser detection - isSafari:", isSafari);

    const recognition = new SpeechRecognitionAPI();
    // Use continuous:false for ALL browsers to avoid network timeout errors
    // We implement manual restart for consistent behavior across browsers
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    
    console.log("Recognition config: continuous=false (manual restart mode)");

    let sessionId = 0;
    
    recognition.onstart = () => {
      sessionId++;
      const startTime = Date.now();
      console.log(`🟢 recognition.onstart [Session ${sessionId}] at ${startTime}`);
      setIsListening(true);
      lastStartTimeRef.current = startTime;
      lastResultTimeRef.current = 0; // Reset result time on new session
      consecutiveRestartsRef.current = 0; // Reset counter on successful start
    };

    recognition.onend = () => {
      const now = Date.now();
      const timeSinceStart = now - lastStartTimeRef.current;
      console.log(`🔴 recognition.onend [Session ${sessionId}] at ${now} (duration: ${timeSinceStart}ms)`);
      setIsListening(false);
      
      // Auto-restart logic - UNIVERSAL for all browsers (continuous:false)
      // This ensures consistent behavior and avoids network timeout errors
      if (shouldBeListeningRef.current) {
        // Check if we're in a restart loop (ended too quickly)
        if (timeSinceStart < 1000) {
          consecutiveRestartsRef.current++;
          
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
        
        console.log("🔄 onend: Scheduling restart in 150ms...");
        clearTimeout(safariRestartTimeoutRef.current);
        safariRestartTimeoutRef.current = setTimeout(() => {
          if (shouldBeListeningRef.current && recognitionRef.current) {
            try {
              console.log("🔄 onend: Restarting recognition now");
              recognitionRef.current.start();
            } catch (error: any) {
              if (error.name !== "InvalidStateError") {
                console.error("Failed to restart from onend:", error);
              }
            }
          }
        }, 150);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const now = Date.now();
      const timeSinceStart = now - lastStartTimeRef.current;
      
      console.log(`🎯 SpeechRecognition onresult fired! [Session ${sessionId}]`);
      console.log("  resultIndex:", event.resultIndex);
      console.log("  total results:", event.results.length);
      console.log("  ⏱️ Time since start:", timeSinceStart + "ms");
      console.log("  ⏱️ lastStartTimeRef:", lastStartTimeRef.current, "| now:", now);
      
      let finalTranscript = "";
      let interimResult = "";

      let finalConfidence = 0;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const confidence = result[0].confidence;
        const confidenceDisplay = confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : "N/A (Safari)";
        console.log(`  Result[${i}]: "${result[0].transcript}" (isFinal: ${result.isFinal}, confidence: ${confidenceDisplay})`);
        
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          // Safari often doesn't provide confidence - treat undefined as 1.0 (trust it)
          const confidenceValue = confidence !== undefined ? confidence : 1.0;
          finalConfidence = Math.max(finalConfidence, confidenceValue);
        } else {
          interimResult += result[0].transcript;
        }
      }

      // Set interim transcript for display (but don't process for matching yet)
      setInterimTranscript(interimResult);
      
      // Only process FINAL results for word matching
      if (finalTranscript) {
        const confidenceDisplay = finalConfidence === 1.0 ? "N/A (Safari default)" : `${(finalConfidence * 100).toFixed(0)}%`;
        console.log("🎤 Final transcript from recognition:", finalTranscript);
        console.log("🎯 Final confidence:", confidenceDisplay);
        
        // Cooldown removed to allow multiple words in quick succession
        // The word matching logic and confidence threshold provide sufficient validation
        const timeSinceLastResult = lastResultTimeRef.current > 0 
          ? now - lastResultTimeRef.current 
          : 9999; // First result, allow it
        
        console.log("⏱️ Time since last result:", timeSinceLastResult + "ms");
        
        // Check confidence threshold - only if Safari actually provided a confidence value
        // Reject only if confidence is explicitly low (< 50%), not when undefined/1.0
        if (finalConfidence < 1.0 && finalConfidence < 0.5) {
          console.log(`⚠️ REJECTED: Low confidence ${(finalConfidence * 100).toFixed(0)}% (minimum: 50%)`);
          return;
        }
        
        console.log("✅ ACCEPTED: Passing validation, will process this word");
        
        // Update last result time
        lastResultTimeRef.current = now;
        
        setTranscript(prev => prev + " " + finalTranscript);
        const wordToProcess = finalTranscript.trim().toLowerCase();
        console.log("📤 Sending to onResult:", wordToProcess);
        onResultRef.current?.(wordToProcess);
        
        // For continuous:false mode (all browsers), restart after getting result
        // Clear any existing restart timeout to prevent multiple restarts
        clearTimeout(safariRestartTimeoutRef.current);
        
        // Small delay to ensure previous recognition has fully stopped
        console.log("🔄 onresult: Scheduling auto-restart in 150ms...");
        safariRestartTimeoutRef.current = setTimeout(() => {
          if (shouldBeListeningRef.current && recognitionRef.current) {
            try {
              console.log("🔄 onresult: Auto-restarting recognition now");
              // Only start if not already listening (prevents InvalidStateError)
              recognitionRef.current.start();
            } catch (e: any) {
              // If already started, just ignore the error and continue
              if (e.name !== "InvalidStateError") {
                console.error("Error restarting after result:", e);
              }
            }
          }
        }, 150);
      }
      // Interim results are set but not processed for matching
    };

    recognition.onerror = (event: any) => {
      // "aborted" errors are expected during restarts in Safari - ignore them
      if (event.error === "aborted" && shouldBeListeningRef.current) {
        // Restart is happening, this is expected
        return;
      }
      
      // Handle critical errors that should stop recognition
      const criticalErrors = ["not-allowed", "audio-capture", "service-not-allowed"];
      if (criticalErrors.includes(event.error)) {
        console.error("Speech recognition critical error:", event.error);
        shouldBeListeningRef.current = false;
        clearTimeout(restartTimeoutRef.current);
        clearTimeout(safariRestartTimeoutRef.current);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setHasPermission(false);
          onPermissionDeniedRef.current?.();
        }
        onErrorRef.current?.(event.error);
      } else if (event.error === "network") {
        // Network errors are common in continuous:false mode - just log and continue
        // The onend handler will restart automatically
        console.warn("⚠️ Network error (non-critical) - will retry on next restart");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Non-critical recognition error:", event.error);
        onErrorRef.current?.(event.error);
      }
      // "no-speech" and "aborted" errors are normal and can be ignored
    };

    recognitionRef.current = recognition;

    return () => {
      // Final cleanup on unmount
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
    if (!recognitionRef.current || !isSupported) return;
    
    try {
      const callTime = Date.now();
      console.log(`\n🎤🎤🎤 STARTING NEW LISTENING SESSION 🎤🎤🎤 at ${callTime}\n`);
      
      // Set flag that we want to be listening
      shouldBeListeningRef.current = true;
      
      setTranscript("");
      setInterimTranscript("");
      console.log("📞 Calling recognition.start()...");
      recognitionRef.current.start();
    } catch (error: any) {
      // Handle specific error types
      if (error.name === "InvalidStateError") {
        // Recognition is already started - this is fine, just continue
        // Don't need to do anything, it's already listening
        return;
      } else if (error.name === "NotAllowedError" || error.message?.includes("permission")) {
        shouldBeListeningRef.current = false;
        setHasPermission(false);
        setIsListening(false);
        onPermissionDeniedRef.current?.();
        onErrorRef.current?.("Permissão do microfone negada.");
      } else {
        shouldBeListeningRef.current = false;
        setIsListening(false);
        onErrorRef.current?.("Erro ao iniciar reconhecimento de voz.");
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    const stopTime = Date.now();
    console.log(`\n🛑 STOP LISTENING CALLED at ${stopTime}`);
    
    shouldBeListeningRef.current = false;
    clearTimeout(restartTimeoutRef.current);
    
    try {
      console.log("📞 Calling recognition.stop()...");
      recognitionRef.current.stop();
    } catch (error) {
      console.log("⚠️ Error on stop:", error);
      // Ignore errors on stop
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
