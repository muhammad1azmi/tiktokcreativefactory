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

// ===== STRUCTURED PROMPT BUILDER =====

export interface StructuredPromptParams {
    // Section 2: Reference Images Interaction (Optional)
    referenceImageInteraction?: string;
    referenceImageCount: number;

    // Section 3: Creative Trend (Optional)
    creativeTrend?: {
        type: "preset" | "ai-generated" | "skip";
        presetId?: string;
        customPrompt?: string;
    };

    // Section 4: Brand Guidelines (Required)
    brandGuidelines: string;

    // Section 5: Color Palette (Required)
    primaryColor: string;
    secondaryColor: string;

    // Section 6: Moodboard (Optional)
    moodboardImageCount: number;
    moodboardStartIndex: number;

    // Section 7: Aspect Ratio (Required)
    aspectRatio: "9:16" | "1:1" | "4:5" | "16:9";

    // Section 8: Variations (For Variants 2-10)
    variantNumber?: number;
    variationSpecs?: {
        lighting?: string;
        environment?: string;
        cameraAngle?: string;
        materials?: string;
    };
}

// Creative Trend Presets - imported from JSON for easy editing
import creativeTrendPresetsData from "./creative-trend-presets.json";

// Build presets object from JSON
export const CREATIVE_TREND_PRESETS: Record<string, { name: string; prompt: string }> =
    creativeTrendPresetsData.presets.reduce((acc, preset) => {
        acc[preset.id] = { name: preset.name, prompt: preset.prompt };
        return acc;
    }, {} as Record<string, { name: string; prompt: string }>);

// Export for UI usage
export const CREATIVE_TREND_PRESET_LIST = creativeTrendPresetsData.presets;

// Video Creative Trend Presets - optimized for 8-second format
import videoCreativeTrendPresetsData from "./video-creative-trend-presets.json";

// Build video presets object from JSON
export const VIDEO_CREATIVE_TREND_PRESETS: Record<string, { name: string; prompt: string }> =
    videoCreativeTrendPresetsData.presets.reduce((acc, preset) => {
        acc[preset.id] = { name: preset.name, prompt: preset.prompt };
        return acc;
    }, {} as Record<string, { name: string; prompt: string }>);

// Export for UI usage
export const VIDEO_CREATIVE_TREND_PRESET_LIST = videoCreativeTrendPresetsData.presets;

// ===== VIDEO STRUCTURED PROMPT SYSTEM =====

export type ReferenceImagePurpose = "character" | "product" | "environment" | "keyframe" | "style-guide" | "custom";

export interface VideoReferenceImage {
    index: number; // 1, 2, or 3
    purpose: ReferenceImagePurpose;
    customDescription?: string; // For custom purpose
}

export interface VideoPromptParams {
    // Section 1: Reference Images (Up to 3, triggers 8-second limit)
    referenceImages: VideoReferenceImage[];

    // Section 2: Creative Trend (Optional)
    creativeTrend?: {
        type: "preset" | "ai-generated" | "skip";
        presetId?: string;
        customPrompt?: string;
    };

    // Section 3: Brand Guidelines (Required)
    brandGuidelines: string;

    // Section 4: Color Palette (Required)
    primaryColor: string;
    secondaryColor: string;

    // Section 5: Narrative / Storyline (Required - Most Important)
    narrative: string;
    narrativeTemplate?: "quick-reveal" | "transformation" | "vlog-moment" | "feature-highlight" | "satisfying-loop" | "custom";

    // Section 6: Aspect Ratio & Duration (Required)
    aspectRatio: "9:16" | "1:1" | "16:9";
    duration: "4s" | "6s" | "8s"; // Auto-locked to 8s when reference images present
}

/**
 * Build a structured video prompt following the Veo 3.1 template format
 * Optimized for 8-second constraint when using reference images
 */
