import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { SessionService } from "@/services/session.service";
import Button from "@/components/button";
import Textarea from "@/components/textarea";
import { getService } from "@/services/container";
import { INVERSIFY_TOKENS, Session, SessionStatus } from "@/types";

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
    const sessionService = getService<SessionService>(INVERSIFY_TOKENS.Session);
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
        if (session?.status === SessionStatus.InvestmentResolved) {
            calculateSessionState(session);
        }
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const pollSession = async () => {
            if (!session) return;
            if (session?.status !== SessionStatus.InvestmentResolved) {
                try {
                    const response = await fetch(`/api/session/${session.id}`);
                    if (!response.ok) {
                        throw new Error("Failed to fetch session");
                    }
                    const updatedSession = await response.json();
                    setSession(updatedSession);

                    if (updatedSession.status === SessionStatus.InvestmentResolved) {
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

        if (session?.status !== SessionStatus.InvestmentResolved) {
            intervalId = setInterval(pollSession, 30000); // Poll every 30 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [session]);

    const calculateSessionState = (completedSession: Session) => {
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
            .filter((_, index) => index !== completedSession.targetImageIdx)
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
        <div className="result-container">
            <h2 className="result-title">Impression</h2>
            <Textarea
                value={impressionText}
                onChange={e => setImpressionText(e.target.value)}
                placeholder="Enter your impression of the image"
                className="input-textarea mb-4"
            />
            <Button onClick={activateSession} className="submit-button">
                Submit Impression
            </Button>
        </div>
    );

    const renderActiveSession = () => (
        <div className="result-container">
            <h2 className="result-title">Resolving</h2>
            <h4>This session is in the '{session?.status}' phase</h4>
            <div className="loading-text">
                Please wait. The session is being resolved...
            </div>
            <div className="impression-text">
                <h3 className="font-semibold mb-2">Your impression:</h3>
                <p>{session?.impressionText}</p>
            </div>
        </div>
    );

    const renderCompletedSession = () => (
        <div className="result-container">
            <h2 className="result-title">Results</h2>
            <div className="impression-text">
                <h3 className="font-semibold mb-2">Your impression:</h3>
                <p>{session?.impressionText}</p>
            </div>
            <div className="image-container">
                <h2>Target image</h2>
                <div className="image-wrapper">
                    {!calculatedState?.isCorrect && (
                        <>
                            <img
                                src={calculatedState?.targetImageSrc}
                                alt="Target Image"
                                className="session-image"
                            />
                            <p className="result-text">
                                You did not correctly identify the target image.
                            </p>
                        </>
                    )}
                    {calculatedState?.isCorrect && (
                        <>
                            <img
                                src={calculatedState?.targetImageSrc}
                                alt="Target Image"
                                className="session-image successful-image"
                            />
                            <p className="result-text">
                                You correctly identified the target image.
                            </p>
                        </>
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
                    <h3 className="font-semibold mb-2">Other Images</h3>
                    <p>Not the target</p>
                    <div className="flex flex-wrap justify-center">
                        {calculatedState?.nonTargetImageSrcs.map(
                            (src, index) => (
                                <div key={index} className="image-wrapper m-2">
                                    {calculatedState?.chosenImageSrc ===
                                        src && (
                                        <p className="result-text">
                                            You chose this image
                                        </p>
                                    )}

                                    <img
                                        src={src}
                                        alt={`Image ${index + 1}`}
                                        className={`session-image ${
                                            src ===
                                            calculatedState?.chosenImageSrc
                                                ? "chosen"
                                                : "not-chosen"
                                        } `}
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
            case SessionStatus.New:
                return renderPendingSession();
            case SessionStatus.Unjudged:
            case SessionStatus.Judged:
            case SessionStatus.Investing:
            case SessionStatus.Invested:
                return renderActiveSession();
            case SessionStatus.InvestmentResolved:
                return renderCompletedSession();
            default:
                return null;
        }
    };

    if (error) {
        return (
            <div className="page-container">
                <Link href="/" className="home-link">Home</Link>
                <p className="error-text">{error}</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="page-container">
                <Link href="/" className="home-link">Home</Link>
                <p className="loading-text">Loading...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Link href="/" className="home-link">Home</Link>
            <h1 className="page-title">{session.id}</h1>

            {renderSessionContent()}
        </div>
    );
};

export default SessionPage;
