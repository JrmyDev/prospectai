import {
  SlideLayout,
  SlideElement,
  SlideBackground,
  PresentationSlide,
  PresentationTheme,
  AISlidePayload,
  CANVAS_DIMENSIONS,
  SlideFormat,
} from './types';

// ─── Default elements for each layout ──────────────────────────────────────
// All positions/sizes are in % of canvas. Font sizes are in virtual px at base resolution.

type LayoutGenerator = (theme: PresentationTheme, format: SlideFormat) => {
  elements: SlideElement[];
  background: SlideBackground;
};

let _uid = 0;
function uid(): string {
  return `el-${Date.now()}-${++_uid}`;
}

// ─── COVER ─────────────────────────────────────────────────────────────────
const coverLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.primary },
  elements: [
    {
      id: uid(), type: 'shape',
      x: 0, y: 0, width: 100, height: 100,
      backgroundColor: theme.colors.primary,
      zIndex: 0, locked: true,
    },
    ...(theme.logoUrl ? [{
      id: uid(), type: 'image' as const,
      x: 8, y: 6, width: 8, height: 8,
      imageUrl: theme.logoUrl, objectFit: 'contain' as const,
      zIndex: 2,
    }] : []),
    {
      id: uid(), type: 'subheading',
      x: 8, y: 22, width: 50, height: 5,
      content: 'Proposition commerciale',
      fontSize: 18, fontWeight: '500', fontFamily: 'body',
      color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 3,
      textAlign: 'left', zIndex: 3,
    },
    {
      id: uid(), type: 'heading',
      x: 8, y: 30, width: 75, height: 28,
      content: 'Titre de la présentation',
      fontSize: 56, fontWeight: '800', fontFamily: 'heading',
      color: theme.colors.textOnPrimary, textAlign: 'left', lineHeight: 1.1,
      zIndex: 4,
    },
    {
      id: uid(), type: 'body',
      x: 8, y: 62, width: 55, height: 12,
      content: 'Description courte de la proposition et de sa valeur ajoutée.',
      fontSize: 20, fontWeight: '400', fontFamily: 'body',
      color: 'rgba(255,255,255,0.8)', textAlign: 'left', lineHeight: 1.6,
      zIndex: 5,
    },
    {
      id: uid(), type: 'shape',
      x: 8, y: 80, width: 12, height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.4)', zIndex: 6,
    },
    {
      id: uid(), type: 'body',
      x: 8, y: 84, width: 40, height: 5,
      content: theme.brandName || '',
      fontSize: 14, fontWeight: '500', fontFamily: 'body',
      color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2,
      textAlign: 'left', zIndex: 7,
    },
  ],
});

// ─── SECTION DIVIDER ───────────────────────────────────────────────────────
const sectionLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.primary },
  elements: [
    {
      id: uid(), type: 'shape',
      x: 0, y: 0, width: 100, height: 100,
      backgroundColor: theme.colors.primary, zIndex: 0, locked: true,
    },
    {
      id: uid(), type: 'heading',
      x: 10, y: 35, width: 80, height: 20,
      content: 'Titre de section',
      fontSize: 48, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.textOnPrimary, textAlign: 'center', lineHeight: 1.2,
      zIndex: 2,
    },
    {
      id: uid(), type: 'shape',
      x: 45, y: 60, width: 10, height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.4)', zIndex: 3,
    },
  ],
});

// ─── TITLE + CONTENT ───────────────────────────────────────────────────────
const titleContentLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.background },
  elements: [
    {
      id: uid(), type: 'shape',
      x: 0, y: 0, width: 0.6, height: 100,
      backgroundColor: theme.colors.primary, zIndex: 1, locked: true,
    },
    {
      id: uid(), type: 'heading',
      x: 6, y: 8, width: 88, height: 12,
      content: 'Titre de la slide',
      fontSize: 36, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.2,
      zIndex: 2,
    },
    {
      id: uid(), type: 'body',
      x: 6, y: 24, width: 88, height: 60,
      content: 'Contenu principal de la slide. Décrivez vos points clés, arguments et informations importantes ici.\n\nVous pouvez utiliser plusieurs paragraphes pour organiser le contenu.',
      fontSize: 20, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.7,
      zIndex: 3,
    },
    {
      id: uid(), type: 'body',
      x: 80, y: 92, width: 14, height: 4,
      content: '',
      fontSize: 12, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.textMuted, textAlign: 'right',
      zIndex: 10, locked: true,
    },
  ],
});

