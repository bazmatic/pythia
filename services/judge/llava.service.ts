import { extractJson, IJudgeProvider } from "@/types";
import axios from "axios";
import fs from "fs";
import path from "path";
import _ from "lodash";

export class LlavaJudgeProvider implements IJudgeProvider {
    private readonly ollamaEndpoint: string;
    private readonly IMAGE_A = "llava_image_1111";
    private readonly IMAGE_B = "llava_image_0x4444";
    private promptTemplate: string;

    constructor(
        ollamaEndpoint: string = "http://127.0.0.1:11434/api/generate"
    ) {
        this.ollamaEndpoint = ollamaEndpoint;
        this.promptTemplate = this.loadPromptTemplate();
    }

    private loadPromptTemplate() {
        const templatePath = path.join(process.cwd(), 'prompts', 'llava_analysis_prompt.txt');
        return fs.readFileSync(templatePath, 'utf-8');
    }

    async provideJudgement(
        imageAPath: string,
        imageBPath: string,
        psychicImpressions: string
    ): Promise<number> {
        console.log("Uploading images and analyzing with Llava model...");
        const imageABuffer = fs.readFileSync(imageAPath);
        const imageBBuffer = fs.readFileSync(imageBPath);

        const base64ImageA = imageABuffer.toString("base64");
        const base64ImageB = imageBBuffer.toString("base64");

        const response = await this.queryWithNamedImages(
            base64ImageA,
            base64ImageB,
            psychicImpressions
        );
        console.log("Ready to process response", response);
        return this.processResponse(response);
    }

    private async queryWithNamedImages(
        base64ImageA: string,
        base64ImageB: string,
        psychicImpressions: string
    ): Promise<string> {
        const introPrompt = `I'm going to show you two images. The first image is named "${this.IMAGE_A}" and the second image is named "${this.IMAGE_B}".`;
        const imageAPrompt = `This is image "${this.IMAGE_A}". Simply respond with the text "OK" to continue.`;
        const imageBPrompt = `This is image "${this.IMAGE_B}". Simply respond with the text "OK" to continue.`;
        const analysisPrompt = this.generateAnalysisPrompt(psychicImpressions);
        const payload: any = {
            model: "llava"
        };

        try {
            // Send first image
            payload.prompt = `${introPrompt}\n${imageAPrompt}`;
            payload.images = [base64ImageA];
            await this.sendRequest(payload);

            // Send second image
            payload.prompt = `${imageBPrompt}`;
            payload.images = [base64ImageB];
            await this.sendRequest(payload);

            // Send analysis prompt
            payload.prompt = analysisPrompt;
            payload.images = [];
            const response = await this.sendRequest(payload);
            return response;
        } catch (error) {
            console.error("Error in queryWithNamedImages:", error);
            throw error;
        }
    }

    private async sendRequest(payload: any): Promise<string> {
        try {
            const response = await axios.post(this.ollamaEndpoint, payload, {
                headers: { "Content-Type": "application/json" },
                responseType: "stream"
            });

            let fullResponse = "";
            for await (const chunk of response.data) {
                const lines = chunk.toString().split("\n");
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsedChunk = JSON.parse(line);
                            if (parsedChunk.response) {
                                fullResponse += parsedChunk.response;
                            }
                        } catch (error) {
                            console.error("Error parsing chunk:", error);
                        }
                    }
                }
            }

            return fullResponse.trim();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Axios error:", error.message);
                if (error.response) {
                    console.error("Response data:", error.response.data);
                    console.error("Response status:", error.response.status);
                }
            } else {
                console.error("Unexpected error:", error);
            }
            throw new Error("Failed to query Llava model");
        }
    }

    private processResponse(responseText: string): number {
        console.log("processResponse: ", responseText);
        const json = extractJson(responseText);
        if (!json) {
            throw new Error("Failed to parse JSON response");
        }
        console.log("Parsed JSON:", json);
        if (json.chosen_image === this.IMAGE_A) {
            return 0;
        } else if (json.chosen_image === this.IMAGE_B) {
            return 1;
        }
        throw new Error(`Invalid chosen_image value: ${json.chosen_image}`);
    }

    private generateAnalysisPrompt(impressions: string): string {
        return _.template(this.promptTemplate)({
            IMAGE_A: this.IMAGE_A,
            IMAGE_B: this.IMAGE_B,
            IMPRESSIONS: impressions
        });
    }
}