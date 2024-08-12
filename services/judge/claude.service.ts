import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { IJudgeProvider } from "@/types";
import _ from "lodash";
import { extractJson } from "@/utils";

dotenv.config();

export class ClaudeJudgeProvider implements IJudgeProvider {
    private client: Anthropic;
    private readonly IMAGE_A = "image_1111";
    private readonly IMAGE_B = "0x4444";
    private promptTemplate: string;

    constructor() {
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not set in the environment variables");
        }
        this.client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
        this.promptTemplate = this.loadPromptTemplate();
    }

    private loadPromptTemplate() {
        const templatePath = path.join(process.cwd(), 'prompts', 'analysis_prompt.txt');
        return fs.readFileSync(templatePath, 'utf-8');
    }

    async provideJudgement(
        imageAPath: string,
        imageBPath: string,
        psychicImpressions: string
    ): Promise<number> {
        const [imageABuffer, imageBBuffer] = await Promise.all([
            fs.promises.readFile(imageAPath),
            fs.promises.readFile(imageBPath)
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

    private generatePrompt(impressions: string): string {
        return _.template(this.promptTemplate)({
            IMAGE_A: this.IMAGE_A,
            IMAGE_B: this.IMAGE_B,
            IMPRESSIONS: impressions
        });
    }

    private extractResponseText(response: Anthropic.Messages.Message): string {
        return response.content
            .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
            .map(block => block.text)
            .join("\n");
    }

    private handleResponse(responseText: string): number {
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