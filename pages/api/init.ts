// /*
// Get the session service and start polling
// */

// import { getService } from "@/services/container";
// import { SessionService } from "@/services/session.service";
// import { INVERSIFY_TOKENS } from "@/types";
// import { NextApiRequest, NextApiResponse } from "next";

// /**
//     * @swagger
//     * /api/poll:
//     * 
//  */
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method === "GET") {
//     const sessionService = getService<SessionService>(INVERSIFY_TOKENS.Session);  
//     sessionService.poll();

//     return res.status(200).end();

//   } else {
//     res.status(405).end();
//   }
// }