export function buildVideoStructuredPrompt(params: VideoPromptParams): string {
    const sections: string[] = [];
    const hasReferenceImages = params.referenceImages.length > 0;
    const effectiveDuration = hasReferenceImages ? "8s" : params.duration;

    // ===== SECTION 1: Reference Images =====
    if (hasReferenceImages) {
        const imageDescriptions = params.referenceImages.map(img => {
            const purposeLabels: Record<ReferenceImagePurpose, string> = {
                "character": "Main influencer/character",
                "product": "Product to be featured",
                "environment": "Brand environment/location",
                "keyframe": "Key visual moment",
                "style-guide": "Visual style reference",
                "custom": img.customDescription || "Custom reference"
            };
            return `[image ${img.index}] - ${purposeLabels[img.purpose]}`;
        }).join("\n");

        sections.push(`REFERENCE IMAGES:
${imageDescriptions}

These images serve as visual anchors for character consistency, environment design, and key visual moments throughout the 8-second video sequence.

NOTE: Due to reference image constraints, this video is optimized for 8-second duration with focused, impactful storytelling.`);
    }

    // ===== SECTION 2: Creative Trend (Optional) =====
    if (params.creativeTrend?.type === "preset" && params.creativeTrend.presetId) {
        const preset = VIDEO_CREATIVE_TREND_PRESETS[params.creativeTrend.presetId];
        if (preset) {
            sections.push(`CREATIVE TREND:
${preset.prompt}`);
        }
    } else if (params.creativeTrend?.type === "ai-generated" && params.creativeTrend.customPrompt) {
        sections.push(`CREATIVE TREND:
${params.creativeTrend.customPrompt}`);
    }

    // ===== SECTION 3: Brand Guidelines (Required) =====
    const brandGuidelinesContent = params.brandGuidelines || `Maintain professional, modern brand aesthetic with clean compositions and premium quality.

DO:
- Maintain consistent brand presence throughout ${effectiveDuration} video
- Use smooth, professional camera movements
- Ensure clear product/brand visibility in key frames
- Keep pacing energetic and focused (no wasted frames)

DON'T:
- Attempt complex multi-scene narratives (time too limited)
- Use slow, lingering shots (must maximize ${effectiveDuration})
- Obscure brand elements with effects or transitions`;

    sections.push(`BRAND GUIDELINES:
${brandGuidelinesContent}`);

    // ===== SECTION 4: Color Palette (Required) =====
    sections.push(`COLOR PALETTE:
Primary Color: ${params.primaryColor}
Secondary Color: ${params.secondaryColor}

Apply these colors consistently throughout the entire ${effectiveDuration} video sequence. The primary color should dominate the color scheme across all frames, with the secondary color as a supporting accent.

Color Application (${effectiveDuration} format):
- Establish color palette immediately in opening frame
- Maintain consistent color grading across all ${effectiveDuration.replace('s', '')} seconds
- Use primary color in lighting design where appropriate
- Apply color palette to animated elements and motion graphics`);

    // ===== SECTION 5: Narrative / Storyline (Required - Most Important) =====
    const durationSeconds = parseInt(effectiveDuration.replace('s', ''));
    const narrativeGuidance = hasReferenceImages ? `

Structure the narrative to include (within 8 seconds):
- Opening hook (0-2 seconds) - Immediate visual interest
- Core moment/action (2-6 seconds) - Main content or transformation
- Payoff/conclusion (6-8 seconds) - Resolution or call-to-action

Keep scenes minimal, transitions quick or nonexistent, and focus on single impactful moment.` : '';

    sections.push(`NARRATIVE / STORYLINE:
${params.narrative}${narrativeGuidance}`);

    // ===== SECTION 6: Video Specifications (Required) =====
    const aspectGuidance: Record<string, string> = {
        "9:16": `9:16 (Vertical/TikTok, Reels, Shorts): Optimize for vertical mobile viewing with key action in center-upper frame. Subject should fill frame appropriately. Ideal for portrait-oriented content and full-screen mobile engagement. ${durationSeconds}-second format perfect for snackable TikTok content.`,
        "1:1": `1:1 (Square/Instagram Feed): Balanced, centered composition. Works well for product showcases and symmetrical framing. Ensure important elements stay within safe zone. ${durationSeconds}-second duration ideal for looping Instagram feed content.`,
        "16:9": `16:9 (Landscape/YouTube, Horizontal): Cinematic widescreen composition. Utilize horizontal space efficiently within ${durationSeconds}-second timeframe. Use rule of thirds for subject placement. Ideal for YouTube Shorts introductory clips.`
    };

    const durationNote = hasReferenceImages
        ? "Duration: 8 seconds (reference image constraint with Google Veo 3.1)"
        : `Duration: ${effectiveDuration}`;

    sections.push(`VIDEO SPECIFICATIONS:
Generate video in ${params.aspectRatio} aspect ratio.
${durationNote}

${aspectGuidance[params.aspectRatio] || aspectGuidance["9:16"]}

Framing Guidelines:
- Establish framing immediately in first frame (no time for slow reveals)
- Maintain consistent framing throughout camera movements
- Ensure subject/product remains properly framed during motion
- Account for platform-specific safe zones
- Design for potential looping (${durationSeconds}-second videos often auto-loop on platforms)`);

    // Join all sections with clear separators
    return sections.join("\n\n---\n\n");
}

