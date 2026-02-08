import { LlmAgent, SequentialAgent } from "@google/adk";
import { imageTools, TREND_INSTRUCTIONS } from "./tools/imageTools";

// Create the Image Protocol Agent for generating multi-view images
export function createImageProtocolAgent(trendType: string) {
    const trendInstructions = TREND_INSTRUCTIONS[trendType as keyof typeof TREND_INSTRUCTIONS]
        || TREND_INSTRUCTIONS["standard-promo"];

    // Step 1: Analyze Product Geometry
    const analyzeGeometryAgent = new LlmAgent({
        name: "analyze_geometry",
        model: "gemini-2.5-flash",
        description: "Analyzes product geometry and structure from reference images",
        instruction: `You are a product geometry analyzer using Thinking Mode.
    
    Analyze the uploaded product images to understand:
    1. The product's 3D structure and form
    2. Key visual features and distinguishing elements
    3. Logo/brand placement and orientation
    4. Material textures and surface properties
    5. Optimal viewing angles for showcasing the product
    
    Use the 'analyze_product_geometry' tool to process the images and extract structural data.
    Store the analysis results for subsequent agents to use.`,
        tools: [imageTools[0]], // analyzeProductGeometry
        outputKey: "geometry_analysis",
    });

    // Step 2: Generate Master Shot
    const generateMasterShotAgent = new LlmAgent({
        name: "generate_master_shot",
        model: "gemini-2.5-flash",
        description: "Generates the master front-facing hero shot",
        instruction: `You are a master shot generator.
    
    Based on the geometry analysis in {geometry_analysis}, create the master front-facing hero shot of the product.
    
    Apply these trend-specific style instructions:
    ${trendInstructions.image}
    
    Use the 'generate_multi_view' tool with viewType: "front" to create the master shot.
    This master shot will be the reference for all diagonal variants.
    Store the result as the product seed for consistency.`,
        tools: [imageTools[1]], // generateMultiView
        outputKey: "master_shot",
    });

    // Step 3: Extract Product Seed
    const extractProductSeedAgent = new LlmAgent({
        name: "extract_product_seed",
        model: "gemini-2.5-flash",
        description: "Extracts a consistent product seed from the master shot",
        instruction: `You are a product consistency manager.
    
    From the master shot in {master_shot}, extract a 'Product Seed' that captures:
    1. Exact product geometry and proportions
    2. Logo position and rendering
    3. Color values and material properties
    4. Lighting direction and shadows
    
    This seed will be used to ensure all diagonal views maintain 1:1 consistency.
    Store the seed for use in diagonal generation.`,
        outputKey: "product_seed",
    });

    // Step 4: Generate Diagonal Views
    const generateDiagonalsAgent = new LlmAgent({
        name: "generate_diagonals",
        model: "gemini-2.5-flash",
        description: "Generates 4 diagonal view variants from the product seed",
        instruction: `You are a multi-view generator executing the 360-Consistency Loop.
    
    Using the product seed from {product_seed}, generate 4 diagonal variants:
    1. Top-Left (45° diagonal from above-left)
    2. Top-Right (45° diagonal from above-right)  
    3. Bottom-Left (45° diagonal from below-left)
    4. Bottom-Right (45° diagonal from below-right)
    
    Apply these trend-specific style instructions:
    ${trendInstructions.image}
    
    CRITICAL: Maintain 100% product fidelity - the logo and geometry must stay 1:1 identical across all views.
    Use the 'generate_multi_view' tool for each diagonal view.`,
        tools: [imageTools[1]], // generateMultiView
        outputKey: "diagonal_views",
    });

    // Step 5: Validate Consistency
    const validateConsistencyAgent = new LlmAgent({
        name: "validate_consistency",
        model: "gemini-2.5-flash",
        description: "Validates 360-consistency across all generated views",
        instruction: `You are a consistency validator.
    
    Verify that all 5 frames (master shot + 4 diagonals) maintain perfect consistency:
    1. Logo integrity - same size, position, and clarity
    2. Geometry match - identical product proportions
    3. Color consistency - matching color values
    4. Texture continuity - seamless material appearance
    
    Use the 'validate_360_consistency' tool to perform validation.
    If consistency score is below 0.95, flag for regeneration.`,
        tools: [imageTools[4]], // validateConsistency
        outputKey: "consistency_validation",
    });

    // Step 6: Apply Typography and Crop
    const finalizeImagesAgent = new LlmAgent({
        name: "finalize_images",
        model: "gemini-2.5-flash",
        description: "Applies brand typography and final cropping",
        instruction: `You are an image finalizer.
    
    For each validated image:
    1. Use 'render_typography' to add brand name if specified
    2. Use 'crop_to_aspect' to ensure perfect 9:16 (1080x1920) output
    
    Apply the brand colors from the input configuration.
    Ensure typography is legible and doesn't obscure key product features.`,
        tools: [imageTools[2], imageTools[3]], // renderTypography, cropToAspect
        outputKey: "final_images",
    });

    // Create the sequential pipeline
    const imageProtocolAgent = new SequentialAgent({
        name: "image_protocol",
        description: "Complete image slideshow generation pipeline using Nano Banana Pro protocol",
        subAgents: [
            analyzeGeometryAgent,
            generateMasterShotAgent,
            extractProductSeedAgent,
            generateDiagonalsAgent,
            validateConsistencyAgent,
            finalizeImagesAgent,
        ],
    });

    return imageProtocolAgent;
}
