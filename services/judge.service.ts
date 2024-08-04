//import { uploadImagesAndAnalyze } from "./claude.service";
import { uploadImagesAndAnalyze } from "./openai.service";

export class JudgeService {
    constructor() {}

    // Given a list of image paths, return the index of the image that best matches the impression text
    async judge(
        imagesPaths: string[],
        impressionText: string
    ): Promise<number> {
        // Judge 3 times in parallel

        const results = await Promise.all([
            uploadImagesAndAnalyze(
                imagesPaths[0],
                imagesPaths[1],
                impressionText
            ),
            // uploadImagesAndAnalyze(
            //     imagesPaths[1],
            //     imagesPaths[0],
            //     impressionText
            // ),
            // uploadImagesAndAnalyze(
            //     imagesPaths[0],
            //     imagesPaths[1],
            //     impressionText
            // )
        ]);

		//If any of the responses was -1, warn that some responses were invalid
		const invalidResponseCount = results.filter(result => result === -1).length;
		if(invalidResponseCount > 0) {
			console.warn(`Warning: ${invalidResponseCount} invalid responses received.`);
		}

        // Return the result chosen the most times
        const frequencies = results.reduce(
            (acc, val) => {
                acc[val]++;
                return acc;
            },
            [0, 0, 0]
        );
        return frequencies.indexOf(Math.max(...frequencies));
    }
}

// Create a single instance to be used across the application
const judgeService = new JudgeService();

export default judgeService;
