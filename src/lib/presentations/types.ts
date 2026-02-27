// ─── Presentation data model ───────────────────────────────────────────────

export type SlideFormat = '16:9' | 'A4';

export type SlideLayout =
  | 'cover'
  | 'section'
  | 'titleContent'
  | 'twoColumns'
  | 'imageLeft'
  | 'imageRight'
  | 'fullImage'
  | 'stats'
  | 'quote'
  | 'closing'
  | 'blank';

export type ElementType = 'heading' | 'subheading' | 'body' | 'bulletList' | 'image' | 'stat' | 'shape' | 'quote';

export interface SlideElement {
  id: string;
  type: ElementType;
  // Position & size in % of slide canvas (0–100)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  locked?: boolean;
  // Text content
  content?: string;
  // Stat-specific
  statValue?: string;
  statLabel?: string;
  // Image
  imageUrl?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // Typography
  fontSize?: number;       // in px, at base resolution (1920×1080 for 16:9)
  fontWeight?: string;
  fontFamily?: 'heading' | 'body'; // references theme fonts
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  // Colors (empty = inherit from theme)
  color?: string;
  backgroundColor?: string;
  // Shape
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
}

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  imageUrl?: string;
  overlay?: string; // rgba overlay on top of image
}

export interface PresentationSlide {
  id: string;
  layout: SlideLayout;
  elements: SlideElement[];
  background: SlideBackground;
  notes?: string;
}

export interface PresentationThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
}

export interface PresentationTheme {
  preset: ThemePreset;
  colors: PresentationThemeColors;
  fontHeading: string;
  fontBody: string;
  logoUrl?: string;
  brandName?: string;
}

export type ThemePreset = 'modern' | 'corporate' | 'creative' | 'minimal' | 'techvisor';

export interface Presentation {
  slides: PresentationSlide[];
  theme: PresentationTheme;
  format: SlideFormat;
}

// Canvas base dimensions (virtual pixels) for each format
export const CANVAS_DIMENSIONS: Record<SlideFormat, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  'A4': { width: 794, height: 1123 },
};

// JSON schema the AI must produce
export interface AISlidePayload {
  layout: SlideLayout;
  background?: Partial<SlideBackground>;
  elements: {
    type: ElementType;
    content?: string;
    statValue?: string;
    statLabel?: string;
    imageUrl?: string;
  }[];
  notes?: string;
}
