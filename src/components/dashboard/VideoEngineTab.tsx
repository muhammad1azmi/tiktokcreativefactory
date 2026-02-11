"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    AlertTriangle,
    Video,
} from "lucide-react";

// Import video creative trend presets
import { VIDEO_CREATIVE_TREND_PRESET_LIST } from "@/lib/video-presets";

interface VideoEngineTabProps {
    onGenerate: (data: VideoEngineData) => void;
    isGenerating?: boolean;
}

export type ReferenceImagePurpose = "character" | "product" | "environment" | "keyframe" | "style-guide" | "custom";

export interface VideoEngineData {
    anchorImages: File[];
    imagePurposes: ReferenceImagePurpose[];
    customPurposeDescriptions: string[];
    brandGuidelines: string;
    primaryColor: string;
    secondaryColor: string;
    narrative: string;
    narrativeTemplate: string;
    videoLength: string;
    aspectRatio: string;
    creativeTrendType: "preset" | "ai" | "custom" | "skip";
    selectedVideoPreset: string;
    aiVideoTrendDescription: string;
    customVideoTrendPrompt?: string;
}

// Video creative trend preset options for UI
const VIDEO_TREND_PRESET_OPTIONS = VIDEO_CREATIVE_TREND_PRESET_LIST.map(preset => ({
    value: preset.id,
    label: preset.name,
    description: preset.description
}));

// Reference image purpose options
const IMAGE_PURPOSE_OPTIONS: { value: ReferenceImagePurpose; label: string }[] = [
    { value: "character", label: "Character/Influencer" },
    { value: "product", label: "Product" },
    { value: "environment", label: "Environment/Location" },
    { value: "keyframe", label: "Keyframe Moment" },
    { value: "style-guide", label: "Style Reference" },
    { value: "custom", label: "Custom..." },
];

// Narrative template options for 8-second format
const NARRATIVE_TEMPLATE_OPTIONS = [
    { value: "quick-reveal", label: "Quick Product Reveal", description: "Single product moment with immediate impact" },
    { value: "transformation", label: "Fast Transformation", description: "Before → After in 8 seconds" },
    { value: "vlog-moment", label: "Micro-Vlog Moment", description: "Authentic slice-of-life" },
    { value: "feature-highlight", label: "Feature Highlight", description: "1-2 key product features" },
    { value: "satisfying-loop", label: "Satisfying Loop", description: "Hypnotic repeatable action" },
    { value: "custom", label: "Custom Narrative", description: "Write your own storyline" },
];

