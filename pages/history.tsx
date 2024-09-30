import React from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Layout from "@/components/Layout";
import { getService } from "@/services/container";
import {
    INVERSIFY_TOKENS,
    ISessionService,
    Session,
    SessionStats,
    SessionStatus
} from "@/types";
import Link from "next/link";

interface HistoryPageProps {
    sessions: Session[];
}

export const getServerSideProps: GetServerSideProps = async () => {
    const sessionService = getService<ISessionService>(
        INVERSIFY_TOKENS.Session
    );
    const sessions = await sessionService.getSessions();
    return {
        props: {
            sessions: sessions.filter((s) => { return s.status === SessionStatus.ShownFeedback })
        }
    };
};

const HistoryPage = ({ sessions }: HistoryPageProps) => {
    return (
        <Layout>
            <Head>
                <title>Pythia History</title>
            </Head>
            <div className="page-container">
                <h1 className="page-title">Pythia History</h1>
                <div className="grid grid-cols-1 gap-4 mt-4">
                    {sessions.map((session) => (
                        <div key={session.id} className="bg-white p-4 rounded-lg shadow-md">
                            <h2 className="text-lg font-semibold text-gray-700"><Link href={`/session/${session.id}`}>{session.id}</Link></h2>
                            <p className="text-gray-500">{session.chosenImageIdx === session.targetImageIdx ? "Win" : "Loss"}</p>
                            <pre>{session.impressionText}</pre>
                            {session.targetImageIdx !== undefined &&
                            <p className="text-gray-500"><img src={`images/${session.images[session.targetImageIdx]}`} alt="Target" width={300} height={300} /></p>
                            }
                            <p className="text-gray-500">{session.created_at ? new Date(session.created_at).toString() : ""}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default HistoryPage;