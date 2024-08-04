//import { uploadImagesAndAnalyze } from "./claude.service";
import { IJudgeProvider } from "@/types";

export class JudgeService {
    private judgeCount: number;
    constructor(private judgeProvider: IJudgeProvider) {
        this.judgeCount = process.env.JUDGE_COUNT ? parseInt(process.env.JUDGE_COUNT) : 1;
    }

    // Given a list of image paths, return the index of the image that best matches the impression text
    async judge(
        imagesPaths: string[],
        impressionText: string
    ): Promise<number> {
        // Judge the impression judgeCount times
        const results = await Promise.all(
            Array.from({ length: this.judgeCount }, async () => {
                return await this.judgeProvider.uploadImagesAndAnalyze(
                    imagesPaths[0],
                    imagesPaths[1],
                    impressionText
                );
            })
        );

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
