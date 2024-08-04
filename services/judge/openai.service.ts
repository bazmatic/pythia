import { IJudgeProvider } from "@/types";
import dotenv from "dotenv";
import fs from "fs/promises";
import OpenAI from "openai";

dotenv.config();

export class OpenAIJudgeProvider implements IJudgeProvider {
    private openai: OpenAI;
    private readonly IMAGE_A = "image_1111";
    private readonly IMAGE_B = "0x4444";

    constructor() {
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set in the environment variables");
        }
        this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
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

        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageABuffer.toString("base64")}`
                            }
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBBuffer.toString("base64")}`
                            }
                        },
                        {
                            type: "text",
                            text: this.generatePrompt(psychicImpressions)
                        }
                    ]
                }
            ],
            max_tokens: 1024
        });

        const responseText = response.choices[0]?.message?.content;

        if (!responseText) {
            throw new Error("No text response received");
        }

        return this.parseResponse(responseText);
    }

    private generatePrompt(psychicImpressions: string): string {
        return `I've uploaded two images: "${this.IMAGE_A}" and "${this.IMAGE_B}".

Here are the psychic impressions for one of these images:

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

    private parseResponse(responseText: string): number {
        try {
            const parsedJson = JSON.parse(responseText);
            console.log(parsedJson);
            if (parsedJson.chosen_image === this.IMAGE_A) {
                return 0;
            } else if (parsedJson.chosen_image === this.IMAGE_B) {
                return 1;
            }
            console.error("Invalid response from OpenAI");
            return -1;
        } catch (error) {
            console.error(`Invalid response: ${responseText}`, error);
            return -1;
        }
    }
}