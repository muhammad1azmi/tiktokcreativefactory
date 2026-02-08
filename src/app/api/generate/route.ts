import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateVideo, buildTrendPrompt, buildStructuredPrompt, StructuredPromptParams, generateCreativeTrendFromDescription, generateVariationSpecs, VariationSpec, buildVideoStructuredPrompt, VideoPromptParams, generateVideoCreativeTrendFromDescription, ReferenceImagePurpose } from "@/lib/vertexAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for video generation

interface GenerationConfig {
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
  // Structured prompt fields (image)
  useImageInteraction?: boolean;
  imageInteractionDescription?: string;
  creativeTrendType?: "preset" | "ai" | "skip";
  selectedPreset?: string;
  aiTrendDescription?: string;
  // Video-specific structured prompt fields
  imagePurposes?: ReferenceImagePurpose[];
  customPurposeDescriptions?: string[];
  narrativeTemplate?: string;
  videoCreativeTrendType?: "preset" | "ai" | "skip";
  selectedVideoPreset?: string;
  aiVideoTrendDescription?: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse form data
        const formData = await request.formData();
        const configStr = formData.get("config") as string;

        if (!configStr) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "No configuration provided" })}\n\n`));
          controller.close();
          return;
        }

        const config: GenerationConfig = JSON.parse(configStr);

        // Send initial status
        sendStatus(controller, encoder, "Initializing AI generation...", 5);

        // Collect uploaded files
        const uploadedImages: Buffer[] = [];
        const anchorImageBuffers: Buffer[] = [];

        for (const [key, value] of formData.entries()) {
          if (value instanceof File && key !== "config") {
            const arrayBuffer = await value.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if (key.startsWith("anchorImage_")) {
              // Support multiple anchor images for video (up to 3)
              anchorImageBuffers.push(buffer);
            } else if (key.startsWith("productImage_") || key === "lookAndFeel") {
              uploadedImages.push(buffer);
            }
          }
        }

        sendStatus(controller, encoder, `Processing ${uploadedImages.length + anchorImageBuffers.length || 1} uploaded file(s)...`, 10);

        // Count moodboard images (lookAndFeel)
        let productImageCount = 0;
        let moodboardImageCount = 0;
        for (const [key] of formData.entries()) {
          if (key.startsWith("productImage_")) productImageCount++;
          if (key === "lookAndFeel") moodboardImageCount++;
        }

        // Handle AI-generated creative trend if selected
        let aiGeneratedTrend: string | undefined;
        if (config.creativeTrendType === "ai" && config.aiTrendDescription) {
          sendStatus(controller, encoder, "AI generating creative trend from your description...", 12);
          aiGeneratedTrend = await generateCreativeTrendFromDescription(config.aiTrendDescription);
        }

        // Build the structured prompt using new template system
        let creativeTrendConfig: StructuredPromptParams["creativeTrend"];
        if (config.creativeTrendType === "preset" && config.selectedPreset) {
          creativeTrendConfig = { type: "preset", presetId: config.selectedPreset };
        } else if (config.creativeTrendType === "ai" && aiGeneratedTrend) {
          creativeTrendConfig = { type: "ai-generated", customPrompt: aiGeneratedTrend };
        } else {
          creativeTrendConfig = { type: "skip" };
        }

        const structuredPromptParams: StructuredPromptParams = {
          referenceImageInteraction: config.useImageInteraction ? config.imageInteractionDescription : undefined,
          referenceImageCount: productImageCount,
          creativeTrend: creativeTrendConfig,
          brandGuidelines: config.brandGuidelines || "",
          primaryColor: config.primaryColor || "#25F4EE",
          secondaryColor: config.secondaryColor || "#FE2C55",
          moodboardImageCount: moodboardImageCount,
          moodboardStartIndex: productImageCount,
          aspectRatio: (config.aspectRatio as "9:16" | "1:1" | "4:5" | "16:9") || "9:16",
        };

        // Build base structured prompt
        const structuredPrompt = buildStructuredPrompt(structuredPromptParams);

        // Also build legacy trend prompt for compatibility
        const basePrompt = buildBasePrompt(config, uploadedImages.length);
        const trendPrompt = buildTrendPrompt(
          basePrompt,
          config.trendType || "standard-promo",
          config.protocolType === "IMAGE" ? "image" : "video"
        );

        sendStatus(controller, encoder, `Applying structured prompt template...`, 15);

        if (config.protocolType === "IMAGE") {
          // IMAGE GENERATION with Nano Banana Pro
          sendStatus(controller, encoder, "Connecting to Nano Banana Pro (gemini-3-pro-image)...", 20);

          const variantCount = config.variantCount || 1;
          const results: Array<{ filePath: string; fileName: string; mimeType: string }> = [];

          try {
            // Generate AI variation specs if multiple variants requested
            let variationSpecs: VariationSpec[] = [];
            if (variantCount > 1 && config.varianceFactors && config.varianceFactors.length > 0) {
              sendStatus(controller, encoder, "AI generating unique variation specs for each variant...", 22);

              // Get base creative direction for context
              const baseCreativeDirection = config.creativeTrendType === "preset" && config.selectedPreset
                ? `Preset: ${config.selectedPreset}`
                : config.creativeTrendType === "ai" && aiGeneratedTrend
                  ? aiGeneratedTrend
                  : "Product photography with professional aesthetic";

              variationSpecs = await generateVariationSpecs(
                baseCreativeDirection,
                config.brandGuidelines || "",
                config.varianceFactors,
                variantCount
              );
              console.log("[API] AI Variation Specs generated:", variationSpecs.length, "variations");
            }

            for (let i = 0; i < variantCount; i++) {
              const progressBase = 25 + Math.floor((i / variantCount) * 60);
              sendStatus(controller, encoder, `Generating image ${i + 1} of ${variantCount}...`, progressBase);

              // Determine the prompt for this variant
              let variantPrompt: string;

              if (i === 0) {
                // First variant uses base structured prompt
                variantPrompt = structuredPrompt;
              } else if (variationSpecs[i - 1]) {
                // Variants 2+ use AI-generated variation specs
                const spec = variationSpecs[i - 1];
                const variationSection = `VARIATION SPECIFICATIONS FOR VARIANT #${i + 1}:

