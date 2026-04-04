/** HSL components for Tailwind hsl(var(--primary)) — values are `h s% l%` without hsl(). */

export type TenantThemePreset =
  | "default"
  | "teal"
  | "violet"
  | "amber"
  | "rose"
  | "emerald"
  | "custom";

export type TenantThemeSettings = {
  preset?: TenantThemePreset | string;
  primaryH?: number;
  primaryS?: number;
  primaryL?: number;
};

const PRESETS: Record<string, { h: number; s: number; l: number }> = {
  default: { h: 221, s: 83, l: 53 },
  teal: { h: 173, s: 58, l: 39 },
  violet: { h: 262, s: 83, l: 58 },
  amber: { h: 32, s: 95, l: 44 },
  rose: { h: 346, s: 77, l: 50 },
  emerald: { h: 160, s: 84, l: 39 },
};

export function parseThemeFromSettings(settings: Record<string, unknown> | null | undefined): TenantThemeSettings | null {
  const raw = settings?.theme;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const t = raw as Record<string, unknown>;
  const preset = typeof t.preset === "string" ? t.preset : "default";
  return {
    preset,
    primaryH: typeof t.primaryH === "number" ? t.primaryH : undefined,
    primaryS: typeof t.primaryS === "number" ? t.primaryS : undefined,
    primaryL: typeof t.primaryL === "number" ? t.primaryL : undefined,
  };
}

export function hslTripletFromTheme(theme: TenantThemeSettings | null): { h: number; s: number; l: number } {
  if (theme?.preset === "custom" && theme.primaryH != null && theme.primaryS != null && theme.primaryL != null) {
    return {
      h: clamp(theme.primaryH, 0, 360),
      s: clamp(theme.primaryS, 0, 100),
      l: clamp(theme.primaryL, 0, 100),
    };
  }
  const key = theme?.preset && PRESETS[theme.preset] ? theme.preset : "default";
  return PRESETS[key] ?? PRESETS.default;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function applyTenantThemeToDocument(theme: TenantThemeSettings | null) {
  if (typeof document === "undefined") return;
  const { h, s, l } = hslTripletFromTheme(theme);
  const root = document.documentElement;
  const primary = `${h} ${s}% ${l}%`;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
}

export function resetTenantThemeToDefault() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--ring");
}

export const THEME_PRESET_OPTIONS: { value: TenantThemePreset; label: string }[] = [
  { value: "default", label: "Blue (default)" },
  { value: "teal", label: "Teal" },
  { value: "violet", label: "Violet" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "emerald", label: "Emerald" },
  { value: "custom", label: "Custom (sliders)" },
];
