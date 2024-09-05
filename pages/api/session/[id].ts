// pages/api/session/[sessionId].ts
import { getService } from "@/services/container";
import { SessionService } from "@/services/session.service";
import { INVERSIFY_TOKENS, Session } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * @swagger
 * /api/session/{id}:
 *   get:
 *     summary: Get session information
 *     parameters:
 *       - in: path
 *         name: id
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
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const sessionService = getService<SessionService>(INVERSIFY_TOKENS.Session);
    if (req.method === "GET") {
        const sessionId = req.query.id;
        if (!sessionId || Array.isArray(sessionId)) {
            return res.status(400).json({ error: "Invalid session ID" });
        }

        const session: Session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: "Session not found" });
        }
        res.status(200).json(session);
    } else {
        res.status(405).end();
    }
}