// ─── TWO COLUMNS ───────────────────────────────────────────────────────────
const twoColumnsLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.background },
  elements: [
    {
      id: uid(), type: 'shape',
      x: 0, y: 0, width: 0.6, height: 100,
      backgroundColor: theme.colors.primary, zIndex: 1, locked: true,
    },
    {
      id: uid(), type: 'heading',
      x: 6, y: 8, width: 88, height: 10,
      content: 'Titre à deux colonnes',
      fontSize: 32, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.2,
      zIndex: 2,
    },
    {
      id: uid(), type: 'body',
      x: 6, y: 24, width: 42, height: 60,
      content: 'Colonne gauche : premier ensemble de points, arguments ou informations.',
      fontSize: 18, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.7,
      zIndex: 3,
    },
    {
      id: uid(), type: 'body',
      x: 52, y: 24, width: 42, height: 60,
      content: 'Colonne droite : second ensemble de points, arguments ou informations.',
      fontSize: 18, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.7,
      zIndex: 4,
    },
    {
      id: uid(), type: 'body',
      x: 80, y: 92, width: 14, height: 4,
      content: '',
      fontSize: 12, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.textMuted, textAlign: 'right',
      zIndex: 10, locked: true,
    },
  ],
});

// ─── IMAGE LEFT ────────────────────────────────────────────────────────────
const imageLeftLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.background },
  elements: [
    {
      id: uid(), type: 'image',
      x: 0, y: 0, width: 45, height: 100,
      imageUrl: '', objectFit: 'cover', borderRadius: 0,
      zIndex: 1,
    },
    {
      id: uid(), type: 'heading',
      x: 50, y: 15, width: 44, height: 15,
      content: 'Titre avec image',
      fontSize: 32, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.2,
      zIndex: 2,
    },
    {
      id: uid(), type: 'body',
      x: 50, y: 35, width: 44, height: 50,
      content: 'Description détaillée accompagnant l\'image. Utilisez cet espace pour expliquer le visuel ou ajouter des détails importants.',
      fontSize: 18, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.7,
      zIndex: 3,
    },
  ],
});

// ─── IMAGE RIGHT ───────────────────────────────────────────────────────────
const imageRightLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.background },
  elements: [
    {
      id: uid(), type: 'heading',
      x: 6, y: 15, width: 44, height: 15,
      content: 'Titre avec image',
      fontSize: 32, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.2,
      zIndex: 2,
    },
    {
      id: uid(), type: 'body',
      x: 6, y: 35, width: 44, height: 50,
      content: 'Description détaillée accompagnant l\'image.',
      fontSize: 18, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.7,
      zIndex: 3,
    },
    {
      id: uid(), type: 'image',
      x: 55, y: 0, width: 45, height: 100,
      imageUrl: '', objectFit: 'cover', borderRadius: 0,
      zIndex: 1,
    },
  ],
});

// ─── FULL IMAGE ────────────────────────────────────────────────────────────
const fullImageLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: '#000000' },
  elements: [
    {
      id: uid(), type: 'image',
      x: 0, y: 0, width: 100, height: 100,
      imageUrl: '', objectFit: 'cover', opacity: 0.6,
      zIndex: 1,
    },
    {
      id: uid(), type: 'heading',
      x: 10, y: 35, width: 80, height: 18,
      content: 'Titre sur image plein écran',
      fontSize: 44, fontWeight: '700', fontFamily: 'heading',
      color: '#ffffff', textAlign: 'center', lineHeight: 1.2,
      zIndex: 3,
    },
    {
      id: uid(), type: 'body',
      x: 15, y: 58, width: 70, height: 12,
      content: 'Sous-titre ou description courte.',
      fontSize: 20, fontWeight: '400', fontFamily: 'body',
      color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.6,
      zIndex: 4,
    },
  ],
});

// ─── STATS ─────────────────────────────────────────────────────────────────
const statsLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.surface },
  elements: [
    {
      id: uid(), type: 'heading',
      x: 6, y: 8, width: 88, height: 10,
      content: 'Chiffres clés',
      fontSize: 32, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.text, textAlign: 'left', lineHeight: 1.2,
      zIndex: 1,
    },
    {
      id: uid(), type: 'stat',
      x: 6, y: 30, width: 26, height: 40,
      statValue: '95%', statLabel: 'Taux de satisfaction',
      fontSize: 56, fontWeight: '800', fontFamily: 'heading',
      color: theme.colors.primary, textAlign: 'center',
      backgroundColor: theme.colors.background, borderRadius: 16,
      zIndex: 2,
    },
    {
      id: uid(), type: 'stat',
      x: 37, y: 30, width: 26, height: 40,
      statValue: '2x', statLabel: 'Croissance du CA',
      fontSize: 56, fontWeight: '800', fontFamily: 'heading',
      color: theme.colors.primary, textAlign: 'center',
      backgroundColor: theme.colors.background, borderRadius: 16,
      zIndex: 3,
    },
    {
      id: uid(), type: 'stat',
      x: 68, y: 30, width: 26, height: 40,
      statValue: '30j', statLabel: 'Délai de livraison',
      fontSize: 56, fontWeight: '800', fontFamily: 'heading',
      color: theme.colors.primary, textAlign: 'center',
      backgroundColor: theme.colors.background, borderRadius: 16,
      zIndex: 4,
    },
    {
      id: uid(), type: 'body',
      x: 80, y: 92, width: 14, height: 4,
      content: '',
      fontSize: 12, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.textMuted, textAlign: 'right',
      zIndex: 10, locked: true,
    },
  ],
});

