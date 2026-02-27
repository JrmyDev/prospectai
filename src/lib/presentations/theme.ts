import {
  PresentationTheme,
  PresentationThemeColors,
  ThemePreset,
} from './types';

export interface BrandProfileInput {
  name?: string;
  companyName?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontGoogle?: string | null;
}

// Lighten/darken helpers using simple HSL manipulation
function hexToHSL(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const h6 = hex.replace('#', '');
  if (h6.length === 3) {
    r = parseInt(h6[0] + h6[0], 16) / 255;
    g = parseInt(h6[1] + h6[1], 16) / 255;
    b = parseInt(h6[2] + h6[2], 16) / 255;
  } else {
    r = parseInt(h6.substring(0, 2), 16) / 255;
    g = parseInt(h6.substring(2, 4), 16) / 255;
    b = parseInt(h6.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100, l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lighten(hex: string, amount: number): string {
  const [h, s, l] = hexToHSL(hex);
  return hslToHex(h, s, Math.min(100, l + amount));
}

function isDark(hex: string): boolean {
  const [, , l] = hexToHSL(hex);
  return l < 55;
}

// Preset-specific color derivation
const PRESET_DEFAULTS: Record<ThemePreset, (primary: string, secondary: string, accent: string) => PresentationThemeColors> = {
  modern: (primary, secondary, accent) => ({
    primary,
    secondary,
    accent,
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
    textOnPrimary: isDark(primary) ? '#ffffff' : '#0f172a',
  }),
  corporate: (primary, secondary, accent) => ({
    primary,
    secondary,
    accent,
    background: '#ffffff',
    surface: '#f1f5f9',
    text: '#1e293b',
    textMuted: '#475569',
    textOnPrimary: isDark(primary) ? '#ffffff' : '#1e293b',
  }),
  creative: (primary, secondary, accent) => ({
    primary,
    secondary,
    accent,
    background: '#fafaf9',
    surface: lighten(primary, 42),
    text: '#1c1917',
    textMuted: '#78716c',
    textOnPrimary: isDark(primary) ? '#ffffff' : '#1c1917',
  }),
  minimal: (primary, _secondary, accent) => ({
    primary,
    secondary: '#e2e8f0',
    accent,
    background: '#ffffff',
    surface: '#fafafa',
    text: '#18181b',
    textMuted: '#a1a1aa',
    textOnPrimary: isDark(primary) ? '#ffffff' : '#18181b',
  }),
  techvisor: (primary, secondary, accent) => ({
    primary,
    secondary,
    accent,
    background: '#ffffff',
    surface: '#f0f4f8',
    text: '#0f172a',
    textMuted: '#64748b',
    textOnPrimary: '#ffffff',
  }),
};

const PRESET_COLOR_DEFAULTS: Record<ThemePreset, { primary: string; secondary: string; accent: string }> = {
  modern: { primary: '#0f172a', secondary: '#334155', accent: '#3b82f6' },
  corporate: { primary: '#0f172a', secondary: '#334155', accent: '#3b82f6' },
  creative: { primary: '#0f172a', secondary: '#334155', accent: '#3b82f6' },
  minimal: { primary: '#0f172a', secondary: '#334155', accent: '#3b82f6' },
  techvisor: { primary: '#0a1628', secondary: '#162d50', accent: '#06b6d4' },
};

export function buildTheme(brand: BrandProfileInput | null | undefined, preset: ThemePreset = 'modern'): PresentationTheme {
  const defaults = PRESET_COLOR_DEFAULTS[preset];
  const primary = brand?.primaryColor || defaults.primary;
  const secondary = brand?.secondaryColor || defaults.secondary;
  const accent = brand?.accentColor || defaults.accent;
  const deriveFn = PRESET_DEFAULTS[preset];
  const colors = deriveFn(primary, secondary, accent);

  return {
    preset,
    colors,
    fontHeading: brand?.fontGoogle || 'Inter',
    fontBody: brand?.fontGoogle || 'Inter',
    logoUrl: brand?.logoUrl || undefined,
    brandName: brand?.companyName || brand?.name || '',
  };
}

export const THEME_PRESETS: { value: ThemePreset; label: string; description: string }[] = [
  { value: 'modern', label: 'Moderne', description: 'Design épuré aux accents vifs' },
  { value: 'corporate', label: 'Corporate', description: 'Professionnel et structuré' },
  { value: 'creative', label: 'Créatif', description: 'Coloré et expressif' },
  { value: 'minimal', label: 'Minimal', description: 'Sobre et aéré' },
  { value: 'techvisor', label: 'Techvisor', description: 'Premium tech & consulting' },
];

export function googleFontUrl(fontFamily: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800;900&display=swap`;
}
