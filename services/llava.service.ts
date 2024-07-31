import axios from "axios";
import fs from "fs";
import { parse } from "path";

export class LlavaService {
    private readonly ollamaEndpoint: string;

    constructor(
        ollamaEndpoint: string = "http://127.0.0.1:11434/api/generate"
    ) {
        this.ollamaEndpoint = ollamaEndpoint;
    }

    async chat(prompt: string): Promise<string> {
        const payload = {
            model: "llama3",
            prompt: prompt,
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
            throw new Error("Failed to chat with Llava model");
        }
    }
		
    async queryWithImages(imagePaths: string[], prompt: string): Promise<string> {
        // Read the image file and convert it to base64
		const base64Images = [];
		for (const imagePath of imagePaths) {
			const imageBuffer = fs.readFileSync(imagePath);
			const base64Image = imageBuffer.toString("base64");
			base64Images.push(base64Image);
		}

        const payload = {
            model: "llava",
            prompt: prompt,
            images: base64Images
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

	// async forcedChoice(images: string[], prompt: string): Promise<{ choice: number; score: number }> {
    //     const choicePrompt = `You are acting as a simple image analysis API. Given the following images, choose the one that best matches the prompt. Respond with the index of the image (0-indexed) and a confidence score from 1 to 1000. The prompt is: {{{${prompt}}}}. Respond only with the index and the score, separated by a pipe symbol (|), e.g., "1|238". Do not return anything else.`;
        
    //     try {
    //         const response = await this.queryWithImages(images, choicePrompt);
    //         console.log("Response from Llava:", response);
            
    //         const [indexStr, scoreStr] = response.split("|");
    //         const index = parseInt(indexStr, 10);
    //         const score = parseFloat(scoreStr);

    //         if (isNaN(index) || isNaN(score) || index < 0 || index >= images.length || score < 1 || score > 1000) {
    //             throw new Error("Invalid response format or values from Llava for forced choice");
    //         }

    //         return { choice: index, score };
    //     } catch (error) {
    //         console.error("Error in forcedChoice:", error);
    //         throw error;
    //     }
    // }

	// async forcedChoiceInWords(images: string[], prompt: string): Promise<{ choice: string; score: number }> {
	// 	const choicePrompt = `You are acting as a simple image analysis API. Given the following images, choose the one that best matches the prompt. Respond with the index of the image (0-indexed) and a confidence score from 1 to 1000. The prompt is: {{{${prompt}}}}. Respond only with the name and the score, separated by a pipe symbol (|), e.g., "image1|238". Do not return anything else.`;
		
	// 	try {
	// 		const response = await this.queryWithImages(images, choicePrompt);
	// 		console.log("Response from Llava:", response);
			
	// 		const [choice, scoreStr] = response.split("|");
	// 		const score = parseFloat(scoreStr);

	// 		if (isNaN(score) || choice === undefined || score < 1 || score > 1000) {
	// 			throw new Error("Invalid response format or values from Llava for forced choice");
	// 		}

	// 		return { choice, score };
	// 	} catch (error) {
	// 		console.error("Error in forcedChoiceInWords:", error);
	// 		throw error;
	// 	}
	// }

    // async forcedChoiceRepeated(images: string[], prompt: string, iterations: number): Promise<{ bestChoice: number; confidence: number; allResults: { [key: number]: { totalScore: number; count: number } } }> {
    //     const results: { [key: number]: { totalScore: number; count: number } } = {};

    //     for (let i = 0; i < iterations; i++) {
    //         try {
    //             const { choice, score } = await this.forcedChoice(images, prompt);
    //             if (!results[choice]) {
    //                 results[choice] = { totalScore: 0, count: 0 };
    //             }
    //             results[choice].totalScore += score;
    //             results[choice].count++;
    //         } catch (error) {
    //             console.error(`Error in iteration ${i + 1}:`, error);
    //             // Optionally, you might want to break the loop or handle the error differently
    //         }
    //     }

    //     let bestChoice = -1;
    //     let highestAvgScore = -1;
    //     let totalValidIterations = 0;

    //     for (const [choice, { totalScore, count }] of Object.entries(results)) {
    //         totalValidIterations += count;
    //         const avgScore = totalScore / count;
    //         if (avgScore > highestAvgScore) {
    //             highestAvgScore = avgScore;
    //             bestChoice = parseInt(choice, 10);
    //         }
    //     }

    //     const confidence = totalValidIterations > 0 ? (results[bestChoice]?.count || 0) / totalValidIterations : 0;

    //     return {
    //         bestChoice,
    //         confidence,
    //         allResults: results
    //     };
    // }
    async scoreRelevance(
        imagePath: string,
        impressionText: string
    ): Promise<number> {
  
   		const analysisPrompt = 'Describe the image in detail, including any objects, people, or actions that are present.\n\
		Mention any colors, shapes, or patterns that are visible. Describe colours, smells, sounds, and textures.\n\
		Describe the lighting and the overall mood of the image.\n\
		Explain how the elements of the image relate to each other and how they contribute to the overall composition.';
		const analysis = await this.queryWithImages([imagePath], analysisPrompt);
        
		const prompt = '"""You are acting as a simple image analysis API. You specialise in picking up on the "vibe".\n\
		Image Description is an image which the user is trying to see under difficult circumstances.\n\
		User Description is their impression of what they saw.\n\
		It is possible that they saw this image, but it was very distorted or vague.\n\
		So, given these two pieces of text, decide how closely they relate to each other, and reply with only a floating point number between 0 and 1000 that represents how likely the user might have seen a distorted version of the image described in Image Description.\n\
		0 means there is no chance and 1000 means it is a perfect.\n\
		Be as accurate as possible. If the two pieces of text share similar elements or themes, that should increase the score.\n\
		Generally, you will never give a 0 or a 1000, but rather a score in between based on subtle similarities.\n\
		Image Description: {{{' + analysis + '}}}\nUser Description: {{{' + impressionText + '}}} Respond only with a number and nothing else."""';
		
		console.log(prompt);
		const response = await this.chat(prompt);
		console.log("Response from Llava:", response);
		// Escape the text to ensure the JSON parse will succeed, looking for ' chars
		
		// Trim everything before the first '{' character and after the last '}' character
		// to ensure that the JSON parse will succeed
		// The response is a JSON object, so it should start and end with curly braces
		// If it doesn't, it's not a valid JSON object
		// const firstBrace = response.indexOf('{');
		// const lastBrace = response.lastIndexOf('}');
		// if (firstBrace === -1 || lastBrace === -1) {
		// 	console.error("Invalid response from Llava");
		// 	return 0;
		// }
		// // Extract the JSON object from the response
		// const json = response.substring(firstBrace, lastBrace + 1);
		// // Remove carriage returns and newlines
		// const cleanedJson = json.replace(/[\r\n]/g, "");
		// Parse the JSON object

        //const result = JSON.parse(cleanedJson);

		//const score = result.score;
		const score = parseFloat(response);

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