import { LlavaService } from './llava.service';

export class JudgeService {
  private llavaService: LlavaService;

  constructor(ollemaEndpoint?: string) {
    this.llavaService = new LlavaService(ollemaEndpoint);
  }

  // Given a list of image paths, return the index of the image that best matches the impression text
  async judge(images: string[], impressionText: string): Promise<number> {
    const scores = await Promise.all(images.map(image => this.calculateScore(image, impressionText)));
    
    // Find the index of the image with the highest score
    return scores.indexOf(Math.max(...scores));
  }

  // Given an image path and impression text, calculate a score of how well the text matches the image
  public async calculateScore(imagePath: string, impressionText: string): Promise<number> {
    //const prompt = `Given the following impression: "${impressionText}", rate how relevant this image is on a scale of 0 to 10, where 0 is not relevant at all and 10 is extremely relevant. Please respond with only the number.`;
    
    try {
      const score = await this.llavaService.judgeRelevance(imagePath, impressionText);  
      if (isNaN(score) || score < 0 || score > 1) {
        console.warn(`Invalid score received from Llava for image`);
        return 0;
      }
      
      return score;
    } catch (error) {
      console.error(`Error calculating score for image ${imagePath}:`, error);
      return 0;
    }
  }
}

// Create a single instance to be used across the application
const judgeService = new JudgeService();

export default judgeService;