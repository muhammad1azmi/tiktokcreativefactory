"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Film,
    Palette,
    Wand2,
    ScrollText,
    Clock,
    Sparkles,
    Loader2,
    Play,
} from "lucide-react";

interface VideoEngineTabProps {
    onGenerate: (data: VideoEngineData) => void;
    isGenerating?: boolean;
}

export interface VideoEngineData {
    anchorImages: File[];
    brandGuidelines: string;
    primaryColor: string;
    secondaryColor: string;
    narrative: string;
    videoLength: string;
    aspectRatio: string;
    selectedTrend: string;
}

const TREND_OPTIONS = [
    { value: "reali-tea", label: "Reali-TEA", description: "Handheld shaky-cam motion" },
    { value: "emotional-roi", label: "Emotional ROI", description: "ASMR audio generation" },
    { value: "curiosity-detours", label: "Curiosity Detours", description: "Reveal animations" },
    { value: "go-analogue", label: "Go Analogue", description: "Vintage camera movements" },
    { value: "standard-promo", label: "Standard Promo", description: "Smooth cinematic orbits" },
];

export function VideoEngineTab({ onGenerate, isGenerating = false }: VideoEngineTabProps) {
    const [anchorImages, setAnchorImages] = useState<File[]>([]);
    const [brandGuidelines, setBrandGuidelines] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#25F4EE");
    const [secondaryColor, setSecondaryColor] = useState("#FE2C55");
    const [narrative, setNarrative] = useState("");
    const [videoLength, setVideoLength] = useState("6s");
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [selectedTrend, setSelectedTrend] = useState("standard-promo");

    const handleGenerate = () => {
        onGenerate({
            anchorImages,
            brandGuidelines,
            primaryColor,
            secondaryColor,
            narrative,
            videoLength,
            aspectRatio,
            selectedTrend,
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            {/* Reference Images Dropzone */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-lg">
                    <Film className="w-5 h-5 text-[var(--secondary)]" />
                    Reference Images (Up to 3)
                </Label>
                <FileDropzone
                    onFilesChange={(files) => {
                        const selectedFiles = files.slice(0, 3);
                        setAnchorImages(selectedFiles);
                        // Veo 3.1 requires 8s duration when using reference images
                        if (selectedFiles.length > 0) {
                            setVideoLength("8s");
                        }
                    }}
                    maxFiles={3}
                    icon="video"
                    label="Upload up to 3 reference images"
                    sublabel="These images guide Veo 3.1 in generating your video"
                />
                {anchorImages.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {anchorImages.length} image{anchorImages.length > 1 ? 's' : ''} selected
                    </p>
                )}
            </div>

            <Separator className="bg-border/50" />

            {/* Trend Selector */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                    Video Style Trend
                </Label>
                <Select value={selectedTrend} onValueChange={setSelectedTrend}>
                    <SelectTrigger className="w-full bg-card border-border">
                        <SelectValue placeholder="Select a trend style" />
                    </SelectTrigger>
                    <SelectContent>
                        {TREND_OPTIONS.map((trend) => (
                            <SelectItem key={trend.value} value={trend.value}>
                                <div className="flex flex-col">
                                    <span className="font-medium">{trend.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {trend.description}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Brand Guidelines */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[var(--accent)]" />
                    Brand Guidelines
                </Label>
                <Textarea
                    placeholder="Describe your brand's tone, voice, visual style..."
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    className="min-h-[100px] bg-card border-border resize-none"
                />
            </div>

            {/* Brand Colors */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Primary Color
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer bg-card border-border"
                        />
                        <Input
                            type="text"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="flex-1 bg-card border-border font-mono"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                        <Input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer bg-card border-border"
                        />
                        <Input
                            type="text"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="flex-1 bg-card border-border font-mono"
                        />
                    </div>
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Narrative / Storyline */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-lg">
                    <ScrollText className="w-5 h-5 text-[var(--primary)]" />
                    Narrative / Storyline
                </Label>
                <Textarea
                    placeholder="Describe the story or movement you want the AI to animate. Example: 'Camera slowly orbits around the product, revealing its premium texture. The lighting shifts from cool blue to warm golden as it rotates.'"
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="min-h-[150px] bg-card border-border resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    This script guides the AI's camera movement and animation logic
                </p>
            </div>

            {/* Video Length & Aspect Ratio */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Video Length
                    </Label>
                    <Select
                        value={videoLength}
                        onValueChange={setVideoLength}
                        disabled={anchorImages.length > 0}
                    >
                        <SelectTrigger className="bg-card border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="4s">4 seconds</SelectItem>
                            <SelectItem value="6s">6 seconds</SelectItem>
                            <SelectItem value="8s">8 seconds</SelectItem>
                        </SelectContent>
                    </Select>
                    {anchorImages.length > 0 && (
                        <p className="text-xs text-amber-500">
                            Veo 3.1 requires 8s duration when using reference images
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="bg-card border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="9:16">9:16 (TikTok/Reels)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Generate Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                    onClick={handleGenerate}
                    disabled={anchorImages.length === 0 || isGenerating}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[var(--secondary)] to-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating Video...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 mr-2" />
                            Generate {videoLength} Video Loop
                        </>
                    )}
                </Button>
            </motion.div>
            {/* Pricing Note */}
            <p className="text-center text-sm text-muted-foreground mt-2">
                Est. cost: <span className="font-medium text-foreground">
                    ${(parseInt(videoLength) * 0.15).toFixed(2)}
                </span>
                <span className="text-xs ml-1">($0.15/sec · veo-3.1-generate-preview)</span>
            </p>
        </motion.div>
    );
}
