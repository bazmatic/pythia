import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { SessionService } from "@/services/session.service";
import Button from "@/components/button";
import Textarea from "@/components/textarea";
import { getService } from "@/services/container";
import { ServiceName, Session, SessionStatus } from "@/types";

interface SessionPageProps {
    initialSession: Session | null;
    error?: string;
}

interface CalculatedSessionState {
    isCorrect: boolean;
    chosenImageSrc: string;
    targetImageSrc: string;
    chosenImageNumber: number;
    targetImageNumber: number;
    nonTargetImageSrcs: string[];
}

export const getServerSideProps: GetServerSideProps<
    SessionPageProps
> = async context => {
    const sessionService = getService<SessionService>(ServiceName.Session);
    const id = context.params?.id;

    if (typeof id !== "string") {
        return {
            props: {
                initialSession: null,
                error: "Invalid session ID"
            }
        };
    }

    try {
        const session = await sessionService.getSession(id);
        return {
            props: {
                initialSession: session
            }
        };
    } catch (error) {
        console.error("Error fetching session:", error);
        return {
            props: {
                initialSession: null,
                error: "Session not found"
            }
        };
    }
};

const SessionPage: React.FC<SessionPageProps> = ({
    initialSession,
    error: initialError
}) => {
    const [session, setSession] = useState<Session | null>(initialSession);
    const [error, setError] = useState<string | undefined>(initialError);
    const [impressionText, setImpressionText] = useState("");
    const [calculatedState, setCalculatedState] =
        useState<CalculatedSessionState | null>(null);
    const [showNonTargetImages, setShowNonTargetImages] = useState(false);

    useEffect(() => {
        if (session?.status === SessionStatus.Completed) {
            calculateSessionState(session);
        }
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const pollSession = async () => {
            if (session?.status === SessionStatus.Active) {
                try {
                    const response = await fetch(`/api/session/${session.id}`);
                    if (!response.ok) {
                        throw new Error("Failed to fetch session");
                    }
                    const updatedSession = await response.json();
                    setSession(updatedSession);

                    if (updatedSession.status === SessionStatus.Completed) {
                        clearInterval(intervalId);
                        calculateSessionState(updatedSession);
                    }
                } catch (error) {
                    console.error("Error polling session:", error);
                    setError("Failed to update session status");
                    clearInterval(intervalId);
                }
            }
        };

        if (session?.status === SessionStatus.Active) {
            intervalId = setInterval(pollSession, 5000); // Poll every 5 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [session]);

    const calculateSessionState = (completedSession: Session) => {
        debugger;
        if (
            completedSession.chosenImageIdx === undefined ||
            completedSession.targetImageIdx === undefined
        ) {
            return;
        }
        const isCorrect =
            completedSession.chosenImageIdx === completedSession.targetImageIdx;
        const chosenImageSrc = `/images/${
            completedSession.images[completedSession.chosenImageIdx]
        }`;
        const targetImageSrc = `/images/${
            completedSession.images[completedSession.targetImageIdx]
        }`;
        const chosenImageNumber = completedSession.chosenImageIdx + 1;
        const targetImageNumber = completedSession.targetImageIdx + 1;

        const nonTargetImageSrcs = completedSession.images
            .filter(
                (_, index) =>
                    index !== completedSession.targetImageIdx
            )
            .map(image => `/images/${image}`);

        setCalculatedState({
            isCorrect,
            chosenImageSrc,
            targetImageSrc,
            chosenImageNumber,
            targetImageNumber,
            nonTargetImageSrcs
        });
    };

    const activateSession = async () => {
        try {
            const response = await fetch("/api/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: session?.id, impressionText })
            });
            if (!response.ok) {
                throw new Error("Failed to activate session");
            }
            const updatedSession = await response.json();
            setSession(updatedSession);
        } catch (error) {
            console.error("Error activating session:", error);
            setError("Failed to activate session");
        }
    };

    const toggleNonTargetImages = () => {
        setShowNonTargetImages(!showNonTargetImages);
    };

    const renderPendingSession = () => (
        <div className="w-full max-w-md mx-auto">
            <Textarea
                value={impressionText}
                onChange={e => setImpressionText(e.target.value)}
                placeholder="Enter your impression of the images..."
                className="input-textarea mb-4"
            />
            <Button onClick={activateSession} className="submit-button">
                Submit Impression
            </Button>
        </div>
    );

    const renderActiveSession = () => (
        <div className="loading-text">
            Please wait. The session is being resolved...
        </div>
    );

    const renderCompletedSession = () => (
        <div className="result-container">
            <h2 className="result-title">Session Results</h2>
            <div className="image-container">
                
                    <div className="image-wrapper">
                        <img
                            src={calculatedState?.targetImageSrc}
                            alt="Chosen and Target Image"
                            className="session-image"
                        />
                        {!calculatedState?.isCorrect && (
                            <p className="result-text">
                                You did not correctly identify the target image.
                            </p>
                        )}
                        {calculatedState?.isCorrect && (
                            <p className="result-text">
                                You correctly identified the target image.
                            </p>
                        )}       
                    </div>            
            </div>
            <p className="result-text">
                You chose image:{" "}
                <span className="font-semibold">
                    {calculatedState?.chosenImageNumber}
                </span>
            </p>
            <p className="result-text">
                Target image was:{" "}
                <span className="font-semibold">
                    {calculatedState?.targetImageNumber}
                </span>
            </p>
            <button
                onClick={toggleNonTargetImages}
                className="text-blue-500 underline mt-4"
            >
                {showNonTargetImages ? "Hide" : "Show"} other images
            </button>
            {showNonTargetImages && (
                <div className="nontarget-images mt-4">
                    <h3 className="font-semibold mb-2">Other Images:</h3>
                    <div className="flex flex-wrap justify-center">
                        {calculatedState?.nonTargetImageSrcs.map(
                            (src, index) => (
                                <div key={index} className="image-wrapper m-2">
                                    <img
                                        src={src}
                                        alt={`Image ${index + 1}`}
                                        className={`session-image ${src === calculatedState?.chosenImageSrc ? "chosen" : "not-chosen"} `}
                                    />
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderSessionContent = () => {
        switch (session?.status) {
            case SessionStatus.Pending:
                return renderPendingSession();
            case SessionStatus.Active:
                return renderActiveSession();
            case SessionStatus.Completed:
                return renderCompletedSession();
            default:
                return null;
        }
    };

    if (error) {
        return (
            <div className="page-container">
                <p className="error-text">{error}</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="page-container">
                <p className="loading-text">Loading...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="page-title">Session: {session.id}</h1>
            <div className="session-info">
                <p className="text-lg mb-2">
                    Status:{" "}
                    <span className="font-semibold">{session.status}</span>
                </p>
            </div>

            {session.impressionText && (
                <div className="impression-text">
                    <h3 className="font-semibold mb-2">Your impression:</h3>
                    <p>{session.impressionText}</p>
                </div>
            )}

            {renderSessionContent()}
        </div>
    );
};

export default SessionPage;
