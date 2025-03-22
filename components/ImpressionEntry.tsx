import React, { useState } from "react";
import Button from "@/components/button";
import Textarea from "@/components/textarea";
import SpeechRecognition from "@/components/SpeechRecognition";
import MicrophoneIcon from "@/components/icons/MicrophoneIcon";

interface ImpressionEntryProps {
    impressionText: string;
    onImpressionChange: (text: string) => void;
    onSubmit: () => void;
}

const ImpressionEntry: React.FC<ImpressionEntryProps> = ({
    impressionText,
    onImpressionChange,
    onSubmit
}) => {
    const [isListening, setIsListening] = useState(false);

    const handleTranscript = (transcript: string) => {
        onImpressionChange(transcript);
    };

    const toggleListening = () => {
        setIsListening(!isListening);
    };

    return (
        <>
            <div className="result-container">
                <Textarea
                    value={impressionText}
                    onChange={e => onImpressionChange(e.target.value)}
                    placeholder="Enter your impression of the image represented by the reference above"
                    className="input-textarea mb-4"
                />
                <div className="flex justify-between items-center mb-4">
                    <Button
                        onClick={toggleListening}
                        className={`flex items-center gap-2 px-4 py-2 rounded ${
                            isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        } text-white transition-colors`}
                    >
                        <MicrophoneIcon />
                        {isListening ? 'Stop' : 'Transcribe'}
                    </Button>
                    <SpeechRecognition 
                        isListening={isListening} 
                        onTranscriptChange={handleTranscript}
                    />
                </div>
            </div>
            <Button className="pythia-button w-full" onClick={onSubmit}>
                Submit
            </Button>
        </>
    );
};

export default ImpressionEntry; 