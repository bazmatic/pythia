// pages/api/session/activate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/services/db';
import { Session } from '@/types';

/**
 * @swagger
 * /api/session/activate:
 *   post:
 *     summary: Activate an existing session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               impressionText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully activated the session
 *       404:
 *         description: Session not found
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { sessionId, impressionText } = req.body;

    const session: Session = db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mock services (replace with actual implementations)
    const judgeService = (images: string[], impression: string) => Math.floor(Math.random() * images.length);
    const investmentService = {
      applyStrategy: (strategy: number) => {},
      evaluateMostSuccessful: () => Math.floor(Math.random() * 2),
    };

    const chosenImageIndex = judgeService(session.images, impressionText);
    const mostSuccessfulStrategy = chosenImageIndex;
    // investmentService.applyStrategy(chosenImageIndex);
    // const mostSuccessfulStrategy = investmentService.evaluateMostSuccessful();

    db.updateSession(sessionId, {
      strategy: mostSuccessfulStrategy,
      isReady: true,
    });

    res.status(200).json({ message: 'Session activated successfully' });
  } else {
    res.status(405).end();
  }
}

