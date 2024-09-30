import { getService } from "@/services/container";
import { SessionService } from "@/services/session.service";
import { INVERSIFY_TOKENS } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * @swagger
 * /api/session:
 *   get:
 *     summary: Get all sessions
 *     responses:
 *       200:
 *         description: Successfully retrieved sessions
 *       500:
 *         description: Internal server error
 */

// Return all sessions, sorted by date
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const sessionService = getService<SessionService>(INVERSIFY_TOKENS.Session);
    const sessions = await sessionService.getSessions();
    res.status(200).json(sessions);
}
