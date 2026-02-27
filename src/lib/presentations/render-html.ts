import {
  PresentationSlide,
  PresentationTheme,
  SlideElement,
  SlideBackground,
  SlideFormat,
  CANVAS_DIMENSIONS,
} from './types';
import { googleFontUrl } from './theme';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bgStyle(bg: SlideBackground, theme: PresentationTheme): string {
  switch (bg.type) {
    case 'gradient':
      return `background: linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.gradientFrom ?? theme.colors.primary}, ${bg.gradientTo ?? theme.colors.secondary});`;
    case 'image': {
      const overlay = bg.overlay ? `background-image: linear-gradient(${bg.overlay}, ${bg.overlay}), url('${esc(bg.imageUrl || '')}');` : `background-image: url('${esc(bg.imageUrl || '')}');`;
      return `${overlay} background-size: cover; background-position: center;`;
    }
    case 'solid':
    default:
      return `background-color: ${bg.color ?? theme.colors.background};`;
  }
}

function elementStyle(el: SlideElement, theme: PresentationTheme): string {
  const font = el.fontFamily === 'heading' ? theme.fontHeading : theme.fontBody;
  const parts: string[] = [
    `position: absolute;`,
    `left: ${el.x}%;`,
    `top: ${el.y}%;`,
    `width: ${el.width}%;`,
    `height: ${el.height}%;`,
  ];
  if (el.opacity !== undefined && el.opacity !== 1) parts.push(`opacity: ${el.opacity};`);
  if (el.rotation) parts.push(`transform: rotate(${el.rotation}deg);`);
  if (el.zIndex !== undefined) parts.push(`z-index: ${el.zIndex};`);
  if (el.backgroundColor) parts.push(`background-color: ${el.backgroundColor};`);
  if (el.borderRadius) parts.push(`border-radius: ${el.borderRadius}px;`);
  if (el.borderWidth) parts.push(`border: ${el.borderWidth}px solid ${el.borderColor || 'transparent'};`);
  if (el.boxShadow) parts.push(`box-shadow: ${el.boxShadow};`);
  // Typography
  if (el.fontSize) parts.push(`font-size: ${el.fontSize}px;`);
  if (el.fontWeight) parts.push(`font-weight: ${el.fontWeight};`);
  parts.push(`font-family: '${font}', system-ui, sans-serif;`);
  if (el.color) parts.push(`color: ${el.color};`);
  if (el.textAlign) parts.push(`text-align: ${el.textAlign};`);
  if (el.lineHeight) parts.push(`line-height: ${el.lineHeight};`);
  if (el.letterSpacing) parts.push(`letter-spacing: ${el.letterSpacing}px;`);
  if (el.textTransform && el.textTransform !== 'none') parts.push(`text-transform: ${el.textTransform};`);
  parts.push(`overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;`);
  // Add padding for text elements
  if (el.type !== 'image' && el.type !== 'shape') parts.push(`padding: 4px 8px;`);
  return parts.join(' ');
}

function renderElement(el: SlideElement, theme: PresentationTheme): string {
  const style = elementStyle(el, theme);

  if (el.type === 'image') {
    if (!el.imageUrl) {
      return `<div style="${style} display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8;font-size:14px;">Image</div>`;
    }
    return `<div style="${style}"><img src="${esc(el.imageUrl)}" alt="" style="width:100%;height:100%;object-fit:${el.objectFit || 'cover'};border-radius:${el.borderRadius || 0}px;display:block;" /></div>`;
  }

  if (el.type === 'shape') {
    return `<div style="${style}"></div>`;
  }

  if (el.type === 'stat') {
    return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
      <div style="font-size:${el.fontSize || 48}px;font-weight:${el.fontWeight || '800'};color:${el.color || theme.colors.primary};line-height:1;">${esc(el.statValue || '')}</div>
      <div style="font-size:${Math.round((el.fontSize || 48) * 0.32)}px;font-weight:500;color:${theme.colors.textMuted};text-transform:uppercase;letter-spacing:1px;">${esc(el.statLabel || '')}</div>
    </div>`;
  }

  // Text elements: heading, subheading, body, bulletList, quote
  const content = (el.content || '').replace(/\n/g, '<br/>');
  return `<div style="${style}">${content}</div>`;
}

function renderSlide(
  slide: PresentationSlide,
  index: number,
  total: number,
  theme: PresentationTheme,
  dims: { width: number; height: number },
): string {
  const bg = bgStyle(slide.background, theme);
  const elements = slide.elements.map((el) => renderElement(el, theme)).join('\n    ');
  return `<section class="slide" style="${bg} width:${dims.width}px; height:${dims.height}px; position:relative; overflow:hidden; page-break-after:always; box-sizing:border-box;">
    ${elements}
  </section>`;
}

export function presentationToHtml(
  slides: PresentationSlide[],
  theme: PresentationTheme,
  format: SlideFormat,
  title?: string,
): string {
  const dims = CANVAS_DIMENSIONS[format];
  const isLandscape = format === '16:9';
  const pageSize = isLandscape
    ? `${dims.width / 96 * 2.54}cm ${dims.height / 96 * 2.54}cm`
    : 'A4 portrait';

  const fontUrl = googleFontUrl(theme.fontHeading);
  const fontUrlBody = theme.fontBody !== theme.fontHeading ? googleFontUrl(theme.fontBody) : '';

  const sections = slides
    .map((s, i) => renderSlide(s, i, slides.length, theme, dims))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title || 'Présentation')}</title>
  <link rel="stylesheet" href="${fontUrl}" />
  ${fontUrlBody ? `<link rel="stylesheet" href="${fontUrlBody}" />` : ''}
  <style>
    @page { size: ${pageSize}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #e5e7eb; }
    .slide { font-family: '${theme.fontBody}', system-ui, sans-serif; }
    @media screen {
      body { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px; }
      .slide { box-shadow: 0 8px 32px rgba(0,0,0,0.12); border-radius: 8px; flex-shrink: 0; }
    }
    @media print {
      body { background: white; padding: 0; gap: 0; }
      .slide { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
${sections}
</body>
</html>`;
}
