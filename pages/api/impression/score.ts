import { NextApiRequest, NextApiResponse } from 'next';
import judgeService, { JudgeService } from '@/services/judge.service';
import { useService } from '@/services/container';
import { ImageService } from '@/services/image.service';

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
  const imageService = useService<ImageService>('session');
  const judgeService = useService<JudgeService>('judge');
  if (req.method === 'POST') {
    const { imageName, impressionText } = req.body;

    if (!imageName || !impressionText) {
      return res.status(400).json({ error: 'Missing imageName or impressionText' });
    }

    try {
      // Assuming images are stored in the public/images directory

      const imageUrl = imageService.getImagePath(imageName); 
      const score = 0; // await judgeService.calculateScore(imageUrl, impressionText);

      res.status(200).json({ score });
    } catch (error) {
      console.error('Error evaluating image and impression:', error);
      res.status(500).json({ error: 'An error occurred while evaluating the image and impression' });
    }
  } else {
    res.status(405).end();
  }
}