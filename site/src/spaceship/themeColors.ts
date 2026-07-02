import { Color3 } from '@babylonjs/core';

/** Reads a hex-valued CSS custom property (same trick bgCanvas.ts uses for
 * its accent color) so the cockpit's glow/accent colors stay in lockstep
 * with the rest of the site's theme instead of hardcoding a second palette. */
export function themeColorHex(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

export function themeColor3(varName: string, fallback: string): Color3 {
  return Color3.FromHexString(themeColorHex(varName, fallback));
}
