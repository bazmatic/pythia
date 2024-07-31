// pages/api/session/[sessionId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/services/db';
import { Session } from '@/types';

/**
 * @swagger
 * /api/session/{sessionId}:
 *   get:
 *     summary: Get session information
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved session information
 *       400:
 *         description: Session is not ready
 *       404:
 *         description: Session not found
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { sessionId } = req.query;

    if (typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Invalid sessionId' });
    }

    const session: Session = db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.isReady) {
      return res.status(400).json({ error: 'Session is not ready' });
    }

    const successfulImageUrl = session.images[session.strategy!];
    const successfulPrediction = session.strategy === 0; // Assuming 0 is always the correct strategy for this example

    res.status(200).json({
      imageUrl: successfulImageUrl,
      successfulPrediction,
    });
  } else {
    res.status(405).end();
  }
}