import dotenv from "dotenv";
import fs from "fs/promises";
import OpenAI from "openai";

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    throw new Error(
        "OPENAI_API_KEY is not set in the environment variables"
    );
}
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

const IMAGE_A = "image_1111";
const IMAGE_B = "0x4444";

export async function uploadImagesAndAnalyze(
    imageAPath: string,
    imageBPath: string,
    psychicImpressions: string
): Promise<number> {
    // Read image files
    const [imageABuffer, imageBBuffer] = await Promise.all([
        fs.readFile(imageAPath),
        fs.readFile(imageBPath)
    ]);

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageABuffer.toString("base64")}`
                        }
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBBuffer.toString("base64")}`
                        }
                    },
                    {
                        type: "text",
                        text: `I've uploaded two images: "${IMAGE_A}" and "${IMAGE_B}".

Here are the psychic impressions for one of these images:

${psychicImpressions}

Please analyze these impressions and determine which image ("${IMAGE_A}" or "${IMAGE_B}") they most closely match.
Analyse the following aspects of the impressions:
1. Lighting
2. Colors
3. Shapes
4. Textures
5. Emotions
6. Taste or smell
7. Sounds
8. Temperature
9. Movement
Based on this analysis, choose the image that best matches the impressions.
Explain your reasoning, noting specific details from the impressions that correspond to elements in the chosen image.
Also, provide a confidence level (low, medium, or high) for your judgment. Respond via a JSON object with the following format:
{
  "chosen_image": "${IMAGE_A} or ${IMAGE_B}",
  "confidence_level": "low, medium, or high",
  "reasoning": "Explanation of reasoning"
}`
                    }
                ]
            }
        ],
        max_tokens: 1024
    });

    const responseText = response.choices[0]?.message?.content;

    if (!responseText) {
        throw new Error("No text response received");
    }
    try {
        const parsedJson = JSON.parse(responseText);
        console.log(parsedJson);
        if (parsedJson.chosen_image === IMAGE_A) {
            return 0;
        } else if (parsedJson.chosen_image === IMAGE_B) {
            return 1;
        }
        console.error("Invalid response from OpenAI");
        return -1;
    }
    catch (error) {
        console.error(`Invalid response: ${responseText}`, error);
        return -1;
    }

}