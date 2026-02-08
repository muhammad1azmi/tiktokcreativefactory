import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Model IDs from environment
const IMAGE_MODEL = process.env.IMAGE_MODEL_ID || "gemini-3-pro-image-preview";
const VIDEO_MODEL = process.env.VIDEO_MODEL_ID || "veo-3.1-generate-preview";

// Get API key
function getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY must be set in .env.local");
    }
    return apiKey;
}

// Create client using API key directly
function getClient(): GoogleGenAI {
    const apiKey = getApiKey();
    console.log("[GenAI] Using Gemini API with API key");
    return new GoogleGenAI({ apiKey });
}

export interface ImageGenerationParams {
    prompt: string;
    referenceImages?: Buffer[];
    aspectRatio?: string;
    numberOfImages?: number;
}

export interface VideoGenerationParams {
    prompt: string;
    anchorImages?: Buffer[];
    duration?: string;
    aspectRatio?: string;
}

export interface GenerationResult {
    type: "image" | "video";
    filePath: string;
    fileName: string;
    mimeType: string;
}

// Ensure output directory exists
function ensureOutputDir(): string {
    const outputDir = path.join(process.cwd(), "public", "generated");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    return outputDir;
}

// Generate unique filename
function generateFileName(type: "image" | "video", extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${type}_${timestamp}_${random}.${extension}`;
}

/**
 * Generate images using Gemini (Nano Banana Pro)
 * Returns base64 data URL for Vercel compatibility (no filesystem access)
 */
export async function generateImage(params: ImageGenerationParams): Promise<GenerationResult> {
    const { prompt, referenceImages } = params;

    console.log("=".repeat(50));
    console.log("[GenAI] Generating image with:", IMAGE_MODEL);

    const client = getClient();

    // Build parts array
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add reference images first
    if (referenceImages && referenceImages.length > 0) {
        console.log("[GenAI] Including", referenceImages.length, "reference images");
        for (const imageBuffer of referenceImages) {
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: imageBuffer.toString("base64"),
                },
            });
        }
    }

    // Add prompt
    parts.push({ text: prompt });

    try {
        console.log("[GenAI] Calling API...");

        const response = await client.models.generateContent({
            model: IMAGE_MODEL,
            contents: [{ role: "user", parts }],
            config: {
                responseModalities: ["IMAGE", "TEXT"],
            },
        });

        console.log("[GenAI] Got response, candidates:", response.candidates?.length);

        // Look for image in response
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.mimeType?.startsWith("image/")) {
                    console.log("[GenAI] Found image!");

                    const mimeType = part.inlineData.mimeType;
                    const base64Data = part.inlineData.data!;
                    const fileName = generateFileName("image", "png");

                    // Return base64 data URL (works on Vercel - no filesystem needed)
                    const dataUrl = `data:${mimeType};base64,${base64Data}`;

                    console.log("[GenAI] Returning data URL, length:", dataUrl.length);

                    return {
                        type: "image",
                        filePath: dataUrl,  // This is now a data URL, not a file path
                        fileName,
                        mimeType,
                    };
                }

                if (part.text) {
                    console.log("[GenAI] Model said:", part.text.substring(0, 500));
                }
            }
        }

        throw new Error("Model did not return an image.");
    } catch (error: unknown) {
        console.error("[GenAI] Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Image generation failed: ${errorMessage}`);
    }
}

/**
 * Generate video using Veo 3.1
 * Uses async polling since video generation takes time
 * Returns base64 data URL for Vercel compatibility
 */
