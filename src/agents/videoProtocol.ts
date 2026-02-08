import { LlmAgent, SequentialAgent } from "@google/adk";
import { videoTools } from "./tools/videoTools";
import { TREND_INSTRUCTIONS } from "./tools/imageTools";

// Create the Video Protocol Agent for generating video loops
export function createVideoProtocolAgent(trendType: string) {
    const trendInstructions = TREND_INSTRUCTIONS[trendType as keyof typeof TREND_INSTRUCTIONS]
        || TREND_INSTRUCTIONS["standard-promo"];

    // Step 1: Process Anchor Image and Storyline
    const processAnchorAgent = new LlmAgent({
        name: "process_anchor",
        model: "gemini-2.5-flash",
        description: "Processes the anchor image and interprets the storyline for video generation",
        instruction: `You are a video pre-processor for Veo 3.0.
    
    Analyze the anchor/hero image and interpret the user's narrative/storyline:
    1. Identify the product's key features to highlight
    2. Determine optimal camera path based on the storyline
    3. Plan the motion sequence that best showcases the product
    4. Consider the product's material for audio suggestions
    
    Apply these trend-specific instructions:
    ${trendInstructions.video}
    
    Prepare the instructions for video generation, maintaining 100% product fidelity.`,
        outputKey: "anchor_analysis",
    });

    // Step 2: Generate Video Loop
    const generateVideoAgent = new LlmAgent({
        name: "generate_video_loop",
        model: "gemini-2.5-flash",
        description: "Generates the core video loop from the anchor image",
        instruction: `You are a video loop generator using Veo 3.0 protocol.
    
    Based on the anchor analysis in {anchor_analysis}, generate a seamless video loop.
    
    CRITICAL INSTRUCTION: "Maintain 100% product fidelity. The product must remain perfectly consistent throughout the entire video duration."
    
    Use the 'generate_video_loop' tool with:
    - The anchor image URL
    - The specified duration (6s, 8s, or 15s)
    - The target aspect ratio
    - The interpreted narrative for movement logic
    
    Apply trend-specific motion style:
    ${trendInstructions.video}`,
        tools: [videoTools[0]], // generateVideoLoop
        outputKey: "base_video",
    });

    // Step 3: Add Camera Motion
    const addMotionAgent = new LlmAgent({
        name: "add_camera_motion",
        model: "gemini-2.5-flash",
        description: "Applies cinematic camera movements to the video",
        instruction: `You are a camera motion specialist.
    
    Based on the trend style and narrative, apply the appropriate camera movement:
    
    For "reali-tea": Use handheld-shake motion with high intensity
    For "emotional-roi": Use slow-zoom with gentle push-in
    For "curiosity-detours": Use dynamic reveal motions
    For "go-analogue": Use vintage-style slow pans and zooms
    For "standard-promo": Use smooth orbit or top-down-sweep
    
    Use the 'add_camera_motion' tool with the appropriate settings.
    Animate cinematic camera movements (orbit, push-in, or top-down sweep) around the product.`,
        tools: [videoTools[1]], // addCameraMotion
        outputKey: "motion_video",
    });

    // Step 4: Generate ASMR Audio (Conditional on trend)
    const generateAudioAgent = new LlmAgent({
        name: "generate_asmr_audio",
        model: "gemini-2.5-flash",
        description: "Generates satisfying ASMR audio effects for the video",
        instruction: `You are an ASMR audio specialist.
    
    Based on the product material and the trend style, generate native AI audio:
    
    For "emotional-roi": MUST generate ASMR audio (clicks, pours, or fabric rustles)
    For other trends: Generate appropriate ambient or satisfying sounds
    
    Analyze the product to determine its material properties:
    - Glass: tapping, clinking sounds
    - Leather: soft creaking, texture sounds
    - Fabric: rustling, soft friction
    - Metal: satisfying clicks, smooth slides
    - Liquid: pouring, bubbling sounds
    
    Use the 'generate_asmr_audio' tool to create appropriate sounds.
    Request native AI audio generation for 'Satisfying/ASMR' sound effects related to the product material.`,
        tools: [videoTools[2]], // generateASMRAudio
        outputKey: "audio_track",
    });

    // Step 5: Composite Final Video
    const compositeVideoAgent = new LlmAgent({
        name: "composite_final",
        model: "gemini-2.5-flash",
        description: "Composites all elements into the final TikTok-ready video",
        instruction: `You are a video compositor.
    
    Combine all generated elements into the final output:
    1. The motion video from {motion_video}
    2. The ASMR audio track from {audio_track}
    3. Any brand overlays if specified
    
    Use 'composite_final_video' to create the final output:
    - Auto-crop to 1080x1920 (9:16) for TikTok
    - Ensure audio syncs with visual
    - Apply any final color grading
    
    Output format should be MP4 optimized for social media.`,
        tools: [videoTools[4]], // compositeFinalVideo
        outputKey: "final_video",
    });

    // Create the sequential pipeline
    const videoProtocolAgent = new SequentialAgent({
        name: "video_protocol",
        description: "Complete video loop generation pipeline using Veo 3.0 protocol",
        subAgents: [
            processAnchorAgent,
            generateVideoAgent,
            addMotionAgent,
            generateAudioAgent,
            compositeVideoAgent,
        ],
    });

    return videoProtocolAgent;
}
