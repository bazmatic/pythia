import React from 'react';
import { useRouter } from 'next/router';

const MainPage = () => {
  const router = useRouter();

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/create', { method: 'POST' });
      const data = await response.json();
      router.push(`/session/${data.id}`);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Psychic Investment Game</h1>
      <p className="text-lg mb-8">
        Enter your impressions of the image you will be shown.
      </p>
      <button onClick={createNewSession} className="px-6 py-3 text-lg">
        Create New Session
      </button>
    </div>
  );
};

export default MainPage;