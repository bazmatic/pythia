import React from 'react';
import dynamic from 'next/dynamic';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { RecordingIndicator } from './RecordingIndicator';

interface SpeechRecognitionProps {
  onTranscriptChange?: (transcript: string) => void;
  isListening: boolean;
}

// Create a client-side only version of the component
const SpeechRecognition: React.FC<SpeechRecognitionProps> = (props) => {
  const { isSupported } = useSpeechRecognition(props);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="speech-recognition">
      <RecordingIndicator isListening={props.isListening} />
      <style jsx>{`
        .speech-recognition {
          position: relative;
          padding: 10px;
        }
      `}</style>
    </div>
  );
};

// Export a dynamic version that only renders on the client
export default dynamic(() => Promise.resolve(SpeechRecognition), {
  ssr: false
});
