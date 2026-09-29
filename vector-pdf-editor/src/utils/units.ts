import { Unit, PagePreset, PageOrientation } from '../types/document';

// Standard 96 DPI conversion: 1 inch = 25.4 mm = 96 px
export const MM_TO_PX = 96 / 25.4; // ~3.779527559055118 px per mm
export const PX_TO_MM = 25.4 / 96;

// Points (PDF standard: 72 points per inch)
export const MM_TO_PT = 72 / 25.4; // ~2.834645669291339 pt per mm
export const PT_TO_MM = 25.4 / 72;

export function convertFromMm(valueMm: number, toUnit: Unit): number {
  switch (toUnit) {
    case 'cm':
      return valueMm / 10;
    case 'inch':
      return valueMm / 25.4;
    case 'mm':
    default:
      return valueMm;
  }
}

export function convertToMm(value: number, fromUnit: Unit): number {
  switch (fromUnit) {
    case 'cm':
      return value * 10;
    case 'inch':
      return value * 25.4;
    case 'mm':
    default:
      return value;
  }
}

export function formatUnitValue(valueMm: number, unit: Unit, decimals = 2): string {
  const converted = convertFromMm(valueMm, unit);
  return `${converted.toFixed(decimals)} ${unit}`;
}

export function formatNumberOnly(valueMm: number, unit: Unit, decimals = 2): string {
  const converted = convertFromMm(valueMm, unit);
  return converted.toFixed(decimals);
}

export interface PresetDimension {
  width: number; // in mm
  height: number; // in mm
}

export const PAGE_PRESETS: Record<Exclude<PagePreset, 'Custom'>, PresetDimension> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
};

export function getPageDimensions(
  preset: PagePreset,
  orientation: PageOrientation,
  customWidthMm = 210,
  customHeightMm = 297
): { width: number; height: number } {
  let w = customWidthMm;
  let h = customHeightMm;

  if (preset !== 'Custom' && PAGE_PRESETS[preset]) {
    w = PAGE_PRESETS[preset].width;
    h = PAGE_PRESETS[preset].height;
  }

  // Ensure portrait vs landscape orientation
  if (orientation === 'landscape') {
    return { width: Math.max(w, h), height: Math.min(w, h) };
  } else {
    return { width: Math.min(w, h), height: Math.max(w, h) };
  }
}
