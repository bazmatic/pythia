
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import _ from "lodash";
import path from "path";
import { extractJson } from "@/utils";
import { injectable } from "inversify";
import { IJudgeProvider } from "@/types";

dotenv.config();
@injectable()
export class OpenAIJudgeProvider implements IJudgeProvider {
    private openai: OpenAI;
    private readonly IMAGE_A = "image_1111";
    private readonly IMAGE_B = "0x4444";
    private promptTemplate: string;

    constructor() {
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set in the environment variables");
        }
        this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
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

        const prompt = this.generatePrompt(psychicImpressions);

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
                            text: prompt
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
        return _.template(this.promptTemplate)({
            IMAGE_A: this.IMAGE_A,
            IMAGE_B: this.IMAGE_B,
            IMPRESSIONS: psychicImpressions
        });
    }

    private parseResponse(responseText: string): number {
        try {
            console.log(`Parsing response: ${responseText}`);
            const parsedJson = extractJson(responseText);
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