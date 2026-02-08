"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ImageEngineTab, ImageEngineData } from "./ImageEngineTab";
import { VideoEngineTab, VideoEngineData } from "./VideoEngineTab";
import { TikTokPreview } from "@/components/preview/TikTokPreview";
import { Badge } from "@/components/ui/badge";
import { Image, Film, Zap, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface GenerationStatus {
    status: "idle" | "generating" | "complete" | "error";
    message: string;
    progress?: number;
}

export function DashboardTabs() {
    const [activeTab, setActiveTab] = useState("image");
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewContent, setPreviewContent] = useState<string | string[] | null>(null);
    const [previewType, setPreviewType] = useState<"image" | "video">("image");
    const [downloadUrl, setDownloadUrl] = useState<string | string[] | null>(null);
    const [fileName, setFileName] = useState<string | undefined>(undefined);
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
        status: "idle",
        message: "Ready to generate",
    });
    const [statusHistory, setStatusHistory] = useState<string[]>([]);

    const handleImageGenerate = async (data: ImageEngineData) => {
        setIsGenerating(true);
        setPreviewType("image");
        setStatusHistory([]);
        setDownloadUrl(null);
        setFileName(undefined);
        setPreviewContent(null);
        setGenerationStatus({ status: "generating", message: "Starting image generation..." });

        try {
            // Prepare form data
            const formData = new FormData();
            data.productImages.forEach((file, i) => formData.append(`productImage_${i}`, file));
            if (data.lookAndFeelImage) formData.append("lookAndFeel", data.lookAndFeelImage);
            formData.append("config", JSON.stringify({
                brandGuidelines: data.brandGuidelines,
                primaryColor: data.primaryColor,
                secondaryColor: data.secondaryColor,
                aspectRatio: data.aspectRatio,
                variantCount: data.variantCount,
                varianceFactors: data.varianceFactors,
                protocolType: "IMAGE",
                // Structured prompt fields
                useImageInteraction: data.useImageInteraction,
                imageInteractionDescription: data.imageInteractionDescription,
                creativeTrendType: data.creativeTrendType,
                selectedPreset: data.selectedPreset,
                aiTrendDescription: data.aiTrendDescription,
            }));

            const response = await fetch("/api/generate", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Generation failed");

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = ""; // Buffer for incomplete chunks

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Split by double newline (SSE message separator)
                    const messages = buffer.split("\n\n");
                    // Keep the last incomplete message in buffer
                    buffer = messages.pop() || "";

                    for (const message of messages) {
                        const lines = message.split("\n").filter((line) => line.startsWith("data: "));

                        for (const line of lines) {
                            try {
                                const jsonStr = line.replace("data: ", "");
                                console.log("[Frontend] Received SSE line, length:", jsonStr.length);
                                const data = JSON.parse(jsonStr);

                                if (data.status) {
                                    setGenerationStatus({
                                        status: "generating",
                                        message: data.status,
                                        progress: data.progress,
                                    });
                                    setStatusHistory((prev) => [...prev, data.status]);
                                }
                                if (data.result) {
                                    console.log("[Frontend] Got result data!");
                                    // Handle both single result and array of results
                                    const resultContent = data.result;
                                    const metadata = data.metadata;

                                    if (metadata?.files && metadata.files.length > 1) {
                                        // Multiple images generated
                                        const filePaths = metadata.files.map((f: { filePath: string }) => f.filePath);
                                        console.log("[Frontend] Setting", filePaths.length, "images");
                                        setPreviewContent(filePaths);
                                        setDownloadUrl(filePaths);
                                    } else {
                                        // Single result
                                        setPreviewContent(Array.isArray(resultContent) ? resultContent[0] : resultContent);
                                        setDownloadUrl(metadata?.downloadUrl || (Array.isArray(resultContent) ? resultContent[0] : resultContent));
                                    }
                                    setFileName(metadata?.fileName);
                                    setGenerationStatus({
                                        status: "complete",
                                        message: metadata?.count > 1
                                            ? `${metadata.count} images generated!`
                                            : "Generation complete!"
                                    });
                                }
                                if (data.error) {
                                    setGenerationStatus({ status: "error", message: data.error });
                                }
                            } catch (e) {
                                console.error("[Frontend] Parse error:", e);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            setGenerationStatus({
                status: "error",
                message: error instanceof Error ? error.message : "Generation failed",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleVideoGenerate = async (data: VideoEngineData) => {
        setIsGenerating(true);
        setPreviewType("video");
        setStatusHistory([]);
        setDownloadUrl(null);
        setFileName(undefined);
        setPreviewContent(null);
        setGenerationStatus({ status: "generating", message: "Starting video generation..." });

        try {
            const formData = new FormData();
            // Append up to 3 reference images with indexed keys
            data.anchorImages.forEach((file, i) => formData.append(`anchorImage_${i}`, file));
            formData.append("config", JSON.stringify({
                protocolType: "VIDEO",
                trendType: data.selectedVideoPreset || "fast-product-showcase",
                brandGuidelines: data.brandGuidelines,
                primaryColor: data.primaryColor,
                secondaryColor: data.secondaryColor,
                narrative: data.narrative,
                narrativeTemplate: data.narrativeTemplate,
                videoLength: data.videoLength,
                aspectRatio: data.aspectRatio,
                // New video structured prompt fields
                imagePurposes: data.imagePurposes,
                customPurposeDescriptions: data.customPurposeDescriptions,
                videoCreativeTrendType: data.creativeTrendType,
                selectedVideoPreset: data.selectedVideoPreset,
                aiVideoTrendDescription: data.aiVideoTrendDescription,
            }));

            const response = await fetch("/api/generate", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Generation failed");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = ""; // Buffer for incomplete chunks

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Split by double newline (SSE message separator)
                    const messages = buffer.split("\n\n");
                    // Keep the last incomplete message in buffer
                    buffer = messages.pop() || "";

                    for (const message of messages) {
                        const lines = message.split("\n").filter((line) => line.startsWith("data: "));

                        for (const line of lines) {
                            try {
                                const jsonStr = line.replace("data: ", "");
                                console.log("[Frontend Video] Received SSE line, length:", jsonStr.length);
                                const data = JSON.parse(jsonStr);

                                if (data.status) {
                                    setGenerationStatus({
                                        status: "generating",
                                        message: data.status,
                                        progress: data.progress,
                                    });
                                    setStatusHistory((prev) => [...prev, data.status]);
                                }
                                if (data.result) {
                                    console.log("[Frontend Video] Got result!");
                                    setPreviewContent(data.result);
                                    setDownloadUrl(data.metadata?.downloadUrl || data.result);
                                    setFileName(data.metadata?.fileName);
                                    setGenerationStatus({ status: "complete", message: "Video generated!" });
                                }
                                if (data.error) {
                                    setGenerationStatus({ status: "error", message: data.error });
                                }
                            } catch (e) {
                                console.error("[Frontend Video] Parse error:", e);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            setGenerationStatus({
                status: "error",
                message: error instanceof Error ? error.message : "Generation failed",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const StatusIcon = {
        idle: Clock,
        generating: Zap,
        complete: CheckCircle2,
        error: AlertCircle,
    }[generationStatus.status];

    const statusColor = {
        idle: "text-muted-foreground",
        generating: "text-[var(--primary)]",
        complete: "text-green-500",
        error: "text-red-500",
    }[generationStatus.status];

    return (
        <div className="grid lg:grid-cols-[1fr,400px] gap-8">
            {/* Main Content Area */}
            <Card className="glass border-border/50 p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 mb-6">
                        <TabsTrigger
                            value="image"
                            className="flex items-center gap-2.5 text-[13px] font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--primary)] data-[state=active]:to-[var(--secondary)] data-[state=active]:text-black data-[state=active]:font-semibold transition-all"
                        >
                            <Image className="w-4 h-4" />
                            Image Slideshow
                        </TabsTrigger>
                        <TabsTrigger
                            value="video"
                            className="flex items-center gap-2.5 text-[13px] font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--secondary)] data-[state=active]:to-[var(--accent)] data-[state=active]:text-white data-[state=active]:font-semibold transition-all"
                        >
                            <Film className="w-4 h-4" />
                            Video Loop
                        </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        {activeTab === "image" && (
                            <motion.div
                                key="image-tab"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TabsContent value="image" className="mt-0" forceMount>
                                    <ImageEngineTab onGenerate={handleImageGenerate} isGenerating={isGenerating} />
                                </TabsContent>
                            </motion.div>
                        )}
                        {activeTab === "video" && (
                            <motion.div
                                key="video-tab"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TabsContent value="video" className="mt-0" forceMount>
                                    <VideoEngineTab onGenerate={handleVideoGenerate} isGenerating={isGenerating} />
                                </TabsContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Tabs>
            </Card>

            {/* Preview Sidebar */}
            <div className="space-y-6">
                {/* Preview Card */}
                <Card className="glass border-border/50 p-6">
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2.5">
                        <span className="gradient-text">TikTok Preview</span>
                        <Badge variant="outline" className="text-[10px] font-medium">
                            Safe Zone
                        </Badge>
                    </h3>
                    <TikTokPreview
                        content={previewContent}
                        type={previewType}
                        showSafeZone={true}
                        downloadUrl={downloadUrl}
                        fileName={fileName}
                    />
                </Card>

                {/* Status Card */}
                <Card className="glass border-border/50 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <motion.div
                            animate={
                                generationStatus.status === "generating"
                                    ? { rotate: 360 }
                                    : { rotate: 0 }
                            }
                            transition={{
                                repeat: generationStatus.status === "generating" ? Infinity : 0,
                                duration: 1,
                                ease: "linear",
                            }}
                        >
                            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                        </motion.div>
                        <div className="flex-1">
                            <p className={`text-[13px] font-semibold ${statusColor}`}>
                                {generationStatus.message}
                            </p>
                            {generationStatus.progress !== undefined && (
                                <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                                    <motion.div
                                        className="h-full gradient-primary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${generationStatus.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status History */}
                    {statusHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 max-h-32 overflow-y-auto">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Activity Log:</p>
                            {statusHistory.map((status, i) => (
                                <p key={i} className="text-xs text-muted-foreground/70 py-0.5">
                                    • {status}
                                </p>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
