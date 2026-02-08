"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Sparkles,
    Palette,
    Wand2,
    Layers,
    Camera,
    Sun,
    Mountain,
    Box,
    Loader2,
    MessageSquare,
    Image,
} from "lucide-react";

interface ImageEngineTabProps {
    onGenerate: (data: ImageEngineData) => void;
    isGenerating?: boolean;
}

export interface ImageEngineData {
    productImages: File[];
    brandGuidelines: string;
    primaryColor: string;
    secondaryColor: string;
    lookAndFeelImage: File | null;
    aspectRatio: string;
    variantCount: number;
    varianceFactors: string[];
    // Structured prompt fields
    useImageInteraction: boolean;
    imageInteractionDescription: string;
    creativeTrendType: "preset" | "ai" | "custom" | "skip";
    selectedPreset: string;
    aiTrendDescription?: string;
    customTrendPrompt?: string;
}

// Creative Trend Presets - imported from shared JSON source (client-safe)
import { CREATIVE_TREND_PRESET_LIST } from "@/lib/presets";

// Map to UI options format
const CREATIVE_TREND_PRESET_OPTIONS = CREATIVE_TREND_PRESET_LIST.map(preset => ({
    value: preset.id,
    label: preset.name,
    description: preset.description
}));

const VARIANCE_FACTORS = [
    { id: "lighting", label: "Lighting", icon: Sun },
    { id: "environment", label: "Environment", icon: Mountain },
    { id: "camera-angle", label: "Camera Angle", icon: Camera },
    { id: "materials", label: "Materials", icon: Box },
];

