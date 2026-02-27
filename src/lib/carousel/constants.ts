import { Branding, BrandProfile, CarouselProject, AspectRatio, TemplateStyle, SlideData } from './types';

export const BRANDS_STORAGE_KEY = 'carousel_ai_brands_v1';

export const AVAILABLE_FONTS = [
  { label: 'Inter (Clean Sans)', value: 'Inter' },
  { label: 'Roboto (Modern Sans)', value: 'Roboto' },
  { label: 'Open Sans (Neutral)', value: 'Open Sans' },
  { label: 'Montserrat (Geometric)', value: 'Montserrat' },
  { label: 'Poppins (Friendly)', value: 'Poppins' },
  { label: 'Lato (Humanist)', value: 'Lato' },
  { label: 'Playfair Display (Elegant Serif)', value: 'Playfair Display' },
  { label: 'Merriweather (Readable Serif)', value: 'Merriweather' },
  { label: 'Lora (Calligraphic Serif)', value: 'Lora' },
  { label: 'Oswald (Bold Condensed)', value: 'Oswald' },
  { label: 'Space Mono (Tech)', value: 'Space Mono' },
];

export const INITIAL_BRANDING: Branding = {
  name: "Alex Creator",
  handle: "@alexcreates",
  avatarUrl: "https://picsum.photos/100/100",
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  fontHeading: "Inter",
  fontBody: "Inter",
  website: "www.alexcreates.com"
};

export const INITIAL_SLIDES: SlideData[] = [
  {
    id: '1',
    type: 'intro',
    title: "The Future of AI Marketing",
    content: "Why 2024 is the turning point for content creators.",
    highlight: "2024"
  },
  {
    id: '2',
    type: 'content',
    title: "1. Personalization at Scale",
    content: "AI allows us to speak to thousands as if we are speaking to one. The era of generic blasts is over.",
    highlight: "10x Engagement"
  },
  {
    id: '3',
    type: 'content',
    title: "2. Speed of Execution",
    content: "What used to take days now takes minutes. Your ability to iterate is your new superpower.",
  },
  {
    id: '4',
    type: 'outro',
    title: "Ready to Start?",
    content: "Follow for more insights on leveraging AI for your business.",
    highlight: "Link in Bio"
  }
];

export const INITIAL_PROJECT: CarouselProject = {
  id: 'init',
  topic: 'AI Marketing Trends',
  aspectRatio: AspectRatio.PORTRAIT,
  template: TemplateStyle.BOLD,
  branding: INITIAL_BRANDING,
  slides: INITIAL_SLIDES
};
