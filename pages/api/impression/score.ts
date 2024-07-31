import { NextApiRequest, NextApiResponse } from 'next';
import judgeService from '@/services/judge.service';
import { join } from 'path';

/**
 * @swagger
 * /api/impression/score:
 *   post:
 *     summary: Evaluate an image and impression pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageName
 *               - impressionText
 *             properties:
 *               imageName:
 *                 type: string
 *               impressionText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully evaluated the image and impression
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *       400:
 *         description: Bad request (missing or invalid parameters)
 *       500:
 *         description: Server error
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { imageName, impressionText } = req.body;

    if (!imageName || !impressionText) {
      return res.status(400).json({ error: 'Missing imageName or impressionText' });
    }

    try {
      // Assuming images are stored in the public/images directory
      const imagePath = join(process.cwd(), 'public', 'images', imageName);
      
      const score = await judgeService.calculateScore(imagePath, impressionText);

      res.status(200).json({ score });
    } catch (error) {
      console.error('Error evaluating image and impression:', error);
      res.status(500).json({ error: 'An error occurred while evaluating the image and impression' });
    }
  } else {
    res.status(405).end();
  }
}