/**
 * Generate a video creative trend prompt from user description using AI
 * Optimized for 8-second video format
 */
export async function generateVideoCreativeTrendFromDescription(description: string): Promise<string> {
    const client = getClient();

    const systemPrompt = `You are a creative director for TikTok/Instagram video content. Your job is to transform a brief description into a detailed creative direction for AI video generation.

Given a user's description of a video trend, generate a DETAILED creative prompt that includes:
1. Visual Style - Animation style, movement quality, color treatment
2. Camera Motion - Specific camera movements (smooth, handheld, cinematic, etc.)
3. Pacing & Rhythm - How the video should flow (MUST be optimized for 8-second format)
4. Transitions - Minimal due to time constraint, quick cuts preferred
5. Motion Graphics - Quick, clear effects if applicable

CRITICAL: All directions must be achievable within an 8-second timeframe. Focus on single impactful moments, not complex multi-scene narratives.

Output ONLY the creative direction text, no additional explanation or formatting.`;

    const userPrompt = `Transform this video trend description into a detailed video generation prompt optimized for 8 seconds:

"${description}"

Generate a comprehensive creative direction that an AI video generator can follow to create stunning short-form content.`;

    console.log("[GenAI] Generating video creative trend from description...");

    try {
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 800,
            }
        });

        const generatedTrend = response.text?.trim() || "";
        console.log("[GenAI] Generated video creative trend:", generatedTrend.substring(0, 100) + "...");
        return generatedTrend;
    } catch (error) {
        console.error("[GenAI] Error generating video creative trend:", error);
        throw new Error("Failed to generate video creative trend from description");
    }
}


/**
 * Build a structured prompt following the template format
 * Sections are clearly labeled and separated for optimal AI understanding
 */
export function buildStructuredPrompt(params: StructuredPromptParams): string {
    const sections: string[] = [];

    // ===== SECTION 2: Reference Images Interaction (Optional) =====
    if (params.referenceImageInteraction && params.referenceImageCount > 1) {
        sections.push(`REFERENCE IMAGES INTERACTION:
${params.referenceImageInteraction}

Composition Requirements:
- Ensure seamless integration between referenced elements
- Match lighting, perspective, and scale across combined elements
- Blend edges naturally to avoid obvious compositing
- Maintain consistent depth of field and atmospheric perspective
- Preserve the quality and detail of key elements from each referenced image`);
    }

    // ===== SECTION 3: Creative Trend (Optional) =====
    if (params.creativeTrend?.type === "preset" && params.creativeTrend.presetId) {
        const preset = CREATIVE_TREND_PRESETS[params.creativeTrend.presetId];
        if (preset) {
            sections.push(`CREATIVE TREND:
${preset.prompt}`);
        }
    } else if (params.creativeTrend?.type === "ai-generated" && params.creativeTrend.customPrompt) {
        sections.push(`CREATIVE TREND:
${params.creativeTrend.customPrompt}`);
    }

    // ===== SECTION 4: Brand Guidelines (Required) =====
    sections.push(`BRAND GUIDELINES:
${params.brandGuidelines || "Maintain professional, modern brand aesthetic with clean compositions and premium quality."}`);

    // ===== SECTION 5: Color Palette (Required) =====
    sections.push(`COLOR PALETTE:
Primary Color: ${params.primaryColor}
Secondary Color: ${params.secondaryColor}

Use these colors as the dominant color scheme throughout the composition. The primary color should be the most prominent, with secondary color as supporting accent.`);

    // ===== SECTION 6: Look & Feel Reference (Optional) =====
    if (params.moodboardImageCount > 0) {
        const moodboardRefs = Array.from(
            { length: params.moodboardImageCount },
            (_, i) => `[image ${params.moodboardStartIndex + i + 1}]`
        ).join(", ");

        sections.push(`LOOK & FEEL REFERENCE (MOODBOARD):
Draw inspiration from the visual style shown in ${moodboardRefs}. These images establish the desired mood, lighting quality, composition approach, and aesthetic treatment. Emulate the color grading, atmospheric qualities, texturing methods, and overall visual language present in these references while adapting them to the creative concept.`);
    }

    // ===== SECTION 7: Aspect Ratio (Required) =====
    const aspectGuidance: Record<string, string> = {
        "9:16": "Optimize for vertical mobile viewing with focal point in upper-middle third",
        "1:1": "Balanced, centered composition suitable for Instagram feed",
        "4:5": "Slightly vertical composition with breathing room at top and bottom",
        "16:9": "Cinematic wide composition with horizontal emphasis"
    };

    sections.push(`IMAGE SPECIFICATIONS:
Generate image in ${params.aspectRatio} aspect ratio.
${aspectGuidance[params.aspectRatio] || ""}`);

    // ===== SECTION 8: Variations (For Variants 2-10) =====
    if (params.variantNumber && params.variantNumber > 1 && params.variationSpecs) {
        const variationParts: string[] = [];

        if (params.variationSpecs.lighting) {
            variationParts.push(`Lighting: ${params.variationSpecs.lighting}`);
        }
        if (params.variationSpecs.environment) {
            variationParts.push(`Environment: ${params.variationSpecs.environment}`);
        }
        if (params.variationSpecs.cameraAngle) {
            variationParts.push(`Camera Angle: ${params.variationSpecs.cameraAngle}`);
        }
        if (params.variationSpecs.materials) {
            variationParts.push(`Materials: ${params.variationSpecs.materials}`);
        }

        if (variationParts.length > 0) {
            sections.push(`VARIATION SPECIFICATIONS FOR VARIANT #${params.variantNumber}:

${variationParts.join("\n\n")}`);
        }
    }

    // Join all sections with clear separators
    return sections.join("\n\n---\n\n");
}

