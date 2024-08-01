// services/imageService.ts

import fs from "fs";
import path from "path";

export class ImageService {
    private imagePath: string;

    constructor() {
        this.imagePath = path.join(process.cwd(), "public", "images");
        this.ensureImageDirectoryExists();
    }

    private ensureImageDirectoryExists(): void {
        if (!fs.existsSync(this.imagePath)) {
            fs.mkdirSync(this.imagePath, { recursive: true });
        }
    }

    public getRandomName(): string {
        const allImages: string[] = fs
            .readdirSync(this.imagePath)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

        if (allImages.length === 0) {
            throw new Error("No images found in the image directory");
        }

        const randomIndex = Math.floor(Math.random() * allImages.length);
        return allImages[randomIndex];
    }

    public getRandomImageNameList(count: number): string[] {
        const randomNames: string[] = [];
        while (randomNames.length < count) {
            const name = this.getRandomName();
            if (!randomNames.includes(name)) {
                randomNames.push(name);
            }
        }

        return randomNames;
    }

    // getImageUrl(filename: string): string {
    //   return `/images/${filename}`;
    // }

    getImagePath(filename: string): string {
        return path.join(this.imagePath, filename);
    }
}

const imageService = new ImageService();
export default imageService;