// ─── QUOTE ─────────────────────────────────────────────────────────────────
const quoteLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.surface },
  elements: [
    {
      id: uid(), type: 'shape',
      x: 10, y: 22, width: 6, height: 10,
      backgroundColor: 'transparent',
      zIndex: 1,
    },
    {
      id: uid(), type: 'quote',
      x: 12, y: 25, width: 76, height: 30,
      content: '« Une citation inspirante ou un témoignage client impactant. »',
      fontSize: 32, fontWeight: '500', fontFamily: 'heading',
      color: theme.colors.text, textAlign: 'center', lineHeight: 1.5,
      zIndex: 2,
    },
    {
      id: uid(), type: 'body',
      x: 25, y: 62, width: 50, height: 8,
      content: '— Nom, Titre, Entreprise',
      fontSize: 18, fontWeight: '400', fontFamily: 'body',
      color: theme.colors.textMuted, textAlign: 'center',
      zIndex: 3,
    },
    {
      id: uid(), type: 'shape',
      x: 45, y: 58, width: 10, height: 0.3,
      backgroundColor: theme.colors.primary, zIndex: 4,
    },
  ],
});

// ─── CLOSING ───────────────────────────────────────────────────────────────
const closingLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.primary },
  elements: [
    {
      id: uid(), type: 'shape',
      x: 0, y: 0, width: 100, height: 100,
      backgroundColor: theme.colors.primary, zIndex: 0, locked: true,
    },
    ...(theme.logoUrl ? [{
      id: uid(), type: 'image' as const,
      x: 44, y: 18, width: 12, height: 12,
      imageUrl: theme.logoUrl, objectFit: 'contain' as const, zIndex: 2,
    }] : []),
    {
      id: uid(), type: 'heading',
      x: 10, y: 36, width: 80, height: 15,
      content: 'Prochaine étape',
      fontSize: 44, fontWeight: '700', fontFamily: 'heading',
      color: theme.colors.textOnPrimary, textAlign: 'center', lineHeight: 1.2,
      zIndex: 3,
    },
    {
      id: uid(), type: 'body',
      x: 15, y: 55, width: 70, height: 15,
      content: 'Contactez-nous pour discuter de votre projet.\nemail@exemple.com · +33 1 23 45 67 89',
      fontSize: 20, fontWeight: '400', fontFamily: 'body',
      color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.6,
      zIndex: 4,
    },
    {
      id: uid(), type: 'shape',
      x: 42, y: 78, width: 16, height: 0.4,
      backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 5,
    },
    {
      id: uid(), type: 'body',
      x: 20, y: 82, width: 60, height: 5,
      content: theme.brandName || '',
      fontSize: 14, fontWeight: '500', fontFamily: 'body',
      color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 3,
      textAlign: 'center', zIndex: 6,
    },
  ],
});

// ─── BLANK ─────────────────────────────────────────────────────────────────
const blankLayout: LayoutGenerator = (theme) => ({
  background: { type: 'solid', color: theme.colors.background },
  elements: [],
});

// ─── Registry ──────────────────────────────────────────────────────────────
const LAYOUT_GENERATORS: Record<SlideLayout, LayoutGenerator> = {
  cover: coverLayout,
  section: sectionLayout,
  titleContent: titleContentLayout,
  twoColumns: twoColumnsLayout,
  imageLeft: imageLeftLayout,
  imageRight: imageRightLayout,
  fullImage: fullImageLayout,
  stats: statsLayout,
  quote: quoteLayout,
  closing: closingLayout,
  blank: blankLayout,
};

export function generateSlideFromLayout(
  layout: SlideLayout,
  theme: PresentationTheme,
  format: SlideFormat = '16:9',
): PresentationSlide {
  const generator = LAYOUT_GENERATORS[layout] || LAYOUT_GENERATORS.blank;
  const { elements, background } = generator(theme, format);
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    layout,
    elements,
    background,
  };
}