/**
 * Generate a creative trend prompt from a user description using AI
 * This uses Gemini Flash to create a detailed, structured creative direction
 */
export async function generateCreativeTrendFromDescription(description: string): Promise<string> {
    const client = getClient();

    const systemPrompt = `You are a creative director for TikTok/Instagram content. Your job is to transform a brief description into a detailed creative direction for AI image generation.

Given a user's description of a creative trend, generate a DETAILED creative prompt that includes:
1. Visual Style - Specific artistic direction (lighting, colors, textures, mood)
2. Composition - How elements should be arranged and framed
3. Atmosphere - The emotional feel and vibe of the image
4. Technical Details - Camera perspective, depth of field, special effects

Keep the output focused, actionable, and designed for product photography/promotional content.
Output ONLY the creative direction text, no additional explanation or formatting.`;

    const userPrompt = `Transform this creative trend description into a detailed image generation prompt:

"${description}"

Generate a comprehensive creative direction that an AI image generator can follow to create stunning product visuals.`;

    console.log("[GenAI] Generating creative trend from description...");

    try {
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 800,
            }
        });

        const generatedTrend = response.text?.trim() || "";
        console.log("[GenAI] Generated creative trend:", generatedTrend.substring(0, 100) + "...");
        return generatedTrend;
    } catch (error) {
        console.error("[GenAI] Error generating creative trend:", error);
        throw new Error("Failed to generate creative trend from description");
    }
}

/**
 * Variation specification interface for generated variants
 */
export interface VariationSpec {
    lighting: string;
    environment: string;
    cameraAngle: string;
    materials: string;
}

/**
 * Generate unique variation specifications for multiple variants using AI
 * This creates diverse but cohesive variations for variants 2-10
 */
