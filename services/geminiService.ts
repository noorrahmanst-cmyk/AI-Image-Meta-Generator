import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A short, catchy, and descriptive title for the asset (5-10 words), in title case. For example: 'Majestic Ornamental Tiger Walking Through Stylized Jungle'."
        },
        description: {
            type: Type.STRING,
            description: "A detailed paragraph describing the asset's content, style, and mood. Suitable for stock photo websites."
        },
        keywords: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
            description: "An array of 10-15 relevant keywords or tags, including concepts, objects, and style. For example: 'illustration', 'vector', 'business', 'teamwork'."
        },
        adobeStockCategory: {
            type: Type.STRING,
            description: "Suggest a single, best-fitting category for this asset if it were uploaded to Adobe Stock. E.g., 'Business', 'Animals', 'Technology'."
        },
        shutterstockCategory: {
            type: Type.STRING,
            description: "Suggest a single, best-fitting category for this asset if it were uploaded to Shutterstock. E.g., 'Abstract', 'Beauty/Fashion', 'Industrial'."
        },
        vecteezyCategory: {
            type: Type.STRING,
            description: "Suggest a single, best-fitting category for this asset if it were uploaded to Vecteezy. E.g., 'Backgrounds', 'Icons', 'Nature'."
        },
        one23rfCategory: {
            type: Type.STRING,
            description: "Suggest a single, best-fitting category for this asset if it were uploaded to 123RF. E.g., 'Lifestyle', 'Healthcare/Medical', 'Sports/Recreation'."
        },
        dreamstimeCategory: {
            type: Type.STRING,
            description: "Suggest a single, best-fitting category for this asset if it were uploaded to Dreamstime. E.g., 'Editorial', 'Travel', 'Objects'."
        },
    },
    required: ["title", "description", "keywords", "adobeStockCategory", "shutterstockCategory", "vecteezyCategory", "one23rfCategory", "dreamstimeCategory"]
};


export const analyzeImage = async (imageFile: File, isVector: boolean): Promise<GeneratedData> => {
    const originalExtension = imageFile.name.split('.').pop() || 'jpg';
    
    let prompt: string;
    let contents: any;

    if (isVector) {
        prompt = `
            The user has uploaded a vector file named "${imageFile.name}". 
            Based on this filename, generate metadata for it as a stock asset (suitable for formats like AI, EPS, SVG).
            Infer the content from the filename. For example, if the name is 'business-team-meeting.ai', the content is about a business meeting.
            Provide a title (in title case), a detailed description, a list of keywords, and also suggest the best category for this asset on each of the following stock websites: Adobe Stock, Shutterstock, Vecteezy, 123RF, and Dreamstime.
        `;
        contents = prompt;
    } else {
        const imagePart = await fileToGenerativePart(imageFile);
        prompt = `
            Analyze this visual asset (image or video frame) and generate metadata for it as a stock asset (suitable for formats like AI, EPS, SVG, JPEG, PNG, MP4). 
            Provide a title (in title case), a detailed description, a list of keywords, and also suggest the best category for this asset on each of the following stock websites: Adobe Stock, Shutterstock, Vecteezy, 123RF, and Dreamstime.
        `;
        contents = { parts: [imagePart, { text: prompt }] };
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const parsedData = JSON.parse(response.text);

        // Programmatically create the filename from the title to ensure they are identical.
        if (parsedData.title) {
            parsedData.filename = `${parsedData.title}.${originalExtension}`;
        }
        
        return parsedData as GeneratedData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a valid response from the AI model.");
    }
};