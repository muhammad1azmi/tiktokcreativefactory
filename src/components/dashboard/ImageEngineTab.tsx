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
    useAIStoryline: boolean;
    aspectRatio: string;
    variantCount: number;
    varianceFactors: string[];
    selectedTrend: string;
}

const TREND_OPTIONS = [
    { value: "reali-tea", label: "Reali-TEA", description: "Raw, unpolished macro shots" },
    { value: "emotional-roi", label: "Emotional ROI", description: "Golden hour, soft textures" },
    { value: "curiosity-detours", label: "Curiosity Detours", description: "Visual plot twists" },
    { value: "go-analogue", label: "Go Analogue", description: "Film grain, retro vibes" },
    { value: "standard-promo", label: "Standard Promo", description: "Clean, polished professional" },
];

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
    const [useAIStoryline, setUseAIStoryline] = useState(true);
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [variantCount, setVariantCount] = useState([3]);
    const [varianceFactors, setVarianceFactors] = useState<string[]>(["lighting", "camera-angle"]);
    const [selectedTrend, setSelectedTrend] = useState("standard-promo");

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
            useAIStoryline,
            aspectRatio,
            variantCount: variantCount[0],
            varianceFactors,
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
            {/* Product Images Dropzone */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5 text-[var(--primary)]" />
                    Product Reference Images
                </Label>
                <FileDropzone
                    onFilesChange={setProductImages}
                    maxFiles={14}
                    label="Upload up to 14 product images"
                    sublabel="These will be analyzed for multi-view generation"
                />
            </div>

            <Separator className="bg-border/50" />

            {/* Trend Selector */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-[var(--secondary)]" />
                    Creative Trend
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
                    placeholder="Describe your brand's tone, voice, do's and don'ts..."
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

            {/* Look & Feel Reference */}
            <div className="space-y-2">
                <Label>Look & Feel Reference (Moodboard)</Label>
                <FileDropzone
                    onFilesChange={(files) => setLookAndFeelImage(files[0] || null)}
                    maxFiles={1}
                    label="Upload a moodboard image"
                    sublabel="This sets the visual direction"
                />
            </div>

            <Separator className="bg-border/50" />

            {/* AI Storyline Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]">
                        <Sparkles className="w-5 h-5 text-black" />
                    </div>
                    <div>
                        <p className="font-medium">AI Storyline Generation</p>
                        <p className="text-sm text-muted-foreground">
                            Use AI to generate unique creative concepts for each variant
                        </p>
                    </div>
                </div>
                <Switch
                    checked={useAIStoryline}
                    onCheckedChange={setUseAIStoryline}
                />
            </div>

            {/* Aspect Ratio & Variant Count */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
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
                <div className="space-y-2">
                    <Label>Variants: {variantCount[0]}</Label>
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
            <div className="space-y-3">
                <Label>Variance Factors</Label>
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
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                    onClick={handleGenerate}
                    disabled={productImages.length === 0 || isGenerating}
                    className="w-full h-14 text-lg font-semibold gradient-primary text-black hover:opacity-90 transition-opacity disabled:opacity-50"
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
            <p className="text-center text-sm text-muted-foreground mt-2">
                Est. cost: <span className="font-medium text-foreground">${(variantCount[0] * 0.134).toFixed(2)}</span>
                <span className="text-xs ml-1">($0.134/image · gemini-3-pro-image-preview)</span>
            </p>
        </motion.div>
    );
}
