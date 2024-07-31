import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { Session } from '@/types';

/**
 * @swagger
 * /api/session/create:
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
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const sessionId = uuidv4();
    const images = ['image1.jpg', 'image2.jpg']; // Replace with actual image fetching logic

    const newSession: Session = {
      id: sessionId,
      images,
      isReady: false,
    };

    db.createSession(newSession);

    res.status(200).json({ sessionId });
  } else {
    res.status(405).end();
  }
}
