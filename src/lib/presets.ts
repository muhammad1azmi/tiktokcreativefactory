// Client-safe Creative Trend Presets export
// This file can be imported in client components (no Node.js dependencies)

import creativeTrendPresetsData from "./creative-trend-presets.json";

export interface CreativeTrendPreset {
    id: string;
    name: string;
    description: string;
    prompt: string;
}

// Export list for UI dropdowns
export const CREATIVE_TREND_PRESET_LIST: CreativeTrendPreset[] = creativeTrendPresetsData.presets;

// Export as lookup object
export const CREATIVE_TREND_PRESETS: Record<string, { name: string; prompt: string }> =
    creativeTrendPresetsData.presets.reduce((acc, preset) => {
        acc[preset.id] = { name: preset.name, prompt: preset.prompt };
        return acc;
    }, {} as Record<string, { name: string; prompt: string }>);
