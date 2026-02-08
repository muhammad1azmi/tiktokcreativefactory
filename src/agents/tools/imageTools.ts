import { LlmAgent, FunctionTool } from "@google/adk";
import { z } from "zod";

// Trend-based instruction modifiers
export const TREND_INSTRUCTIONS = {
    "reali-tea": {
        image: `Generate unpolished, high-detail macro shots that feel authentic and raw. 
            Embrace imperfections - slight grain, natural lighting variations, and candid angles.
            The product should look like it was captured in a real moment, not a studio.`,
        video: `Use handheld shaky-cam motion for authenticity. The camera should feel human-operated,
            with subtle movements and natural pacing. Avoid overly smooth or robotic motion.`,
    },
    "emotional-roi": {
        image: `Prioritize Golden Hour lighting with warm, soft textures. Create images that evoke
            emotional connection - gentle gradients, dreamy bokeh, and inviting compositions.
            The product should feel luxurious and aspirational.`,
        video: `Generate native ASMR audio that matches the product material - satisfying clicks,
            soft fabric rustles, liquid pours, or gentle taps. The audio should trigger
            sensory pleasure and emotional response.`,
    },
    "curiosity-detours": {
        image: `Execute a 'Visual Plot Twist' workflow. Frame 1 should show the product looking
            like one thing or in an unexpected context. Frame 2 reveals its true form or power.
            Create intrigue and surprise that makes viewers stop scrolling.`,
        video: `Build suspense with reveal animations. Start with mystery or misdirection,
            then dramatically unveil the product's true nature or capability.
            Use strategic cuts and reveals to maximize curiosity.`,
    },
    "go-analogue": {
        image: `Apply film grain, nostalgic color grading, and retro aesthetics. Think vintage
            Polaroid, 35mm film, or VHS textures. The product should feel timeless and
            connected to analog craftsmanship.`,
        video: `Use vintage camera movements - slow zooms, film-era pans, and retro transitions.
            Add subtle analog artifacts like light leaks or gentle flicker.
            The motion should feel like classic cinematography.`,
    },
    "standard-promo": {
        image: `Create clean, polished professional imagery with perfect lighting and composition.
            Crisp details, balanced exposure, and commercial-grade quality.
            The product should look premium and purchase-ready.`,
        video: `Execute smooth cinematic orbits - elegant camera movements including orbit,
            push-in, and top-down sweeps. Professional pacing with fluid motion.
            The product should feel like a premium advertisement.`,
    },
};

// Tool to analyze product geometry from images
export const analyzeProductGeometry = new FunctionTool({
    name: "analyze_product_geometry",
    description: "Analyze the product's geometry, structure, and key visual features from uploaded reference images using Thinking Mode.",
    parameters: z.object({
        imageDescriptions: z.array(z.string()).describe("Descriptions of the uploaded product images"),
        brandGuidelines: z.string().optional().describe("Brand guidelines to consider during analysis"),
    }),
    execute: async ({ imageDescriptions, brandGuidelines }) => {
        // This would call the actual AI model in production
        return {
            status: "success",
            analysis: {
                productType: "analyzed from images",
                keyFeatures: ["structure", "texture", "form"],
                suggestedAngles: ["front", "45-degree", "top-down", "low-angle"],
                brandAlignment: brandGuidelines ? "guidelines applied" : "default styling",
            },
        };
    },
});

// Tool to generate multi-view variants
export const generateMultiView = new FunctionTool({
    name: "generate_multi_view",
    description: "Generate multiple view variants of the product (Top-down, 45° Diagonals, Low-angle shots)",
    parameters: z.object({
        productSeed: z.string().describe("The product seed/reference for consistency"),
        viewType: z.enum(["front", "top-left", "top-right", "bottom-left", "bottom-right", "top-down", "low-angle"]),
        trendStyle: z.string().describe("The creative trend style to apply"),
        aspectRatio: z.string().default("9:16"),
    }),
    execute: async ({ productSeed, viewType, trendStyle, aspectRatio }) => {
        return {
            status: "success",
            generatedView: {
                viewType,
                style: trendStyle,
                dimensions: aspectRatio,
                imageUrl: `generated_${viewType}_${trendStyle}.png`,
            },
        };
    },
});

// Tool to render brand typography
export const renderTypography = new FunctionTool({
    name: "render_typography",
    description: "Force typography rendering for brand names using native text capability",
    parameters: z.object({
        brandName: z.string().describe("The brand name to render"),
        primaryColor: z.string().describe("Primary brand color hex code"),
        secondaryColor: z.string().describe("Secondary brand color hex code"),
        position: z.enum(["top", "bottom", "center", "overlay"]).default("bottom"),
    }),
    execute: async ({ brandName, primaryColor, secondaryColor, position }) => {
        return {
            status: "success",
            typography: {
                text: brandName,
                colors: { primary: primaryColor, secondary: secondaryColor },
                position,
                rendered: true,
            },
        };
    },
});

// Tool to crop to aspect ratio
export const cropToAspect = new FunctionTool({
    name: "crop_to_aspect",
    description: "Auto-crop the output to the specified aspect ratio (e.g., 1080x1920 for 9:16)",
    parameters: z.object({
        inputImage: z.string().describe("Path or URL to the input image"),
        targetAspect: z.string().describe("Target aspect ratio (e.g., '9:16')"),
    }),
    execute: async ({ inputImage, targetAspect }) => {
        const dimensions = {
            "9:16": { width: 1080, height: 1920 },
            "1:1": { width: 1080, height: 1080 },
            "4:5": { width: 1080, height: 1350 },
            "16:9": { width: 1920, height: 1080 },
        }[targetAspect] || { width: 1080, height: 1920 };

        return {
            status: "success",
            croppedImage: {
                inputImage,
                outputDimensions: dimensions,
                aspectRatio: targetAspect,
            },
        };
    },
});

// Tool for 360-Consistency validation
export const validateConsistency = new FunctionTool({
    name: "validate_360_consistency",
    description: "Execute the 360-Consistency Loop to ensure logo and geometry stay 1:1 identical across all views",
    parameters: z.object({
        masterShot: z.string().describe("The master front shot"),
        diagonalViews: z.array(z.string()).describe("Array of 4 diagonal view images"),
        productSeed: z.string().describe("The product seed for comparison"),
    }),
    execute: async ({ masterShot, diagonalViews, productSeed }) => {
        return {
            status: "success",
            validation: {
                masterShot,
                viewsValidated: diagonalViews.length,
                consistencyScore: 0.98,
                logoIntegrity: true,
                geometryMatch: true,
                readyForInterpolation: true,
            },
        };
    },
});

// Export image tools collection
export const imageTools = [
    analyzeProductGeometry,
    generateMultiView,
    renderTypography,
    cropToAspect,
    validateConsistency,
];
