import { uploadImagesAndAnalyze } from './claude.service';
import { LlavaService } from './llava.service';

export class JudgeService {


  constructor() {
  }

  // Given a list of image paths, return the index of the image that best matches the impression text
  async judge(imagesPaths: string[], impressionText: string): Promise<number> {

    return uploadImagesAndAnalyze(imagesPaths[0], imagesPaths[1], impressionText);

  }
}



// Create a single instance to be used across the application
const judgeService = new JudgeService();

export default judgeService;