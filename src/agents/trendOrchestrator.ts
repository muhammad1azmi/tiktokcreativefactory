import { LlmAgent } from "@google/adk";
import { createImageProtocolAgent } from "./imageProtocol";
import { createVideoProtocolAgent } from "./videoProtocol";
import { TREND_INSTRUCTIONS } from "./tools/imageTools";

export interface GenerationConfig {
    protocolType: "IMAGE" | "VIDEO";
    trendType: string;
    brandGuidelines?: string;
    primaryColor?: string;
    secondaryColor?: string;
    aspectRatio?: string;
    variantCount?: number;
    varianceFactors?: string[];
    useAIStoryline?: boolean;
    narrative?: string;
    videoLength?: string;
}

// Create the main TrendOrchestrator agent
export function createTrendOrchestrator(config: GenerationConfig) {
    const { trendType, protocolType } = config;

    // Get trend-specific instructions
    const trendInstructions = TREND_INSTRUCTIONS[trendType as keyof typeof TREND_INSTRUCTIONS]
        || TREND_INSTRUCTIONS["standard-promo"];

    // Build the system instruction based on trend and protocol
    const systemInstruction = buildSystemInstruction(config, trendInstructions);

    // Create the appropriate sub-agent based on protocol type
    const protocolAgent = protocolType === "IMAGE"
        ? createImageProtocolAgent(trendType)
        : createVideoProtocolAgent(trendType);

    // Create the orchestrator agent
    const trendOrchestrator = new LlmAgent({
        name: "trend_orchestrator",
        model: "gemini-2.5-flash",
        description: "Main orchestrator that applies trend-based modifications and delegates to protocol agents",
        instruction: systemInstruction,
        subAgents: [protocolAgent],
    });

    return trendOrchestrator;
}

function buildSystemInstruction(
    config: GenerationConfig,
    trendInstructions: { image: string; video: string }
): string {
    const { protocolType, trendType, brandGuidelines, primaryColor, secondaryColor } = config;

    const baseInstruction = `You are the TrendOrchestrator - the main coordinator for TikTok content generation.

Your role is to:
1. Apply trend-specific creative modifications to all generation requests
2. Ensure brand guidelines are followed throughout the process
3. Coordinate with the ${protocolType.toLowerCase()} protocol agent to execute generation
4. Validate outputs meet quality and consistency standards

## Current Trend: ${trendType?.toUpperCase() || 'STANDARD-PROMO'}
${protocolType === "IMAGE" ? trendInstructions.image : trendInstructions.video}

## Brand Configuration
${brandGuidelines ? `Brand Guidelines: ${brandGuidelines}` : "No specific brand guidelines provided - use professional defaults."}
${primaryColor ? `Primary Color: ${primaryColor}` : ""}
${secondaryColor ? `Secondary Color: ${secondaryColor}` : ""}

## Protocol: ${protocolType}
`;

    // Add trend-specific behavior modifications
    const trendBehavior = getTrendBehavior(trendType, protocolType);

    return baseInstruction + "\n\n## Trend-Specific Behavior\n" + trendBehavior;
}

function getTrendBehavior(trendType: string, protocolType: string): string {
    const behaviors: Record<string, Record<string, string>> = {
        "reali-tea": {
            IMAGE: `- Order the image agent to generate "unpolished, high-detail macro shots"
- Embrace imperfections and natural lighting variations
- Avoid overly processed or studio-perfect aesthetics
- Include slight grain and candid angles for authenticity`,
            VIDEO: `- Order the video agent to use "Handheld shaky-cam" motion
- The camera should feel human-operated with natural pacing
- Avoid smooth robotic motion - embrace subtle movements
- Audio should feel ambient and natural`,
        },
        "emotional-roi": {
            IMAGE: `- Order the image agent to prioritize "Golden Hour lighting"
- Use "Soft textures" and dreamy bokeh effects
- Create emotionally resonant compositions
- Warm color grading for aspirational feel`,
            VIDEO: `- Order the video agent to generate "Native ASMR audio"
- Include satisfying sounds: clicks, pours, fabric rustles
- Slow, meditative camera movements
- Audio should trigger sensory pleasure`,
        },
        "curiosity-detours": {
            IMAGE: `- Order a "Visual Plot Twist" workflow
- Frame 1: Product looks like one thing
- Frame 2: Reveal its true form/power
- Create intrigue that stops scrolling`,
            VIDEO: `- Build suspense with strategic reveals
- Start with mystery or misdirection
- Dramatic unveiling of product capability
- Use cuts to maximize curiosity`,
        },
        "go-analogue": {
            IMAGE: `- Apply film grain and nostalgic color grading
- Think vintage Polaroid, 35mm film, or VHS
- Connect product to analog craftsmanship
- Timeless aesthetic over trendy`,
            VIDEO: `- Use vintage camera movements
- Slow zooms, film-era pans, retro transitions
- Add subtle analog artifacts (light leaks, film grain)
- Classic cinematography feel`,
        },
        "standard-promo": {
            IMAGE: `- Create clean, polished professional imagery
- Perfect lighting and composition
- Crisp details and balanced exposure
- Commercial-grade quality for purchase intent`,
            VIDEO: `- Execute smooth cinematic orbits
- Elegant camera: orbit, push-in, top-down sweep
- Professional pacing with fluid motion
- Premium advertisement quality`,
        },
    };

    return behaviors[trendType]?.[protocolType] || behaviors["standard-promo"][protocolType];
}

// Export for use in API route
export { createImageProtocolAgent } from "./imageProtocol";
export { createVideoProtocolAgent } from "./videoProtocol";
export { TREND_INSTRUCTIONS } from "./tools/imageTools";
