// pages/api/session/activate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getService } from '@/services/container';
import { SessionService } from '@/services/session.service';

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
 *                 example: "ddcbbb78-d5e9-4090-af86-b27cc910df8e"
 *               impressionText:
 *                 type: string
 *                 example: "A dark scene with vertical components. standing on white carpet"
 *     responses:
 *       200:
 *         description: Successfully activated the session
 *       404:
 *         description: Session not found
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { sessionId, impressionText } = req.body;

    const sessionService = getService<SessionService>('session');
    await sessionService.activateSession(sessionId, impressionText);
    const session = await sessionService.getSession(sessionId);

    res.status(200).json(session);

  } else {
    res.status(405).end();
  }
}