export function VideoEngineTab({ onGenerate, isGenerating = false }: VideoEngineTabProps) {
    const [anchorImages, setAnchorImages] = useState<File[]>([]);
    const [imagePurposes, setImagePurposes] = useState<ReferenceImagePurpose[]>([]);
    const [customPurposeDescriptions, setCustomPurposeDescriptions] = useState<string[]>([]);
    const [brandGuidelines, setBrandGuidelines] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#25F4EE");
    const [secondaryColor, setSecondaryColor] = useState("#FE2C55");
    const [narrative, setNarrative] = useState("");
    const [narrativeTemplate, setNarrativeTemplate] = useState("custom");
    const [videoLength, setVideoLength] = useState("6s");
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [creativeTrendType, setCreativeTrendType] = useState<"preset" | "ai" | "custom" | "skip">("preset");
    const [selectedVideoPreset, setSelectedVideoPreset] = useState("fast-product-showcase");
    const [aiVideoTrendDescription, setAiVideoTrendDescription] = useState("");
    const [customVideoTrendPrompt, setCustomVideoTrendPrompt] = useState("");

    const hasReferenceImages = anchorImages.length > 0;

    const handleFilesChange = (files: File[]) => {
        const selectedFiles = files.slice(0, 3);
        setAnchorImages(selectedFiles);

        // Initialize purposes for each image
        const newPurposes: ReferenceImagePurpose[] = selectedFiles.map((_, i) =>
            imagePurposes[i] || (i === 0 ? "product" : i === 1 ? "environment" : "character")
        );
        setImagePurposes(newPurposes);

        // Initialize custom descriptions
        const newDescriptions: string[] = selectedFiles.map((_, i) =>
            customPurposeDescriptions[i] || ""
        );
        setCustomPurposeDescriptions(newDescriptions);

        // Veo 3.1 requires 8s duration when using reference images
        if (selectedFiles.length > 0) {
            setVideoLength("8s");
        }
    };

    const handlePurposeChange = (index: number, purpose: ReferenceImagePurpose) => {
        const newPurposes = [...imagePurposes];
        newPurposes[index] = purpose;
        setImagePurposes(newPurposes);
    };

    const handleCustomDescriptionChange = (index: number, description: string) => {
        const newDescriptions = [...customPurposeDescriptions];
        newDescriptions[index] = description;
        setCustomPurposeDescriptions(newDescriptions);
    };

    const handleGenerate = () => {
        onGenerate({
            anchorImages,
            imagePurposes,
            customPurposeDescriptions,
            brandGuidelines,
            primaryColor,
            secondaryColor,
            narrative,
            narrativeTemplate,
            videoLength: hasReferenceImages ? "8s" : videoLength,
            aspectRatio,
            creativeTrendType,
            selectedVideoPreset,
            aiVideoTrendDescription,
        });
    };

    // Get narrative template placeholder based on selection
    const getNarrativePlaceholder = () => {
        switch (narrativeTemplate) {
            case "quick-reveal":
                return `0-2 sec: Product from [image 1] appears with dramatic lighting reveal
2-6 sec: Camera orbits product showing key features and premium details
6-8 sec: Final hero shot with brand logo, perfect ending frame for loop`;
            case "transformation":
                return `0-2 sec: Show "before" state - the problem or starting point
2-5 sec: Transformation happens - product in action creating change
5-8 sec: "After" reveal - satisfying result with product visible`;
            case "vlog-moment":
                return `One continuous 8-second shot with handheld camera feel:
Person from [image 1] in location from [image 2] naturally interacts with product.
Authentic, unscripted energy. Real moment, not staged.`;
            case "feature-highlight":
                return `0-2 sec: Product hero shot establishing premium feel
2-5 sec: Close-up highlighting KEY feature with callout graphic
5-8 sec: Return to full product view, feature benefit clear`;
            case "satisfying-loop":
                return `Design for seamless loop - ending flows back to beginning:
Single satisfying action repeated with slight variation.
Focus on textures, sounds, tactile satisfaction. ASMR-adjacent.`;
            default:
                return `Describe the complete video storyline from beginning to end.

Use [image 1], [image 2], [image 3] to reference your uploaded images.

Example: "Camera slowly orbits around the product from [image 1], revealing its premium texture. The lighting shifts from cool blue to warm golden as it rotates, with the environment from [image 2] visible in the background."`;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Reference Images Dropzone */}
            <div className="space-y-4">
                <Label className="section-title flex items-center gap-3">
                    <Film className="w-5 h-5 text-[var(--secondary)]" />
                    Reference Images (Up to 3)
                </Label>
                <p className="text-sm text-muted-foreground">
                    📍 Image order matters! Reference images as [image 1], [image 2], [image 3] in your narrative.
                </p>
                <FileDropzone
                    onFilesChange={handleFilesChange}
                    maxFiles={3}
                    icon="video"
                    label="Upload up to 3 reference images"
                    sublabel="These images guide Veo 3.1 in generating your video"
                />

                {/* Image Purpose Selectors */}
                {anchorImages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3 p-4 rounded-lg bg-card border border-border"
                    >
                        <Label className="text-sm font-medium">Assign Purpose to Each Image</Label>
                        {anchorImages.map((file, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="flex items-center gap-2 min-w-[100px]">
                                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        [image {index + 1}]
                                    </span>
                                </div>
                                <Select
                                    value={imagePurposes[index] || "product"}
                                    onValueChange={(value) => handlePurposeChange(index, value as ReferenceImagePurpose)}
                                >
                                    <SelectTrigger className="flex-1 bg-background border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {IMAGE_PURPOSE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {file.name}
                                </span>
                            </div>
                        ))}
                        {/* Custom description inputs for custom purpose */}
                        {imagePurposes.map((purpose, index) =>
                            purpose === "custom" && (
                                <Input
                                    key={`custom-${index}`}
                                    placeholder={`Describe purpose for [image ${index + 1}]...`}
                                    value={customPurposeDescriptions[index] || ""}
                                    onChange={(e) => handleCustomDescriptionChange(index, e.target.value)}
                                    className="bg-background border-border"
                                />
                            )
                        )}
                    </motion.div>
                )}
            </div>

            <Separator className="bg-border/50" />

            {/* Creative Trend Selector */}
            <div className="space-y-4">
                <Label className="section-title flex items-center gap-3">
                    <Video className="w-5 h-5 text-[var(--secondary)]" />
                    Creative Trend
                </Label>
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => setCreativeTrendType("preset")}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${creativeTrendType === "preset"
                            ? "bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-black"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        📦 Preset
                    </button>
                    <button
                        onClick={() => setCreativeTrendType("ai")}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${creativeTrendType === "ai"
                            ? "bg-gradient-to-r from-[var(--secondary)] to-[var(--accent)] text-white"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        ✨ AI
                    </button>
                    <button
                        onClick={() => setCreativeTrendType("custom")}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${creativeTrendType === "custom"
                            ? "bg-gradient-to-r from-[var(--accent)] to-purple-600 text-white"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        ✍️ Custom
                    </button>
                    <button
                        onClick={() => setCreativeTrendType("skip")}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${creativeTrendType === "skip"
                            ? "bg-muted text-muted-foreground"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Skip
                    </button>
                </div>

                {/* Preset Dropdown */}
                <AnimatePresence>
                    {creativeTrendType === "preset" && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <Select value={selectedVideoPreset} onValueChange={setSelectedVideoPreset}>
                                <SelectTrigger className="w-full bg-card border-border">
                                    <SelectValue placeholder="Select a video style preset" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VIDEO_TREND_PRESET_OPTIONS.map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{preset.label}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {preset.description}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI-Generated Trend Description */}
                <AnimatePresence>
                    {creativeTrendType === "ai" && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            <Textarea
                                placeholder="Describe the video trend you want AI to generate...

Example: 'A luxurious spa-inspired aesthetic with slow, meditative camera movements, soft focus transitions, and zen-like product placement. ASMR-adjacent with focus on textures and calm atmosphere.'"
                                value={aiVideoTrendDescription}
                                onChange={(e) => setAiVideoTrendDescription(e.target.value)}
                                className="min-h-[100px] bg-card border-border resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 AI will generate a detailed video trend optimized for 8-second format
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Custom Trend Prompt */}
                <AnimatePresence>
                    {creativeTrendType === "custom" && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            <Textarea
                                placeholder="Write your complete video creative trend prompt...

Include details like:
- Visual style and motion aesthetic
- Camera movements and transitions
- Pacing and rhythm
- Color grading and lighting mood
- Sound design direction"
                                value={customVideoTrendPrompt}
                                onChange={(e) => setCustomVideoTrendPrompt(e.target.value)}
                                className="min-h-[120px] bg-card border-border resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                ✍️ Your prompt will be used directly for video generation
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Separator className="bg-border/50" />

            {/* Brand Guidelines */}
            <div className="space-y-3">
                <Label className="field-label flex items-center gap-2.5">
                    <Wand2 className="w-4 h-4 text-[var(--accent)]" />
                    Brand Guidelines
                </Label>
                <Textarea
                    placeholder={`Describe your brand's video style guidelines...

DO:
- Maintain consistent brand presence throughout video
- Use smooth, professional camera movements
- Feature brand logo within first 2 seconds

DON'T:
- Use excessive transitions (wastes precious seconds)
- Obscure product with effects
- Include competing brand elements`}
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    className="min-h-[120px] bg-card border-border resize-none"
                />
            </div>

            {/* Brand Colors */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="field-label flex items-center gap-2.5">
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
                <div className="space-y-3">
                    <Label className="field-label">Secondary Color</Label>
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
            <div className="space-y-4">
                <Label className="section-title flex items-center gap-3">
                    <ScrollText className="w-5 h-5 text-[var(--primary)]" />
                    Narrative / Storyline
                </Label>

                {/* 8-second timeline guidance */}
                {hasReferenceImages && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <span>📐 8-Second Timeline:</span>
                        <span className="font-mono">0-2s</span> Hook •
                        <span className="font-mono">2-6s</span> Core Action •
                        <span className="font-mono">6-8s</span> Payoff
                    </div>
                )}

                {/* Narrative Template Selector */}
                <Select value={narrativeTemplate} onValueChange={setNarrativeTemplate}>
                    <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Select a narrative template" />
                    </SelectTrigger>
                    <SelectContent>
                        {NARRATIVE_TEMPLATE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                    <span className="font-medium">{option.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {option.description}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Textarea
                    placeholder={getNarrativePlaceholder()}
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="min-h-[180px] bg-card border-border resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    💡 Reference your uploaded images as [image 1], [image 2], [image 3]. This is the core creative direction for video generation.
                </p>
            </div>

            {/* Video Length & Aspect Ratio */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="field-label flex items-center gap-2.5">
                        <Clock className="w-4 h-4" />
                        Video Length
                        {hasReferenceImages && (
                            <span className="text-[11px] text-amber-500 font-medium">🔒 8s locked</span>
                        )}
                    </Label>
                    <Select
                        value={hasReferenceImages ? "8s" : videoLength}
                        onValueChange={setVideoLength}
                        disabled={hasReferenceImages}
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
                    {hasReferenceImages && (
                        <p className="text-xs text-amber-500">
                            Veo 3.1 requires 8s duration when using reference images
                        </p>
                    )}
                </div>
                <div className="space-y-3">
                    <Label className="field-label">Aspect Ratio</Label>
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
            <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                <Button
                    onClick={handleGenerate}
                    disabled={anchorImages.length === 0 || isGenerating}
                    className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-[var(--secondary)] to-[var(--accent)] text-white hover:opacity-90 transition-all disabled:opacity-50 btn-premium shadow-lg shadow-[var(--secondary)]/20"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating Video...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 mr-2" />
                            Generate {hasReferenceImages ? "8s" : videoLength} Video Loop
                        </>
                    )}
                </Button>
            </motion.div>

        </motion.div>
    );
}
