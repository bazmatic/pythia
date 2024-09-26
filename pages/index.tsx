import React from 'react';
import { useRouter } from 'next/router';

const MainPage = () => {
  const router = useRouter();

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/create', { method: 'POST' });
      const data = await response.json();
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push(`/session/${data.id}`);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <img src="/pythia.png" alt="Pythia" className="w-1/3 h-auto mx-auto mb-8" />
      <p className="text-lg mb-8">
       Prepare yourself.
      </p>
      <button 
        onClick={createNewSession} 
        className="pythia-button"
      >
        Start
      </button>
    </div>
  );
};

export default MainPage;