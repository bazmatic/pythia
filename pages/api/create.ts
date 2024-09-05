import { NextApiRequest, NextApiResponse } from 'next';
import { getService } from '@/services/container';
import { SessionService } from '@/services/session.service';
import { INVERSIFY_TOKENS } from '@/types';

/**
 * @swagger
 * /api/create:
 *   post:
 *     summary: Create a new session
 *     responses:
 *       200:
 *         description: Successfully created a new session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionService = getService<SessionService>(INVERSIFY_TOKENS.Session);
  if (req.method === 'POST') {
    const session = await sessionService.createSession();
    res.status(200).json(session);
  } else {
    res.status(405).end();
  }
}