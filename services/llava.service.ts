import { extractJson, IJudgeProvider } from "@/types";
import axios from "axios";
import fs from "fs";

export class LlavaJudgeProvider implements IJudgeProvider {
    private readonly ollamaEndpoint: string;
    private readonly IMAGE_A = "llava_image_1111";
    private readonly IMAGE_B = "llava_image_0x4444";

    constructor(
        ollamaEndpoint: string = "http://127.0.0.1:11434/api/generate"
    ) {
        this.ollamaEndpoint = ollamaEndpoint;
    }

    async uploadImagesAndAnalyze(
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
        console.log("Ready to process reponse", response);
        return this.processResponse(response);
    }

    private async queryWithNamedImages(
        base64ImageA: string,
        base64ImageB: string,
        psychicImpressions: string
    ): Promise<string> {
        const introPrompt = `I'm going to show you two images. The first image is named "${this.IMAGE_A}" and the second image is named "${this.IMAGE_B}".`;
        const imageAPrompt = `This is image "${this.IMAGE_A}". Please describe it in detail:`;
        const imageBPrompt = `This is image "${this.IMAGE_B}". Please describe it in detail:`;
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
        debugger;
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

    private generateAnalysisPrompt(psychicImpressions: string): string {
        return `Now that you've seen both images, please analyze the following psychic impressions and determine which image they most closely match:

${psychicImpressions}

Based on your analysis, choose the image that best matches the impressions.
Explain your reasoning, noting specific details from the impressions that correspond to elements in the chosen image.
Also, provide a confidence level (low, medium, or high) for your judgment.

Respond with a JSON object in the following format:
{
  "chosen_image": "${this.IMAGE_A} or ${this.IMAGE_B}",
  "confidence_level": "low, medium, or high",
  "reasoning": "Explanation of reasoning"
}

Provide only the JSON object in your response, without any additional text.`;
    }
}
