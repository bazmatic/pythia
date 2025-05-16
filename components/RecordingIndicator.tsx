import React from 'react';

interface RecordingIndicatorProps {
  isListening: boolean;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ isListening }) => {
  if (!isListening) return null;

  return (
    <div className="recording-indicator">
      <div className="recording-dot" />
      Recording...
      <style jsx>{`
        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #dc2626;
          font-size: 0.875rem;
        }
        .recording-dot {
          width: 8px;
          height: 8px;
          background-color: #dc2626;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}; 