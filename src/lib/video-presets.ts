// Client-safe Video Creative Trend Presets export
// This file can be imported in client components (no Node.js dependencies)

import videoCreativeTrendPresetsData from "./video-creative-trend-presets.json";

export interface VideoCreativeTrendPreset {
    id: string;
    name: string;
    description: string;
    prompt: string;
}

// Export list for UI dropdowns
export const VIDEO_CREATIVE_TREND_PRESET_LIST: VideoCreativeTrendPreset[] = videoCreativeTrendPresetsData.presets;

// Export as lookup object
export const VIDEO_CREATIVE_TREND_PRESETS: Record<string, { name: string; prompt: string }> =
    videoCreativeTrendPresetsData.presets.reduce((acc, preset) => {
        acc[preset.id] = { name: preset.name, prompt: preset.prompt };
        return acc;
    }, {} as Record<string, { name: string; prompt: string }>);
