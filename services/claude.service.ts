import dotenv from 'dotenv';
import fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}
const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

export async function uploadImagesAndAnalyze(
  imageAPath: string,
  imageBPath: string,
  psychicImpressions: string
): Promise<number> {
  try {
    // Read image files
    const [imageABuffer, imageBBuffer] = await Promise.all([
      fs.readFile(imageAPath),
      fs.readFile(imageBPath)
    ]);

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageABuffer.toString('base64')
            }
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBBuffer.toString('base64')
            }
          },
          {
            type: 'text',
            text: `I've uploaded two images: "image_a" and "image_b".

Here are the psychic impressions for one of these images:

${psychicImpressions}

Please analyze these impressions and determine which image ("image_a" or "image_b") they most closely match.
Explain your reasoning, noting specific details from the impressions that correspond to elements in the chosen image.
Also, provide a confidence level (low, medium, or high) for your judgment. Respond via a JSON object with the following format:
{
  "chosen_image": "image_a or image_b",
  "confidence_level": "low, medium, or high",
  "reasoning": "Explanation of reasoning"
}`
          }
        ]
      }
    ];

    const response = await client.messages.create({
      max_tokens: 1024,
      messages,
      model: "claude-3-opus-20240229"
    });

    // Extract text from the response
    const responseText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    if (!responseText) {
      throw new Error('No text response received');
    }

    const parsedJson = JSON.parse(responseText);
    console.log(parsedJson);
    if (parsedJson.chosen_image === "image_a") {
      return 0;
    } else if (parsedJson.chosen_image === "image_b") {
      return 1;
    }
    throw new Error('Invalid response from Claude Judge');
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
}