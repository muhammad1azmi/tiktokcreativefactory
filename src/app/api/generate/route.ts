import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateVideo, buildTrendPrompt, generateAIStorylines } from "@/lib/vertexAI";

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

        // Build the prompt based on trend and config
        const basePrompt = buildBasePrompt(config, uploadedImages.length);
        const trendPrompt = buildTrendPrompt(
          basePrompt,
          config.trendType || "standard-promo",
          config.protocolType === "IMAGE" ? "image" : "video"
        );

        sendStatus(controller, encoder, `Applying "${config.trendType}" trend style...`, 15);

        if (config.protocolType === "IMAGE") {
          // IMAGE GENERATION with Nano Banana Pro
          sendStatus(controller, encoder, "Connecting to Nano Banana Pro (gemini-3-pro-image)...", 20);

          const variantCount = config.variantCount || 1;
          const results: Array<{ filePath: string; fileName: string; mimeType: string }> = [];

          try {
            // Generate AI storylines if toggle is enabled
            let aiStorylines: string[] | null = null;
            if (config.useAIStoryline && variantCount > 0) {
              sendStatus(controller, encoder, "AI generating unique creative concepts...", 22);
              aiStorylines = await generateAIStorylines({
                trendType: config.trendType || "standard-promo",
                brandGuidelines: config.brandGuidelines,
                primaryColor: config.primaryColor,
                secondaryColor: config.secondaryColor,
                varianceFactors: config.varianceFactors,
                variantCount,
              });
              console.log("[API] AI Storylines generated:", aiStorylines);
            }

            for (let i = 0; i < variantCount; i++) {
              const progressBase = 25 + Math.floor((i / variantCount) * 60);
              sendStatus(controller, encoder, `Generating image ${i + 1} of ${variantCount}...`, progressBase);

              // Determine the prompt for this variant
              let variantPrompt: string;

              if (aiStorylines && aiStorylines[i]) {
                // Use AI-generated storyline
                variantPrompt = `${trendPrompt}\n\nCreative Concept: ${aiStorylines[i]}`;
                console.log(`[API] Variant ${i + 1} using AI storyline:`, aiStorylines[i]);
              } else if (variantCount > 1 && config.varianceFactors && config.varianceFactors.length > 0) {
                // Fallback: Use preset variance cycling
                const variationHints = [];
                if (config.varianceFactors.includes("lighting")) {
                  const lightingOptions = ["soft natural lighting", "dramatic studio lighting", "golden hour glow", "cool blue tones", "warm ambient light"];
                  variationHints.push(`Lighting style: ${lightingOptions[i % lightingOptions.length]}`);
                }
                if (config.varianceFactors.includes("camera-angle")) {
                  const angleOptions = ["eye-level front view", "slight overhead angle", "low angle hero shot", "dynamic 3/4 view", "top-down flat lay"];
                  variationHints.push(`Camera angle: ${angleOptions[i % angleOptions.length]}`);
                }
                if (config.varianceFactors.includes("environment")) {
                  const envOptions = ["minimal white background", "textured natural backdrop", "lifestyle setting", "abstract gradient background", "outdoor environment"];
                  variationHints.push(`Environment: ${envOptions[i % envOptions.length]}`);
                }
                if (config.varianceFactors.includes("materials")) {
                  const matOptions = ["matte surfaces", "glossy reflective surfaces", "textured organic materials", "metallic accents", "soft fabric textures"];
                  variationHints.push(`Material emphasis: ${matOptions[i % matOptions.length]}`);
                }
                variantPrompt = variationHints.length > 0
                  ? `${trendPrompt}\n\nVariant ${i + 1} specific style:\n${variationHints.join("\n")}`
                  : trendPrompt;
              } else {
                variantPrompt = trendPrompt;
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

          sendStatus(controller, encoder, "Processing anchor image and narrative...", 30);

          const videoPrompt = config.narrative
            ? `${trendPrompt}\n\nNarrative: ${config.narrative}`
            : trendPrompt;

          sendStatus(controller, encoder, "Generating video loop (this may take a few minutes)...", 40);

          try {
            const result = await generateVideo({
              prompt: videoPrompt,
              anchorImages: anchorImageBuffers.length > 0 ? anchorImageBuffers : undefined,
              duration: config.videoLength || "6s",
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
                trend: config.trendType,
                duration: config.videoLength || "6s",
                aspectRatio: config.aspectRatio || "9:16",
                downloadUrl: result.filePath,
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