Lighting: ${spec.lighting}

Environment: ${spec.environment}

Camera Angle: ${spec.cameraAngle}

Materials: ${spec.materials}`;

                variantPrompt = `${structuredPrompt}\n\n---\n\n${variationSection}`;
                console.log(`[API] Variant ${i + 1} using AI variation spec`);
              } else {
                variantPrompt = structuredPrompt;
              }

              const result = await generateImage({
                prompt: variantPrompt,
                referenceImages: uploadedImages.length > 0 ? uploadedImages : undefined,
                aspectRatio: config.aspectRatio || "9:16",
                numberOfImages: 1,
              });

              results.push({
                filePath: result.filePath,
                fileName: result.fileName,
                mimeType: result.mimeType,
              });
            }

            sendStatus(controller, encoder, `${variantCount} image(s) generated successfully!`, 90);
            sendStatus(controller, encoder, "Preparing for preview...", 95);

            // Log result details for debugging
            console.log("[API] Results ready:", results.length, "images");
            results.forEach((r, i) => {
              console.log(`[API] Result ${i + 1}: filePath length = ${r.filePath.length}, mimeType = ${r.mimeType}`);
            });

            // Send final result - array of all images
            const resultPayload = {
              result: results.length === 1 ? results[0].filePath : results.map(r => r.filePath),
              metadata: {
                type: "image",
                count: results.length,
                files: results,
                trend: config.trendType,
                aspectRatio: config.aspectRatio || "9:16",
                downloadUrl: results.length === 1 ? results[0].filePath : results[0].filePath,
              }
            };

            const payloadString = JSON.stringify(resultPayload);
            console.log("[API] Sending result payload, size:", payloadString.length, "bytes");

            controller.enqueue(encoder.encode(`data: ${payloadString}\n\n`));
            console.log("[API] Result payload sent successfully");

          } catch (error) {
            console.error("[API] Image generation error:", error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: error instanceof Error ? error.message : "Image generation failed"
            })}\n\n`));
          }

        } else {
          // VIDEO GENERATION with Veo 3.1
          sendStatus(controller, encoder, "Connecting to Veo 3.1...", 20);

          // Count anchor images and build reference image array
          const referenceImageCount = anchorImageBuffers.length;
          const hasReferenceImages = referenceImageCount > 0;

          // Handle AI-generated video creative trend if selected
          let aiGeneratedVideoTrend: string | undefined;
          if (config.videoCreativeTrendType === "ai" && config.aiVideoTrendDescription) {
            sendStatus(controller, encoder, "AI generating video creative trend from your description...", 25);
            aiGeneratedVideoTrend = await generateVideoCreativeTrendFromDescription(config.aiVideoTrendDescription);
          }

          sendStatus(controller, encoder, "Building structured video prompt...", 30);

          // Build reference images array with purposes
          const referenceImages = anchorImageBuffers.map((_, i) => ({
            index: i + 1,
            purpose: (config.imagePurposes?.[i] || "product") as ReferenceImagePurpose,
            customDescription: config.imagePurposes?.[i] === "custom" ? config.customPurposeDescriptions?.[i] : undefined,
          }));

          // Build video creative trend config
          let videoCreativeTrendConfig: VideoPromptParams["creativeTrend"];
          if (config.videoCreativeTrendType === "preset" && config.selectedVideoPreset) {
            videoCreativeTrendConfig = { type: "preset", presetId: config.selectedVideoPreset };
          } else if (config.videoCreativeTrendType === "ai" && aiGeneratedVideoTrend) {
            videoCreativeTrendConfig = { type: "ai-generated", customPrompt: aiGeneratedVideoTrend };
          } else {
            videoCreativeTrendConfig = { type: "skip" };
          }

          // Build structured video prompt
          const videoPromptParams: VideoPromptParams = {
            referenceImages,
            creativeTrend: videoCreativeTrendConfig,
            brandGuidelines: config.brandGuidelines || "",
            primaryColor: config.primaryColor || "#25F4EE",
            secondaryColor: config.secondaryColor || "#FE2C55",
            narrative: config.narrative || "Create an engaging video loop.",
            narrativeTemplate: config.narrativeTemplate as VideoPromptParams["narrativeTemplate"],
            aspectRatio: (config.aspectRatio as "9:16" | "1:1" | "16:9") || "9:16",
            duration: (hasReferenceImages ? "8s" : config.videoLength || "6s") as "4s" | "6s" | "8s",
          };

          const videoPrompt = buildVideoStructuredPrompt(videoPromptParams);
          console.log("[API] Video structured prompt built, length:", videoPrompt.length);
          console.log("[API] Video prompt preview:", videoPrompt.substring(0, 500) + "...");

          sendStatus(controller, encoder, "Generating video loop (this may take a few minutes)...", 40);

          try {
            const effectiveDuration = hasReferenceImages ? "8s" : (config.videoLength || "6s");
            const result = await generateVideo({
              prompt: videoPrompt,
              anchorImages: anchorImageBuffers.length > 0 ? anchorImageBuffers : undefined,
              duration: effectiveDuration,
              aspectRatio: config.aspectRatio || "9:16",
            });

            sendStatus(controller, encoder, "Video generated successfully!", 90);
            sendStatus(controller, encoder, "Preparing for preview...", 95);

            // Send final result
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              result: result.filePath,
              metadata: {
                type: "video",
                fileName: result.fileName,
                mimeType: result.mimeType,
                trend: config.selectedVideoPreset || config.trendType,
                duration: effectiveDuration,
                aspectRatio: config.aspectRatio || "9:16",
                downloadUrl: result.filePath,
                hasReferenceImages,
              }
            })}\n\n`));

          } catch (error) {
            console.error("[API] Video generation error:", error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: error instanceof Error ? error.message : "Video generation failed"
            })}\n\n`));
          }
        }

        sendStatus(controller, encoder, "Complete!", 100);
        controller.close();

      } catch (error) {
        console.error("[API] Generation error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: error instanceof Error ? error.message : "Generation failed"
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function sendStatus(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  message: string,
  progress: number
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: message, progress })}\n\n`));
}

function buildBasePrompt(config: GenerationConfig, imageCount: number): string {
  const parts: string[] = [];

  if (config.protocolType === "IMAGE") {
    parts.push("Generate a high-quality product image for TikTok in 9:16 vertical format.");
    parts.push("The image should be scroll-stopping and optimized for mobile viewing.");

    if (imageCount > 0) {
      parts.push(`Use the ${imageCount} reference image(s) provided to understand the product.`);
      parts.push("Maintain exact product fidelity - the product should look identical to the reference.");
    }
  } else {
    parts.push("Generate a seamless video loop for TikTok in 9:16 vertical format.");
    parts.push(`Target duration: ${config.videoLength || "6s"}`);
    parts.push("The video should be engaging and optimized for mobile viewing.");
  }

  if (config.brandGuidelines) {
    parts.push(`Brand Guidelines: ${config.brandGuidelines}`);
  }

  if (config.primaryColor) {
    parts.push(`Primary brand color: ${config.primaryColor}`);
  }

  if (config.secondaryColor) {
    parts.push(`Secondary brand color: ${config.secondaryColor}`);
  }

  if (config.narrative) {
    parts.push(`Storyline: ${config.narrative}`);
  }

  parts.push("IMPORTANT: Maintain 100% product fidelity throughout.");

  return parts.join("\n");
}
