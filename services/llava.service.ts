import axios from "axios";
import fs from "fs";

export class LlavaService {
    private readonly ollamaEndpoint: string;

    constructor(
        ollamaEndpoint: string = "http://127.0.0.1:11434/api/generate"
    ) {
        this.ollamaEndpoint = ollamaEndpoint;
    }

    async queryWithImage(imagePath: string, prompt: string): Promise<string> {
        // Read the image file and convert it to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        const payload = {
            model: "llava",
            prompt: prompt,
            images: [base64Image]
        };

        try {
            const response = await axios.post(this.ollamaEndpoint, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
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

	private async _judgeRelevance(image: string, impressionText: string, iterations: number): Promise<number> {
		let totalScore = 0;
		for (let i = 0; i < iterations; i++) {
			const score = await this.scoreRelevance(image, impressionText);
			totalScore += score;
		}
		return totalScore / iterations;
	}

	async judgeRelevance(image: string, impressionText: string): Promise<number> {
		return this._judgeRelevance(image, impressionText, 3);
	}

    async scoreRelevance(
        imagePath: string,
        impressionText: string
    ): Promise<number> {
        await this.testConnection();
        const prompt = 'You are acting as a simple image analysis API. Your input is "image" and "impressionText". Given those parameters, return a numeric score from 0 to 1000 of how relevant the "impressionText" is to the image. Be as accurate as possible. If the impressionText mentions some elements that are similar or related, that should increase the score. Respond only in JSON, in this format: `{ score: number, description: string }`, where score is your numeric score out of 1000, and description is your analysis of the similarities. Impression:  "${impressionText}"';

        const response = await this.queryWithImage(imagePath, prompt);
		console.log("Response from Llava:", response);
		// Escape the text to ensure the JSON parse will succeed, looking for ' chars
		
		// Trim everything before the first '{' character and after the last '}' character
		// to ensure that the JSON parse will succeed
		// The response is a JSON object, so it should start and end with curly braces
		// If it doesn't, it's not a valid JSON object
		const firstBrace = response.indexOf('{');
		const lastBrace = response.lastIndexOf('}');
		if (firstBrace === -1 || lastBrace === -1) {
			console.error("Invalid response from Llava");
			return 0;
		}
		// Extract the JSON object from the response
		const json = response.substring(firstBrace, lastBrace + 1);
		// Remove carriage returns and newlines
		const cleanedJson = json.replace(/[\r\n]/g, "");
		// Parse the JSON object

        const result = JSON.parse(cleanedJson);

		const score = result.score;

		if (isNaN(score) || score < 0 || score > 1000) {
			console.warn(`Invalid score received from Llava for image`);
			return 0;
		}
		return score / 1000;
    }

    async testConnection(): Promise<boolean> {
        try {
            await axios.get(
                this.ollamaEndpoint.replace("/api/generate", "/api/version")
            );
            return true;
        } catch (error) {
            console.error("Connection test failed:", error);
            return false;
        }
    }
}