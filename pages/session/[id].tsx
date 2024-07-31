import React, { useState } from "react";
import { GetServerSideProps } from "next";
import { Session, SessionService } from "@/services/session.service";
import Button from "@/components/button";
import Textarea from "@/components/textarea";
import { useService } from "@/services/container";

interface SessionPageProps {
    initialSession: Session | null;
    error?: string;
}

export const getServerSideProps: GetServerSideProps<
    SessionPageProps
> = async context => {
    const sessionService = useService<SessionService>("session");
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

const SessionPage: React.FC<SessionPageProps> = ({ initialSession, error }) => {
    const [session, setSession] = useState<Session | null>(initialSession);
    const [impressionText, setImpressionText] = useState("");

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    if (!session) {
        return <div>Loading...</div>;
    }

    const activateSession = async () => {
        try {
            const response = await fetch("/api/session/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: session.id, impressionText })
            });
            if (!response.ok) {
                throw new Error("Failed to activate session");
            }
            const updatedSession = await response.json();
            setSession(updatedSession);
        } catch (error) {
            console.error("Error activating session:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="text-3xl font-bold mb-6">Session: {session.id}</h1>
            {session.status === "pending" && (
                <div className="w-full max-w-md">
                    <Textarea
                        value={impressionText}
                        onChange={e => setImpressionText(e.target.value)}
                        placeholder="Enter your impression of the images..."
                        className="mb-4"
                    />
                    <Button onClick={activateSession} className="w-full">
                        Submit Impression
                    </Button>
                </div>
            )}
            {session.status === "active" && (
                <div className="text-xl">
                    Please wait. The session is being resolved...
                </div>
            )}
            {session.status === "completed" && (
                <div className="w-full max-w-2xl">
                    <div className="flex justify-between mb-4">
                        <img
                            src={`/images/${session.images[0]}`}
                            alt="Image 1"
                            className="w-1/2 pr-2"
                        />
                        <img
                            src={`/images/${session.images[1]}`}
                            alt="Image 2"
                            className="w-1/2 pl-2"
                        />
                    </div>
                    <p className="text-lg mb-2">
                        You chose image:{" "}
                        {session.chosenImageIdx === 0 ? "Left" : "Right"}
                    </p>
                    <p className="text-lg">
                        Target image was:{" "}
                        {session.targetImageIdx === 0 ? "Left" : "Right"}
                    </p>
                </div>
            )}
        </div>
    );
};

export default SessionPage;
