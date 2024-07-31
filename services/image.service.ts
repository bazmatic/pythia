// services/imageService.ts

import fs from 'fs';
import path from 'path';

export class ImageService {
  private imagePath: string;

  constructor() {
    this.imagePath = path.join(process.cwd(), 'public', 'images');
    this.ensureImageDirectoryExists();
  }

  private ensureImageDirectoryExists(): void {
    if (!fs.existsSync(this.imagePath)) {
      fs.mkdirSync(this.imagePath, { recursive: true });
    }
  }

  public getRandomImageUrls(count: number): string[] {
    const allImages: string[] = fs.readdirSync(this.imagePath)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    
    const selectedImages: string[] = [];
    for (let i = 0; i < count; i++) {
      if (allImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * allImages.length);
        selectedImages.push(allImages[randomIndex]);
        allImages.splice(randomIndex, 1);
      }
    }

    return selectedImages.map(filename => this.getImageUrl(filename));
  }

  getImageUrl(filename: string): string {
    return `/images/${filename}`;
  }
}

const imageService = new ImageService();
export default imageService;