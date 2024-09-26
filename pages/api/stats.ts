import { NextApiRequest, NextApiResponse } from 'next';
import { getService } from '@/services/container';
import { StatsService } from '@/services/stats.service';
import { INVERSIFY_TOKENS } from '@/types';

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get session statistics
 *     responses:
 *       200:
 *         description: Successfully retrieved session statistics
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const statsService = getService<StatsService>(INVERSIFY_TOKENS.Stats);

  if (req.method === 'GET') {
    try {
      const stats = await statsService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
