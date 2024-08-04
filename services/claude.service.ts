import dotenv from "dotenv";
import fs from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson, IJudgeProvider } from "@/types";

dotenv.config();

export class ClaudeJudgeProvider implements IJudgeProvider {
    private client: Anthropic;
    private readonly IMAGE_A = "image_1111";
    private readonly IMAGE_B = "0x4444";

    constructor() {
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not set in the environment variables");
        }
        this.client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    }

    async uploadImagesAndAnalyze(
        imageAPath: string,
        imageBPath: string,
        psychicImpressions: string
    ): Promise<number> {
        const [imageABuffer, imageBBuffer] = await Promise.all([
            fs.readFile(imageAPath),
            fs.readFile(imageBPath)
        ]);

        const messages: Anthropic.Messages.MessageParam[] = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `I'm going to show you two images. The first image is named "${this.IMAGE_A}" and the second image is named "${this.IMAGE_B}".`
                    },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: "image/jpeg",
                            data: imageABuffer.toString("base64")
                        }
                    },
                    {
                        type: "text",
                        text: `This was image "${this.IMAGE_A}".`
                    },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: "image/jpeg",
                            data: imageBBuffer.toString("base64")
                        }
                    },
                    {
                        type: "text",
                        text: `This was image "${this.IMAGE_B}".`
                    },
                    {
                        type: "text",
                        text: this.generatePrompt(psychicImpressions)
                    }
                ]
            }
        ];

        const response = await this.client.messages.create({
            max_tokens: 1024,
            messages,
            model: "claude-3-opus-20240229"
        });

        const responseText = this.extractResponseText(response);

        if (!responseText) {
            throw new Error("No text response received");
        }
        console.log("Handling response from Claude Judge");
        return this.handleResponse(responseText);
    }

    private generatePrompt(psychicImpressions: string): string {
        return `Now that you've seen both images, here are the psychic impressions for one of these images:

${psychicImpressions}

Please analyze these impressions and determine which image ("${this.IMAGE_A}" or "${this.IMAGE_B}") they most closely match.
Analyse the following aspects of the images:
1. Lighting
2. Colors
3. Shapes
4. Textures
5. Emotions
6. Taste or smell
7. Sounds
8. Temperature
9. Movement
Based on this analysis, choose the image that best matches the impressions.
Explain your reasoning, noting specific details from the impressions that correspond to elements in the chosen image.
Also, provide a confidence level (low, medium, or high) for your judgment. Respond via a JSON object with the following format:
{
  "chosen_image": "${this.IMAGE_A} or ${this.IMAGE_B}",
  "confidence_level": "low, medium, or high",
  "reasoning": "Explanation of reasoning"
}`;
    }

    private extractResponseText(response: Anthropic.Messages.Message): string {
        return response.content
            .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
            .map(block => block.text)
            .join("\n");
    }

    private handleResponse(responseText: string): number {
        // Select the section from the first "{" to the last "}"
        const parsedJson = extractJson(responseText);
        if (parsedJson.chosen_image === this.IMAGE_A) {
            return 0;
        } else if (parsedJson.chosen_image === this.IMAGE_B) {
            return 1;
        }
        console.error("Invalid response from Claude Judge");
        return -1;
    }
}