export async function generateVariationSpecs(
    baseCreativeDirection: string,
    brandGuidelines: string,
    varianceFactors: string[],
    variantCount: number
): Promise<VariationSpec[]> {
    // If only 1 variant or no variance factors, return empty array
    if (variantCount <= 1 || varianceFactors.length === 0) {
        return [];
    }

    const client = getClient();

    // Build the factors to vary
    const factorsToVary = varianceFactors.map(f => {
        switch (f) {
            case "lighting": return "Lighting style and mood";
            case "environment": return "Background/environment setting";
            case "camera-angle": return "Camera angle and perspective";
            case "materials": return "Material textures and surface treatments";
            default: return f;
        }
    }).join(", ");

    const systemPrompt = `You are a creative director specializing in product photography variations. Your job is to generate unique, cohesive variation specifications for a series of product images.

Each variation should be distinct but maintain brand consistency. Output ONLY a valid JSON array with no additional text or markdown formatting.`;

    const userPrompt = `Generate ${variantCount - 1} unique variation specifications for product images.

BASE CREATIVE DIRECTION:
${baseCreativeDirection}

BRAND GUIDELINES:
${brandGuidelines || "Professional, modern brand aesthetic"}

FACTORS TO VARY: ${factorsToVary}

Generate a JSON array of variation objects. Each object MUST have these exact keys:
- "lighting": Specific lighting description (e.g., "soft diffused morning light with gentle shadows")
- "environment": Background/setting description (e.g., "minimalist white studio with subtle gradient")
- "cameraAngle": Camera perspective (e.g., "eye-level front view with slight 15-degree tilt")
- "materials": Surface/texture emphasis (e.g., "matte surfaces with soft velvet undertones")

Make each variation distinctly different while maintaining brand cohesion.
Output ONLY the JSON array, no explanation or markdown code blocks.

Example format:
[{"lighting":"...","environment":"...","cameraAngle":"...","materials":"..."}]`;

    console.log(`[GenAI] Generating ${variantCount - 1} variation specs...`);

    try {
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.9,
                topP: 0.95,
                maxOutputTokens: 2000,
            }
        });

        const responseText = response.text?.trim() || "[]";
        console.log("[GenAI] Raw variation specs response:", responseText.substring(0, 200) + "...");

        // Parse JSON, handling potential markdown code blocks
        let cleanJson = responseText;
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
        }

        const variations: VariationSpec[] = JSON.parse(cleanJson);
        console.log(`[GenAI] Generated ${variations.length} variation specs`);
        return variations;
    } catch (error) {
        console.error("[GenAI] Error generating variation specs:", error);
        // Return fallback variations
        return generateFallbackVariations(variantCount - 1, varianceFactors);
    }
}

/**
 * Generate fallback variations when AI generation fails
 */
function generateFallbackVariations(count: number, factors: string[]): VariationSpec[] {
    const lightingOptions = [
        "soft natural lighting with diffused shadows",
        "dramatic studio lighting with high contrast",
        "golden hour glow with warm rim lighting",
        "cool blue tones with ethereal atmosphere",
        "warm ambient light with subtle gradients"
    ];
    const environmentOptions = [
        "minimal white background with clean aesthetic",
        "textured natural backdrop with organic elements",
        "lifestyle setting with contextual props",
        "abstract gradient background with modern feel",
        "outdoor environment with natural lighting"
    ];
    const cameraOptions = [
        "eye-level front view for direct engagement",
        "slight overhead angle at 15 degrees",
        "low angle hero shot creating empowerment",
        "dynamic 3/4 view with depth",
        "top-down flat lay composition"
    ];
    const materialOptions = [
        "matte surfaces with soft texture",
        "glossy reflective surfaces with subtle highlights",
        "textured organic materials with natural grain",
        "metallic accents with premium finish",
        "soft fabric textures with gentle folds"
    ];

    const variations: VariationSpec[] = [];
    for (let i = 0; i < count; i++) {
        variations.push({
            lighting: factors.includes("lighting") ? lightingOptions[i % lightingOptions.length] : "standard studio lighting",
            environment: factors.includes("environment") ? environmentOptions[i % environmentOptions.length] : "clean studio background",
            cameraAngle: factors.includes("camera-angle") ? cameraOptions[i % cameraOptions.length] : "standard product angle",
            materials: factors.includes("materials") ? materialOptions[i % materialOptions.length] : "natural product materials"
        });
    }
    return variations;
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
        const videoFile = generatedVideo.video!;

        // Use SDK download (handles authentication) then convert to base64
        // This works on all cloud platforms
        const outputDir = ensureOutputDir();
        const filePath = path.join(outputDir, fileName);

        console.log("[GenAI] Downloading video using SDK (authenticated)...");
        await client.files.download({
            file: videoFile,
            downloadPath: filePath,
        });
        console.log("[GenAI] Video downloaded:", filePath);

        // Read file and convert to base64 data URL
        const videoData = fs.readFileSync(filePath);
        const dataUrl = `data:video/mp4;base64,${videoData.toString("base64")}`;
        console.log("[GenAI] Converted to data URL, length:", dataUrl.length);

        // Clean up temp file (optional, helps with disk space)
        try {
            fs.unlinkSync(filePath);
        } catch {
            // Ignore cleanup errors
        }

        return {
            type: "video",
            filePath: dataUrl,  // Return data URL for cloud compatibility
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
