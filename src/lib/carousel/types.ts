export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '4:5',
  A4 = 'A4',
  STORY = '9:16',
  LANDSCAPE = '16:9' // Presentation/Playbook
}

export enum TemplateStyle {
  MINIMAL = 'minimal',
  BOLD = 'bold',
  ELEGANT = 'elegant',
  TECH = 'tech',
  PROPOSAL = 'proposal'
}

export interface Branding {
  name: string;
  handle: string;
  avatarUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontHeading: string;
  fontBody: string;
  website: string;
}

export interface BrandProfile extends Branding {
  id: string;
  profileName: string;
  createdAt: string;
}

export interface VisualElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  locked?: boolean;
  // Text properties
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  // Common visual properties
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  // Image properties
  imageUrl?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // Shadow
  boxShadow?: string;
}

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  imageUrl?: string;
  imageOverlay?: string;
}

export interface SlideData {
  id: string;
  type: 'intro' | 'content' | 'outro';
  title: string;
  content: string;
  highlight?: string;
  imagePrompt?: string;
  imageUrl?: string;
  elements?: VisualElement[];
  background?: SlideBackground;
}

export interface CarouselProject {
  id: string;
  topic: string;
  aspectRatio: AspectRatio;
  template: TemplateStyle;
  branding: Branding;
  slides: SlideData[];
  translations?: Record<string, SlideData[]>;
  activeLang?: string;
}

export interface GeneratedPost {
  platform: 'LinkedIn' | 'Instagram' | 'TikTok' | 'Twitter';
  title: string;
  description: string;
  content: string;
  hashtags: string[];
}

// New Types for Template Library
export enum Industry {
  MARKETING = 'Marketing',
  TECH = 'Tech & SaaS',
  FINANCE = 'Finance',
  REAL_ESTATE = 'Real Estate',
  WELLNESS = 'Health & Wellness',
  COACHING = 'Coaching',
  ECOMMERCE = 'E-commerce'
}

export enum ContentType {
  LEAD_MAGNET = 'Lead Magnet',
  EDUCATIONAL = 'Educational',
  CASE_STUDY = 'Case Study',
  TREND_REPORT = 'Trend Report',
  PROMOTIONAL = 'Promotional'
}

export interface Template {
  id: string;
  name: string;
  industry: Industry;
  type: ContentType;
  project: CarouselProject; // The starting state
}
