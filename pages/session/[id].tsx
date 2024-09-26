import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { SessionService } from "@/services/session.service";
import Button from "@/components/button";
import Textarea from "@/components/textarea";
import { getService } from "@/services/container";
import { INVERSIFY_TOKENS, Session, SessionStatus } from "@/types";
import Head from "next/head";
import Layout from "@/components/Layout";

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
    const [error, setError] = useState<string | null>(initialError ?? null);
    const [impressionText, setImpressionText] = useState("");
    const [calculatedState, setCalculatedState] =
        useState<CalculatedSessionState | null>(null);
    const [showNonTargetImages, setShowNonTargetImages] = useState(false);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

    // Update this useEffect to start polling immediately
    useEffect(() => {
        let id: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (session && session.status !== SessionStatus.ShownFeedback) {
                id = setInterval(pollSession, 5000); // Poll every 5 seconds
                setIntervalId(id);
            }
        };

        startPolling();

        // Cleanup interval on component unmount or when session changes
        return () => {
            if (id) clearInterval(id);
        };
    }, [session]);

    // This will update the favicon based on the session status
    useEffect(() => {
        updateFavicon(session?.status);
        if (session) {
            calculateSessionState(session);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            calculateSessionState(session);
        }
    }, [session]);

    const pollSession = useCallback(async () => {
        if (!session) return;

        try {
            const response = await fetch(`/api/session/${session.id}`);
            if (!response.ok) {
                throw new Error("Failed to fetch session");
            }
            const updatedSession = await response.json();
            setSession(updatedSession);

            if (updatedSession.status === SessionStatus.ShownFeedback) {
                // Stop polling if session is fully completed
                if (intervalId) {
                    clearInterval(intervalId);
                    setIntervalId(null);
                }
            }
        } catch (error) {
            console.error("Error polling session:", error);
            setError("Failed to update session status");
            if (intervalId) {
                clearInterval(intervalId);
                setIntervalId(null);
            }
        }
    }, [session, intervalId]);

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
            <Textarea
                value={impressionText}
                onChange={e => setImpressionText(e.target.value)}
                placeholder="Enter your impression of the image represented by the reference above"
                className="input-textarea mb-4"
            />
            <Button className="pythia-button w-full" onClick={activateSession}>
                Submit
            </Button>
        </div>
    );

    const renderActiveSession = () => (
        <div className="result-container">
            <h2 className="result-title">Resolving</h2>
            <h4>This session is in the &apos;{session?.status}&apos; phase</h4>
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
            case SessionStatus.ShownFeedback:
                return renderCompletedSession();
            default:
                return null;
        }
    };

    const updateFavicon = (status?: string) => {
        if (typeof document !== "undefined") {
            const link =
                (document.querySelector(
                    "link[rel*='icon']"
                ) as HTMLLinkElement) || document.createElement("link");
            link.type = "image/x-icon";
            link.rel = "shortcut icon";
            link.href = `/favicon-${status}.ico`;
            document.head.appendChild(link);
        }
    };

    if (error) {
        updateFavicon("error");
        return (
            <Layout>
                <p className="error-text">{error}</p>
            </Layout>
        );
    }

    if (!session) {
        return (
            <Layout>
                <p className="loading-text">Loading...</p>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head>
                <title>{session ? `Session ${session.id}` : "Session"}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="page-container">
                <h1 className="page-title">{session.id}</h1>
                {renderSessionContent()}
            </div>
        </Layout>
    );
};

export default SessionPage;
