
import { GoogleGenAI, Type } from "@google/genai";

/**
 * World-class initialization logic following SDK rules.
 * Creates a new instance right before making an API call to ensure it uses 
 * the most up-to-date API key from the environment or selection dialog.
 */
const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    // Check for various ways a missing key might manifest as a string
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
        throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey });
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: base64EncodedData,
            mimeType: file.type,
        },
    };
};

/**
 * Professional report generation using the Gemini Flash model.
 * Flash is used here to avoid quota exhaustion (429) while providing 
 * excellent speed and quality for institutional reports.
 */
export const generateReportSection = async (topic: string, structure?: string): Promise<string> => {
    try {
        const ai = getAIClient();
        let prompt = `Write a professional, detailed institutional report about: "${topic}".`;
        if (structure) {
            prompt += `\nStructure the report with these sections: ${structure}`;
        }
        prompt += `\nUse Markdown formatting. Use ## for headers, ### for sub-headers, and bullet points for lists.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                temperature: 0.7,
                topP: 0.95,
            }
        });

        return response.text || "Generated content was empty.";
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

/**
 * Intelligent metadata extraction from document images using the Flash model.
 */
export const extractCertificateInfo = async (file: File, customFields: string[]): Promise<any> => {
    try {
        const ai = getAIClient();
        const imagePart = await fileToGenerativePart(file);

        const properties: any = {};
        customFields.forEach(field => {
            const key = field.toLowerCase().replace(/\s+/g, '_');
            properties[key] = { type: Type.STRING, description: `The value for ${field} found in the document` };
        });

        const schema = {
            type: Type.OBJECT,
            properties: properties,
            required: Object.keys(properties),
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: `Extract the following details from this certificate/document image accurately: ${customFields.join(', ')}. Return the result in JSON format.` },
                    imagePart
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text?.trim() || "{}";
        return JSON.parse(jsonString);
    } catch (error: any) {
        console.error("Extraction error:", error);
        throw error;
    }
};
