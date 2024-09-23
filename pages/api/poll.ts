// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getService } from "@/services/container";
import { InvestmentService } from "@/services/investment/investment.service";
import { SessionService } from "@/services/session.service";
import { INVERSIFY_TOKENS } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next";


/**
    * @swagger
    * /api/poll:
    *   get:
    *    summary: Poll the session service
    *   responses:
    *    200:
    *    description: Successfully polled the session service
    *   405:
    *   description: Method not allowed
    * 
 */

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // const sessionService: SessionService = getService<SessionService>(INVERSIFY_TOKENS.Session);
  // sessionService.poll().then(() => {
  //   console.log("Polling sessions...");
  // });
  // getService<InvestmentService>(INVERSIFY_TOKENS.Investment);

  res.status(200).json({ message: "Polling..." });
}
