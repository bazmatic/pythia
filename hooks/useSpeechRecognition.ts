import { useEffect, useRef } from 'react';

interface UseSpeechRecognitionProps {
  onTranscriptChange?: (transcript: string) => void;
  isListening: boolean;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
}

export function useSpeechRecognition({ 
  onTranscriptChange, 
  isListening 
}: UseSpeechRecognitionProps): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event: any) => {
      let currentTranscript = transcriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          currentTranscript += event.results[i][0].transcript + '.\n';
        }
      }
      transcriptRef.current = currentTranscript;
      onTranscriptChange?.(currentTranscript);
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognitionInstance;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Only run once on mount

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.log('Recognition already started');
      }
    } else {
      recognition.stop();
    }
  }, [isListening]);

  return {
    isSupported: typeof window !== 'undefined' && 
      // @ts-ignore
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
} 