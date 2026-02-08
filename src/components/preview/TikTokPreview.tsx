"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Bookmark, Music2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TikTokPreviewProps {
    content?: string | string[] | null;
    type?: "image" | "video";
    showSafeZone?: boolean;
    downloadUrl?: string | string[] | null;
    fileName?: string;
}

export function TikTokPreview({
    content,
    type = "image",
    showSafeZone = true,
    downloadUrl,
    fileName,
}: TikTokPreviewProps) {
    // Normalize content to always be an array internally
    const contentArray = content ? (Array.isArray(content) ? content : [content]) : [];
    const downloadUrlArray = downloadUrl ? (Array.isArray(downloadUrl) ? downloadUrl : [downloadUrl]) : [];

    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index when content changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [content]);

    const currentContent = contentArray[currentIndex];
    const currentDownloadUrl = downloadUrlArray[currentIndex] || currentContent;

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : contentArray.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < contentArray.length - 1 ? prev + 1 : 0));
    };

    const handleDownload = async () => {
        if (!currentDownloadUrl) return;

        try {
            // Check if it's a data URL (starts with "data:")
            if (currentDownloadUrl.startsWith("data:")) {
                // Data URL - can download directly
                const a = document.createElement("a");
                a.href = currentDownloadUrl;
                a.download = fileName || `tiktok_${type}_${currentIndex + 1}_${Date.now()}.${type === "image" ? "png" : "mp4"}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                // Regular URL - need to fetch first
                const response = await fetch(currentDownloadUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName || `tiktok_${type}_${currentIndex + 1}_${Date.now()}.${type === "image" ? "png" : "mp4"}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const handleDownloadAll = async () => {
        for (let i = 0; i < downloadUrlArray.length; i++) {
            const url = downloadUrlArray[i];
            if (!url) continue;
            try {
                if (url.startsWith("data:")) {
                    // Data URL - can download directly
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `tiktok_${type}_${i + 1}_${Date.now()}.${type === "image" ? "png" : "mp4"}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else {
                    // Regular URL - need to fetch first
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = `tiktok_${type}_${i + 1}_${Date.now()}.${type === "image" ? "png" : "mp4"}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(blobUrl);
                    document.body.removeChild(a);
                }
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`Download ${i + 1} failed:`, error);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="tiktok-preview w-full max-w-[300px] mx-auto shadow-2xl relative">
                {/* Content Area */}
                <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 to-black">
                    {currentContent ? (
                        type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={currentContent}
                                alt={`Preview ${currentIndex + 1}`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <video
                                src={currentContent}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                            />
                        )
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-4">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-20"
                                />
                                <p className="text-muted-foreground text-sm">
                                    Preview will appear here
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation arrows for multiple images */}
                    {contentArray.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-14 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            {/* Image counter */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-medium z-10">
                                {currentIndex + 1} / {contentArray.length}
                            </div>
                        </>
                    )}

                    {/* TikTok Safe Zone Overlay */}
                    {showSafeZone && (
                        <>
                            {/* Right side buttons zone */}
                            <div className="tiktok-safe-zone">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex flex-col items-center gap-5"
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <Heart className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[10px] text-white/60 mt-1">128K</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <MessageCircle className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[10px] text-white/60 mt-1">1.2K</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <Bookmark className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[10px] text-white/60 mt-1">Save</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <Share2 className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[10px] text-white/60 mt-1">Share</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Bottom zone */}
                            <div className="tiktok-bottom-zone">
                                <div className="absolute bottom-4 left-4 right-16 space-y-2">
                                    <p className="text-white font-semibold text-sm">@username</p>
                                    <p className="text-white/80 text-xs line-clamp-2">
                                        Caption text area - content should avoid this zone #fyp #viral
                                    </p>
                                    <div className="flex items-center gap-2 text-white/60 text-xs">
                                        <Music2 className="w-3 h-3" />
                                        <span className="truncate">Original sound - Artist Name</span>
                                    </div>
                                </div>
                            </div>

                            {/* Safe zone indicator label */}
                            <div className="absolute top-20 right-0 bg-red-500/80 text-white text-[8px] px-1 py-0.5 rounded-l">
                                SAFE ZONE
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dot indicators for multiple images */}
            {contentArray.length > 1 && (
                <div className="flex justify-center gap-1.5">
                    {contentArray.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                ? "bg-[var(--primary)] w-4"
                                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Download Buttons */}
            {currentContent && currentDownloadUrl && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                >
                    <Button
                        onClick={handleDownload}
                        className="w-full max-w-[300px] mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-black font-semibold hover:opacity-90 transition-opacity"
                    >
                        <Download className="w-4 h-4" />
                        <span>Download {type === "image" ? "Image" : "Video"} {contentArray.length > 1 ? `(${currentIndex + 1}/${contentArray.length})` : ""}</span>
                    </Button>
                    {contentArray.length > 1 && (
                        <Button
                            onClick={handleDownloadAll}
                            variant="outline"
                            className="w-full max-w-[300px] mx-auto flex items-center justify-center gap-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download All ({contentArray.length} images)</span>
                        </Button>
                    )}
                </motion.div>
            )}
        </div>
    );
}
