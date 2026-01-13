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

  useEffect(() => {
    // Check browser support
    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      console.warn("Speech Recognition API not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

      if (finalTranscript) {
        setTranscript(prev => prev + " " + finalTranscript);
        onResult?.(finalTranscript.trim().toLowerCase());
      }
      
      setInterimTranscript(interimResult);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      onError?.(event.error);
      
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [language, continuous, onResult, onError]);

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
    
    // Request permission first if we haven't yet
    if (hasPermission !== true) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        onError?.("Permissão do microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.");
        return;
      }
    }
    
    try {
      setTranscript("");
      setInterimTranscript("");
      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }, [isSupported, hasPermission, requestMicrophonePermission, onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
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