export function ImageEngineTab({ onGenerate, isGenerating = false }: ImageEngineTabProps) {
    const [productImages, setProductImages] = useState<File[]>([]);
    const [brandGuidelines, setBrandGuidelines] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#25F4EE");
    const [secondaryColor, setSecondaryColor] = useState("#FE2C55");
    const [lookAndFeelImage, setLookAndFeelImage] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [variantCount, setVariantCount] = useState([3]);
    const [varianceFactors, setVarianceFactors] = useState<string[]>(["lighting", "camera-angle"]);
    // State for structured prompts
    const [useImageInteraction, setUseImageInteraction] = useState(false);
    const [imageInteractionDescription, setImageInteractionDescription] = useState("");
    const [creativeTrendType, setCreativeTrendType] = useState<"preset" | "ai" | "custom" | "skip">("preset");
    const [selectedPreset, setSelectedPreset] = useState("product-promotion-shot");
    const [aiTrendDescription, setAiTrendDescription] = useState("");
    const [customTrendPrompt, setCustomTrendPrompt] = useState("");

    const toggleVarianceFactor = (factorId: string) => {
        setVarianceFactors((prev) =>
            prev.includes(factorId)
                ? prev.filter((f) => f !== factorId)
                : [...prev, factorId]
        );
    };

    const handleGenerate = () => {
        onGenerate({
            productImages,
            brandGuidelines,
            primaryColor,
            secondaryColor,
            lookAndFeelImage,
            aspectRatio,
            variantCount: variantCount[0],
            varianceFactors,
            useImageInteraction,
            imageInteractionDescription,
            creativeTrendType,
            selectedPreset,
            aiTrendDescription,
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Product Images Dropzone */}
            <div className="space-y-3">
                <Label className="section-title flex items-center gap-3">
                    <Layers className="w-5 h-5 text-[var(--primary)]" />
                    Product Reference Images
                </Label>
                <p className="text-sm text-muted-foreground">
                    📍 Image order matters! The AI references images as #1, #2, #3, etc. in order of upload.
                </p>
                <FileDropzone
                    onFilesChange={setProductImages}
                    maxFiles={14}
                    label="Upload up to 14 product images"
                    sublabel="Drag to reorder after uploading"
                />
            </div>

            <Separator className="bg-border/50" />

            {/* Reference Image Interaction Toggle + Textarea */}
            <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)]">
                            <MessageSquare className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <p className="font-medium">Reference Image Interaction</p>
                            <p className="text-sm text-muted-foreground">
                                Describe how multiple images should be combined or composited
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={useImageInteraction}
                        onCheckedChange={setUseImageInteraction}
                        disabled={productImages.length < 2}
                    />
                </div>
                {useImageInteraction && productImages.length >= 2 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <Textarea
                            placeholder={`Example: "Use the person from [image 1] and place them on top of the mountain from [image 2]" or "Extract the product from [image 1] and position it in the hands of the model from [image 2]"`}
                            value={imageInteractionDescription}
                            onChange={(e) => setImageInteractionDescription(e.target.value)}
                            className="min-h-[100px] bg-card border-border resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            💡 Tip: Reference images as [image 1], [image 2], etc. based on upload order
                        </p>
                    </motion.div>
                )}
            </div>

            <Separator className="bg-border/50" />

            {/* Creative Trend Selector */}
            <div className="space-y-4">
                <Label className="section-title flex items-center gap-3">
                    <Image className="w-5 h-5 text-[var(--secondary)]" />
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
                {creativeTrendType === "preset" && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                            <SelectTrigger className="w-full bg-card border-border">
                                <SelectValue placeholder="Select a creative preset" />
                            </SelectTrigger>
                            <SelectContent>
                                {CREATIVE_TREND_PRESET_OPTIONS.map((preset) => (
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

                {/* AI-Generated Trend Description (when AI is selected) */}
                {creativeTrendType === "ai" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <Textarea
                            placeholder="Describe the creative trend you want AI to generate...\n\nExample: 'A luxurious spa-inspired aesthetic with soft pastel colors, misty backgrounds, and zen-like product placement'"
                            value={aiTrendDescription}
                            onChange={(e) => setAiTrendDescription(e.target.value)}
                            className="min-h-[100px] bg-card border-border resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            💡 AI will generate a detailed creative trend based on your description
                        </p>
                    </motion.div>
                )}

                {/* Custom Trend Prompt (when Custom is selected) */}
                {creativeTrendType === "custom" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <Textarea
                            placeholder="Write your complete creative trend prompt...\n\nInclude details like:\n- Visual style and aesthetic\n- Color palette and lighting\n- Camera angles and composition\n- Mood and atmosphere\n- Any specific elements to include/avoid"
                            value={customTrendPrompt}
                            onChange={(e) => setCustomTrendPrompt(e.target.value)}
                            className="min-h-[120px] bg-card border-border resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            ✍️ Your prompt will be used directly for image generation
                        </p>
                    </motion.div>
                )}
            </div>

            <Separator className="bg-border/50" />

            {/* Brand Guidelines */}
            <div className="space-y-3">
                <Label className="field-label flex items-center gap-2.5">
                    <Wand2 className="w-4 h-4 text-[var(--accent)]" />
                    Brand Guidelines
                </Label>
                <Textarea
                    placeholder="Describe your brand's tone, voice, do's and don'ts..."
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    className="min-h-[100px] bg-card border-border resize-none"
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

            {/* Look & Feel Reference */}
            <div className="space-y-3">
                <Label className="field-label">Look & Feel Reference (Moodboard)</Label>
                <p className="text-sm text-muted-foreground">
                    This image will be #{productImages.length + 1} in the reference order
                </p>
                <FileDropzone
                    onFilesChange={(files) => setLookAndFeelImage(files[0] || null)}
                    maxFiles={1}
                    label="Upload a moodboard image"
                    sublabel="This sets the visual direction"
                    indexOffset={productImages.length}
                />
            </div>

            <Separator className="bg-border/50" />

            {/* Aspect Ratio & Variant Count */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="field-label">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="bg-card border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="9:16">9:16 (TikTok/Reels)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-3">
                    <Label className="field-label">Variants: {variantCount[0]}</Label>
                    <Slider
                        value={variantCount}
                        onValueChange={setVariantCount}
                        min={1}
                        max={10}
                        step={1}
                        className="py-4"
                    />
                </div>
            </div>

            {/* Variance Factors */}
            <div className="space-y-4">
                <Label className="field-label">Variance Factors</Label>
                <div className="flex flex-wrap gap-2">
                    {VARIANCE_FACTORS.map((factor) => {
                        const isSelected = varianceFactors.includes(factor.id);
                        const Icon = factor.icon;
                        return (
                            <motion.button
                                key={factor.id}
                                onClick={() => toggleVarianceFactor(factor.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isSelected
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {factor.label}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Generate Button */}
            <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                <Button
                    onClick={handleGenerate}
                    disabled={productImages.length === 0 || isGenerating}
                    className="w-full h-16 text-lg font-semibold gradient-primary text-black hover:opacity-90 transition-all disabled:opacity-50 btn-premium shadow-lg shadow-[var(--primary)]/20"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generate {variantCount[0]} Image{variantCount[0] > 1 ? "s" : ""}
                        </>
                    )}
                </Button>
            </motion.div>
            {/* Pricing Note */}
            <p className="text-center text-[13px] text-muted-foreground mt-3">
                Est. cost: <span className="font-semibold text-foreground">${(variantCount[0] * 0.134).toFixed(2)}</span>
                <span className="text-xs ml-1.5 opacity-75">($0.134/image · gemini-3-pro-image-preview)</span>
            </p>
        </motion.div>
    );
}