export const LAYOUT_OPTIONS: { value: SlideLayout; label: string; icon: string }[] = [
  { value: 'cover', label: 'Couverture', icon: '📘' },
  { value: 'section', label: 'Section', icon: '📑' },
  { value: 'titleContent', label: 'Titre + Contenu', icon: '📄' },
  { value: 'twoColumns', label: 'Deux colonnes', icon: '📊' },
  { value: 'imageLeft', label: 'Image gauche', icon: '🖼️' },
  { value: 'imageRight', label: 'Image droite', icon: '🖼️' },
  { value: 'fullImage', label: 'Image pleine', icon: '🌄' },
  { value: 'stats', label: 'Statistiques', icon: '📈' },
  { value: 'quote', label: 'Citation', icon: '💬' },
  { value: 'closing', label: 'Conclusion', icon: '🎯' },
  { value: 'blank', label: 'Vierge', icon: '⬜' },
];

// ─── Populate layout from AI payload ───────────────────────────────────────
export function populateSlideFromAI(
  payload: AISlidePayload,
  theme: PresentationTheme,
  format: SlideFormat = '16:9',
): PresentationSlide {
  const base = generateSlideFromLayout(payload.layout, theme, format);

  // Apply AI background override
  if (payload.background) {
    base.background = { ...base.background, ...payload.background };
  }

  // Fill in AI-provided content into matching element slots sequentially.
  // Track which slots have been used so we don't fill the same slot twice.
  const aiElements = payload.elements || [];
  const usedSlotIds = new Set<string>();

  for (const aiEl of aiElements) {
    // Treat bulletList as body for slot matching (bulletList content goes into body slots)
    const matchTypes = aiEl.type === 'bulletList' ? ['bulletList', 'body'] : [aiEl.type];

    // Find the first UNUSED matching element slot
    const target = base.elements.find(
      (e) => matchTypes.includes(e.type) && !e.locked && !usedSlotIds.has(e.id)
    );

    if (target) {
      usedSlotIds.add(target.id);
      if (aiEl.content !== undefined) target.content = aiEl.content;
      if (aiEl.statValue !== undefined) target.statValue = aiEl.statValue;
      if (aiEl.statLabel !== undefined) target.statLabel = aiEl.statLabel;
      if (aiEl.imageUrl !== undefined && aiEl.imageUrl) target.imageUrl = aiEl.imageUrl;
    } else {
      // No matching slot: append a new element with appropriate positioning
      const existingMaxY = base.elements.reduce((max, e) => Math.max(max, e.y + e.height), 0);
      const newY = Math.min(existingMaxY + 2, 85);
      const newEl: SlideElement = {
        id: uid(),
        type: aiEl.type === 'bulletList' ? 'body' : aiEl.type,
        x: 6, y: newY, width: 88, height: 15,
        content: aiEl.content,
        statValue: aiEl.statValue,
        statLabel: aiEl.statLabel,
        imageUrl: aiEl.imageUrl,
        fontSize: aiEl.type === 'heading' ? 32 : aiEl.type === 'subheading' ? 20 : aiEl.type === 'stat' ? 48 : aiEl.type === 'quote' ? 28 : 18,
        fontWeight: (aiEl.type === 'heading' || aiEl.type === 'stat') ? '700' : aiEl.type === 'quote' ? '500' : '400',
        fontFamily: (aiEl.type === 'heading' || aiEl.type === 'subheading' || aiEl.type === 'stat' || aiEl.type === 'quote') ? 'heading' : 'body',
        color: theme.colors.text,
        textAlign: aiEl.type === 'quote' ? 'center' : 'left',
        lineHeight: 1.6,
        zIndex: base.elements.length + 1,
      };
      if (aiEl.type === 'stat') {
        newEl.color = theme.colors.primary;
        newEl.backgroundColor = theme.colors.background;
        newEl.borderRadius = 16;
        newEl.textAlign = 'center';
        newEl.width = 26;
        newEl.height = 40;
      }
      base.elements.push(newEl);
    }
  }

  if (payload.notes) base.notes = payload.notes;
  return base;
}

// ─── Update page numbers ───────────────────────────────────────────────────
export function updatePageNumbers(slides: PresentationSlide[]): PresentationSlide[] {
  return slides.map((slide, i) => ({
    ...slide,
    elements: slide.elements.map((el) => {
      // Page counter element: locked body at bottom-right with empty content
      if (el.locked && el.type === 'body' && el.x >= 70 && el.y >= 85) {
        return { ...el, content: `${i + 1} / ${slides.length}` };
      }
      return el;
    }),
  }));
}
