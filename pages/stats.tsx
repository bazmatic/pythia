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
      
      <h1>Stats</h1>
      <p>Total Sessions: {stats.totalSessions}</p>
      <p>Wins: {stats.wins}</p>
      <p>Losses: {stats.losses}</p>
      <p>Win Percentage: {stats.winPercentage}%</p>
    </Layout>
  );
};

export default StatsPage;
