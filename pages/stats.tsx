import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { getService } from '@/services/container';
import { StatsService } from '@/services/stats.service';
import { INVERSIFY_TOKENS, SessionStats } from '@/types';

interface StatsPageProps {
  stats: SessionStats;
}

export const getServerSideProps: GetServerSideProps = async () => {
  const statsService = getService<StatsService>(INVERSIFY_TOKENS.Stats);
  const stats = await statsService.getStats();
  return {
    props: {
      stats
    }
  };
};

const StatsPage = ({ stats }: StatsPageProps) => {
  return (
    <Layout>
      <Head>
        <title>Pythia Stats</title>
      </Head>
      <div className="page-container">
        <h1 className="page-title">Pythia Stats</h1>
        <div className="session-info">
          <h2>Overall Performance</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-lg font-semibold text-gray-700">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalSessions}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-lg font-semibold text-gray-700">Win Percentage</p>
              <p className="text-3xl font-bold text-gray-800">{stats.winPercentage}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-lg font-semibold text-gray-700">Wins</p>
              <p className="text-3xl font-bold text-green-600">{stats.wins}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-lg font-semibold text-gray-700">Losses</p>
              <p className="text-3xl font-bold text-red-600">{stats.losses}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StatsPage;