export async function generateVideo(params: VideoGenerationParams): Promise<GenerationResult> {
    const { prompt, anchorImages, aspectRatio = "9:16" } = params;

    console.log("=".repeat(50));
    console.log("[GenAI] Generating video with:", VIDEO_MODEL);
    console.log("[GenAI] Prompt:", prompt.substring(0, 100) + "...");

    const client = getClient();

    try {
        // Start video generation - use images if provided
        let operation;

        if (anchorImages && anchorImages.length > 0) {
            console.log(`[GenAI] Using ${anchorImages.length} reference image(s) for video generation`);
            // Image-to-video generation with up to 3 reference images
            // Veo 3.1 supports multiple reference images
            const referenceImages = anchorImages.slice(0, 3).map(img => ({
                imageBytes: img.toString("base64"),
                mimeType: "image/png",
            }));

            operation = await client.models.generateVideos({
                model: VIDEO_MODEL,
                prompt: prompt,
                // Use first image as primary, pass additional context in prompt
                image: referenceImages[0],
                config: {
                    aspectRatio: aspectRatio,
                },
            });
        } else {
            // Text-to-video generation
            operation = await client.models.generateVideos({
                model: VIDEO_MODEL,
                prompt: prompt,
                config: {
                    aspectRatio: aspectRatio,
                },
            });
        }

        console.log("[GenAI] Video generation started, polling for completion...");

        // Poll until done (max 5 minutes)
        const maxWaitTime = 300000; // 5 minutes
        const pollInterval = 10000; // 10 seconds
        let elapsed = 0;

        while (!operation.done && elapsed < maxWaitTime) {
            console.log(`[GenAI] Waiting for video... (${elapsed / 1000}s elapsed)`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            elapsed += pollInterval;

            operation = await client.operations.getVideosOperation({
                operation: operation,
            });
        }

        if (!operation.done) {
            throw new Error("Video generation timed out after 5 minutes");
        }

        console.log("[GenAI] Video generation complete!");

        // Get the generated video
        if (!operation.response?.generatedVideos?.[0]?.video) {
            throw new Error("No video in response");
        }

        const generatedVideo = operation.response.generatedVideos[0];
        const fileName = generateFileName("video", "mp4");

        // Get video as base64 for Vercel compatibility
        // The video object should have a uri we can fetch
        const videoFile = generatedVideo.video!;

        // Try to get the video data as base64
        let dataUrl: string;

        // Check if we have a URI to fetch from
        if (videoFile.uri) {
            console.log("[GenAI] Fetching video from URI:", videoFile.uri);
            const response = await fetch(videoFile.uri);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            dataUrl = `data:video/mp4;base64,${base64}`;
            console.log("[GenAI] Video data URL created, length:", dataUrl.length);
        } else if (videoFile.videoBytes) {
            // If we have the bytes directly
            console.log("[GenAI] Using video bytes directly");
            dataUrl = `data:video/mp4;base64,${videoFile.videoBytes}`;
        } else {
            // Fallback: try to download to temp and read (won't work on Vercel but useful for debugging)
            console.log("[GenAI] Warning: No URI or bytes available, video may not display on Vercel");
            const outputDir = ensureOutputDir();
            const filePath = path.join(outputDir, fileName);
            await client.files.download({
                file: videoFile,
                downloadPath: filePath,
            });
            // Read and convert to base64
            const videoData = fs.readFileSync(filePath);
            dataUrl = `data:video/mp4;base64,${videoData.toString("base64")}`;
            // Clean up temp file
            fs.unlinkSync(filePath);
        }

        console.log("[GenAI] Returning video data URL");

        return {
            type: "video",
            filePath: dataUrl,  // This is now a data URL
            fileName,
            mimeType: "video/mp4",
        };

    } catch (error: unknown) {
        console.error("[GenAI] Video generation error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Video generation failed: ${errorMessage}`);
    }
}

/**
 * Build trend-specific prompt
 */
export function buildTrendPrompt(
    basePrompt: string,
    trendType: string,
    contentType: "image" | "video"
): string {
    const modifiers: Record<string, Record<string, string>> = {
        "reali-tea": {
            image: "Create an authentic, unpolished macro shot with natural lighting.",
            video: "Use handheld camera motion that feels human-operated.",
        },
        "emotional-roi": {
            image: "Use Golden Hour lighting with warm textures and dreamy bokeh.",
            video: "Use slow, meditative camera movements.",
        },
        "curiosity-detours": {
            image: "Create a visual plot twist that stops scrolling.",
            video: "Build suspense with mystery and strategic reveals.",
        },
        "go-analogue": {
            image: "Apply vintage film grain and Polaroid color grading.",
            video: "Use slow zooms and film-era pans with light leaks.",
        },
        "standard-promo": {
            image: "Create clean, professional imagery with perfect lighting.",
            video: "Execute smooth cinematic camera movements.",
        },
    };

    const modifier = modifiers[trendType]?.[contentType] || modifiers["standard-promo"][contentType];
    return `${modifier}\n\n${basePrompt}`;
}

/**
 * Generate unique AI-powered storylines/creative concepts for each variant
 * Uses Gemini Flash for fast prompt generation
 */
export interface StorylineGenerationParams {
    trendType: string;
    brandGuidelines?: string;
    primaryColor?: string;
    secondaryColor?: string;
    varianceFactors?: string[];
    variantCount: number;
    productDescription?: string;
}

export async function generateAIStorylines(params: StorylineGenerationParams): Promise<string[]> {
    const {
        trendType,
        brandGuidelines,
        primaryColor,
        secondaryColor,
        varianceFactors,
        variantCount,
        productDescription,
    } = params;

    console.log("[GenAI] Generating AI storylines for", variantCount, "variants");

    const client = getClient();

    // Build the meta-prompt for generating creative concepts
    const trendDescriptions: Record<string, string> = {
        "reali-tea": "Raw, unpolished, authentic macro shots with natural imperfections",
        "emotional-roi": "Golden hour lighting, dreamy bokeh, emotionally resonant imagery",
        "curiosity-detours": "Visual plot twists, mystery reveals, scroll-stopping surprises",
        "go-analogue": "Vintage film grain, Polaroid aesthetics, retro nostalgia",
        "standard-promo": "Clean, polished, professional commercial imagery",
    };

    const trendDesc = trendDescriptions[trendType] || trendDescriptions["standard-promo"];

    const varianceDesc = varianceFactors && varianceFactors.length > 0
        ? `Vary these elements across concepts: ${varianceFactors.join(", ")}`
        : "Vary lighting, composition, and mood across concepts";

    const metaPrompt = `You are a creative director for TikTok product photography.

Generate exactly ${variantCount} UNIQUE creative concept descriptions for product images.
Each concept should be distinctly different in mood, composition, and visual approach.

## Trend Style: ${trendType.toUpperCase()}
${trendDesc}

## Brand Context
${brandGuidelines || "Professional, modern brand aesthetic"}
${primaryColor ? `Primary color: ${primaryColor}` : ""}
${secondaryColor ? `Secondary color: ${secondaryColor}` : ""}
${productDescription ? `Product: ${productDescription}` : ""}

## Requirements
${varianceDesc}
- Each concept should work for TikTok 9:16 vertical format
- Focus on scroll-stopping visual hooks
- Be specific about lighting, angles, textures, and mood
- Keep each concept to 2-3 sentences max

Output ONLY a JSON array of ${variantCount} strings, each being a complete creative prompt.
Example format: ["concept 1 description...", "concept 2 description...", "concept 3 description..."]`;

    try {
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: metaPrompt }] }],
            config: {
                responseMimeType: "application/json",
            },
        });

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        console.log("[GenAI] AI Storylines raw response:", responseText);

        // Parse the JSON array
        let storylines: string[];
        try {
            storylines = JSON.parse(responseText);
            if (!Array.isArray(storylines)) {
                throw new Error("Response is not an array");
            }
        } catch {
            console.error("[GenAI] Failed to parse storylines, using fallback");
            // Fallback: generate simple varied prompts
            storylines = Array.from({ length: variantCount }, (_, i) =>
                `Creative variant ${i + 1} in ${trendType} style with unique composition and lighting.`
            );
        }

        // Ensure we have exactly the right number
        while (storylines.length < variantCount) {
            storylines.push(`Additional creative variant in ${trendType} style with distinct visual approach.`);
        }
        storylines = storylines.slice(0, variantCount);

        console.log("[GenAI] Generated", storylines.length, "AI storylines");
        return storylines;

    } catch (error) {
        console.error("[GenAI] AI Storyline generation error:", error);
        // Return fallback prompts on error
        return Array.from({ length: variantCount }, (_, i) =>
            `Creative variant ${i + 1} in ${trendType} style. Professional composition optimized for TikTok.`
        );
    }
}
