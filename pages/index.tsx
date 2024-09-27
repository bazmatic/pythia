import React, { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

const MainPage = () => {
    const router = useRouter();
    const [isFading, setIsFading] = useState(false);

    const createNewSession = async () => {
        setIsFading(true);
        try {
            const response = await fetch("/api/create", { method: "POST" });
            const data = await response.json();
            await new Promise(resolve => setTimeout(resolve, 1000));
            router.push(`/session/${data.id}`);
        } catch (error) {
            console.error("Error creating new session:", error);
            setIsFading(false);
        }
    };

    return (
        <Layout>
            <div className={`flex flex-col items-center justify-center min-h-screen bg-white transition-opacity duration-1000 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <img
                    src="/pythia.png"
                    alt="Pythia"
                    className="w-1/3 h-auto mx-auto mb-8"
                />
                <p className="text-lg mb-8">Prepare yourself.</p>
                <button onClick={createNewSession} className="pythia-button" disabled={isFading}>
                    Start
                </button>
            </div>
        </Layout>
    );
};

export default MainPage;
