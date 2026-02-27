import {
  PresentationSlide,
  PresentationTheme,
  SlideElement,
  SlideFormat,
  CANVAS_DIMENSIONS,
} from './types';
import { googleFontUrl } from './theme';

// ─── Meta info shown in footers / headers ──────────────────────────────────
export interface ProposalMeta {
  date?: string;
  website?: string;
  email?: string;
  phone?: string;
  clientName?: string;
}

// ─── HTML helpers ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Content extraction from slide elements ────────────────────────────────

interface SlideContent {
  headings: SlideElement[];
  subheadings: SlideElement[];
  bodies: SlideElement[];
  stats: SlideElement[];
  quotes: SlideElement[];
  images: SlideElement[];
}

function extractContent(slide: PresentationSlide): SlideContent {
  return {
    headings: slide.elements.filter((e) => e.type === 'heading'),
    subheadings: slide.elements.filter((e) => e.type === 'subheading'),
    bodies: slide.elements.filter((e) => e.type === 'body' && !e.locked),
    stats: slide.elements.filter((e) => e.type === 'stat'),
    quotes: slide.elements.filter((e) => e.type === 'quote'),
    images: slide.elements.filter((e) => e.type === 'image' && !e.locked),
  };
}

// ─── Smart body formatter ──────────────────────────────────────────────────

function formatBody(text: string): string {
  if (!text || !text.trim()) return '';

  const lines = text.split('\n').filter((l) => l.trim());

  // Detect pipe-separated tables (at least 2 rows, all containing |)
  if (lines.length >= 2 && lines.filter((l) => l.includes('|')).length >= lines.length * 0.8) {
    return renderPipeTable(lines.filter((l) => l.includes('|')));
  }

  // Detect bullet/check lists
  const bulletRe = /^[\s]*[•\-✅✓❌✗▸►→●○◆◇➜➤]\s*/;
  if (lines.length > 1 && lines.filter((l) => bulletRe.test(l)).length >= lines.length * 0.6) {
    const items = lines.map((l) => {
      const raw = l.replace(bulletRe, '').trim();
      const isCheck = /^[\s]*[✅✓]/.test(l);
      const isCross = /^[\s]*[❌✗]/.test(l);
      const cls = isCheck ? 'item-check' : isCross ? 'item-cross' : '';
      return `<li class="${cls}">${esc(raw)}</li>`;
    });
    return `<ul class="styled-list">${items.join('\n')}</ul>`;
  }

  // Paragraph mode: split by double-newline or just render lines
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length > 1) {
    return paragraphs.map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br/>')}</p>`).join('\n');
  }

  return `<p>${esc(text.trim()).replace(/\n/g, '<br/>')}</p>`;
}

function renderPipeTable(lines: string[]): string {
  const rows = lines
    .filter((l) => !/^[\s|:-]+$/.test(l)) // skip markdown separator rows
    .map((l) =>
      l
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean),
    );
  if (rows.length === 0) return '';
  const header = rows[0];
  const body = rows.slice(1);
  return `<div class="table-wrapper"><table class="styled-table">
    <thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${body.map((r, ri) => `<tr class="${ri % 2 === 0 ? 'even' : 'odd'}">${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

// ─── Slide renderers by layout ─────────────────────────────────────────────

interface RenderCtx {
  c: SlideContent;
  theme: PresentationTheme;
  meta?: ProposalMeta;
  index: number;
  total: number;
}

function renderCover({ c, theme, meta }: RenderCtx): string {
  const kicker = c.subheadings[0]?.content || '';
  const title = c.headings[0]?.content || '';
  const desc = c.bodies[0]?.content || '';
  const img = c.images[0]?.imageUrl || '';

  const bgImage = img
    ? `background-image: linear-gradient(135deg, var(--c-primary) 0%, rgba(10,22,40,0.85) 50%, var(--c-secondary) 100%), url('${esc(img)}'); background-size: cover; background-position: center;`
    : '';

  return `<section class="slide slide-cover" ${bgImage ? `style="${bgImage}"` : ''}>
    <div class="cover-deco-1"></div>
    <div class="cover-deco-2"></div>
    <div class="cover-deco-3"></div>
    <div class="cover-content">
      ${theme.logoUrl ? `<img class="cover-logo" src="${esc(theme.logoUrl)}" alt="" />` : ''}
      ${kicker ? `<span class="cover-kicker">${esc(kicker)}</span>` : ''}
      <h1 class="cover-title">${esc(title)}</h1>
      ${meta?.clientName ? `<div class="cover-client">${esc(meta.clientName)}</div>` : ''}
      ${desc ? `<p class="cover-desc">${esc(desc)}</p>` : ''}
      <div class="cover-sep"></div>
    </div>
    <div class="cover-footer">
      <span>${esc(theme.brandName || '')}</span>
      <span class="cover-footer-right">
        ${meta?.website ? `${esc(meta.website)}` : ''}
        ${meta?.email ? ` · ${esc(meta.email)}` : ''}
        ${meta?.date ? ` · ${esc(meta.date)}` : ''}
      </span>
    </div>
  </section>`;
}

function renderSection({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || '';
  const desc = c.bodies[0]?.content || '';
  return `<section class="slide slide-section">
    <div class="section-deco"></div>
    <div class="section-content">
      <span class="section-number">${String(index + 1).padStart(2, '0')}</span>
      <h2 class="section-title">${esc(title)}</h2>
      ${desc ? `<p class="section-desc">${esc(desc)}</p>` : ''}
      <div class="section-line"></div>
    </div>
    ${slideFooter(theme, meta, index, total, true)}
  </section>`;
}

function renderTitleContent({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || '';
  const body = c.bodies.map((b) => b.content || '').join('\n\n');
  const img = c.images[0]?.imageUrl || '';

  return `<section class="slide slide-content">
    <div class="content-accent-top"></div>
    <div class="content-sidebar"></div>
    ${slideHeader(theme)}
    <div class="content-area">
      <h2 class="slide-heading">${esc(title)}</h2>
      <div class="slide-body">${formatBody(body)}</div>
      ${img ? `<div class="content-image"><img src="${esc(img)}" alt="" /></div>` : ''}
    </div>
    ${slideFooter(theme, meta, index, total)}
  </section>`;
}

function renderTwoColumns({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || '';
  const col1 = c.bodies[0]?.content || '';
  const col2 = c.bodies[1]?.content || '';

  return `<section class="slide slide-content">
    <div class="content-accent-top"></div>
    <div class="content-sidebar"></div>
    ${slideHeader(theme)}
    <div class="content-area">
      <h2 class="slide-heading">${esc(title)}</h2>
      <div class="two-columns">
        <div class="column">${formatBody(col1)}</div>
        <div class="column-divider"></div>
        <div class="column">${formatBody(col2)}</div>
      </div>
    </div>
    ${slideFooter(theme, meta, index, total)}
  </section>`;
}

function renderImageLeft({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || '';
  const body = c.bodies.map((b) => b.content || '').join('\n\n');
  const img = c.images[0]?.imageUrl || '';

  return `<section class="slide slide-img-split">
    <div class="img-split-image" ${img ? `style="background-image: url('${esc(img)}')"` : ''}>
      ${!img ? '<div class="img-placeholder"></div>' : ''}
    </div>
    <div class="img-split-content">
      ${slideHeader(theme)}
      <div class="img-split-text">
        <h2 class="slide-heading">${esc(title)}</h2>
        <div class="slide-body">${formatBody(body)}</div>
      </div>
      ${slideFooter(theme, meta, index, total)}
    </div>
  </section>`;
}

function renderImageRight({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || '';
  const body = c.bodies.map((b) => b.content || '').join('\n\n');
  const img = c.images[0]?.imageUrl || '';

  return `<section class="slide slide-img-split img-split-reverse">
    <div class="img-split-content">
      ${slideHeader(theme)}
      <div class="img-split-text">
        <h2 class="slide-heading">${esc(title)}</h2>
        <div class="slide-body">${formatBody(body)}</div>
      </div>
      ${slideFooter(theme, meta, index, total)}
    </div>
    <div class="img-split-image" ${img ? `style="background-image: url('${esc(img)}')"` : ''}>
      ${!img ? '<div class="img-placeholder"></div>' : ''}
    </div>
  </section>`;
}

function renderFullImage({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || '';
  const desc = c.bodies[0]?.content || '';
  const img = c.images[0]?.imageUrl || '';

  return `<section class="slide slide-full-image" ${img ? `style="background-image: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${esc(img)}')"` : ''}>
    <div class="full-image-content">
      <h2 class="full-image-title">${esc(title)}</h2>
      ${desc ? `<p class="full-image-desc">${esc(desc)}</p>` : ''}
    </div>
    ${slideFooter(theme, meta, index, total, true)}
  </section>`;
}

function renderStats({ c, theme, meta, index, total }: RenderCtx): string {
  const title = c.headings[0]?.content || 'Chiffres clés';
  const desc = c.bodies[0]?.content || '';
  const statCards = c.stats
    .map(
      (s, i) => `
    <div class="stat-card" style="animation-delay: ${i * 0.1}s">
      <div class="stat-value">${esc(s.statValue || '')}</div>
      <div class="stat-label">${esc(s.statLabel || '')}</div>
    </div>`,
    )
    .join('\n');

  return `<section class="slide slide-content slide-stats-bg">
    <div class="content-accent-top"></div>
    ${slideHeader(theme)}
    <div class="content-area">
      <h2 class="slide-heading">${esc(title)}</h2>
      ${desc ? `<div class="slide-body stats-intro">${formatBody(desc)}</div>` : ''}
      <div class="stats-grid">${statCards}</div>
    </div>
    ${slideFooter(theme, meta, index, total)}
  </section>`;
}

function renderQuote({ c, theme, meta, index, total }: RenderCtx): string {
  const quoteText = c.quotes[0]?.content || '';
  const attribution = c.bodies[0]?.content || '';

  return `<section class="slide slide-quote">
    <div class="quote-deco-mark">\u201C</div>
    <div class="quote-content">
      <blockquote class="quote-text">${esc(quoteText.replace(/^[«»"\u201C\u201D]+\s*/, '').replace(/\s*[«»"\u201C\u201D]+$/, ''))}</blockquote>
      <div class="quote-sep"></div>
      ${attribution ? `<cite class="quote-attribution">${esc(attribution)}</cite>` : ''}
    </div>
    ${slideFooter(theme, meta, index, total, true)}
  </section>`;
}

function renderClosing({ c, theme, meta }: RenderCtx): string {
  const title = c.headings[0]?.content || 'Prochaine étape';
  const body = c.bodies.map((b) => b.content || '').join('\n\n');

  return `<section class="slide slide-closing">
    <div class="closing-deco-1"></div>
    <div class="closing-deco-2"></div>
    <div class="closing-content">
      ${theme.logoUrl ? `<img class="closing-logo" src="${esc(theme.logoUrl)}" alt="" />` : ''}
      <h2 class="closing-title">${esc(title)}</h2>
      <div class="closing-body">${formatBody(body)}</div>
      <div class="closing-sep"></div>
      <div class="closing-contact">
        ${meta?.phone ? `<span>${esc(meta.phone)}</span>` : ''}
        ${meta?.email ? `<span>${esc(meta.email)}</span>` : ''}
        ${meta?.website ? `<span>${esc(meta.website)}</span>` : ''}
      </div>
    </div>
    <div class="closing-footer">
      <span>${esc(theme.brandName || '')}</span>
    </div>
  </section>`;
}

// ─── Header & Footer components ────────────────────────────────────────────

function slideHeader(theme: PresentationTheme): string {
  return `<div class="slide-header">
    ${theme.logoUrl ? `<img class="header-logo" src="${esc(theme.logoUrl)}" alt="" />` : `<span class="header-brand">${esc(theme.brandName || '')}</span>`}
  </div>`;
}

function slideFooter(
  theme: PresentationTheme,
  meta: ProposalMeta | undefined,
  index: number,
  total: number,
  light = false,
): string {
  const cls = light ? 'slide-footer slide-footer-light' : 'slide-footer';
  return `<div class="${cls}">
    <span class="footer-brand">${esc(meta?.website || theme.brandName || '')}</span>
    <span class="footer-page">${index + 1} / ${total}</span>
  </div>`;
}

// ─── Master dispatcher ─────────────────────────────────────────────────────

function renderSlide(
  slide: PresentationSlide,
  index: number,
  total: number,
  theme: PresentationTheme,
  meta?: ProposalMeta,
): string {
  const c = extractContent(slide);
  const ctx: RenderCtx = { c, theme, meta, index, total };
  switch (slide.layout) {
    case 'cover':
      return renderCover(ctx);
    case 'section':
      return renderSection(ctx);
    case 'twoColumns':
      return renderTwoColumns(ctx);
    case 'imageLeft':
      return renderImageLeft(ctx);
    case 'imageRight':
      return renderImageRight(ctx);
    case 'fullImage':
      return renderFullImage(ctx);
    case 'stats':
      return renderStats(ctx);
    case 'quote':
      return renderQuote(ctx);
    case 'closing':
      return renderClosing(ctx);
    default:
      return renderTitleContent(ctx);
  }
}

// ─── Main export ───────────────────────────────────────────────────────────

export function proposalToHtml(
  slides: PresentationSlide[],
  theme: PresentationTheme,
  format: SlideFormat,
  title?: string,
  meta?: ProposalMeta,
): string {
  const dims = CANVAS_DIMENSIONS[format];
  const isLandscape = format === '16:9';

  const fontUrl = googleFontUrl(theme.fontHeading);
  const fontUrlBody = theme.fontBody !== theme.fontHeading ? googleFontUrl(theme.fontBody) : '';

  const sections = slides.map((s, i) => renderSlide(s, i, slides.length, theme, meta)).join('\n');

  const pageCss = isLandscape
    ? `${dims.width / 96 * 2.54}cm ${dims.height / 96 * 2.54}cm`
    : 'A4 portrait';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title || 'Proposition')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${fontUrl}" />
  ${fontUrlBody ? `<link rel="stylesheet" href="${fontUrlBody}" />` : ''}
  <style>
    /* ─── CSS Custom Properties (easy per-client customisation) ─── */
    :root {
      --c-primary: ${theme.colors.primary};
      --c-secondary: ${theme.colors.secondary};
      --c-accent: ${theme.colors.accent};
      --c-bg: ${theme.colors.background};
      --c-surface: ${theme.colors.surface};
      --c-text: ${theme.colors.text};
      --c-muted: ${theme.colors.textMuted};
      --c-on-primary: ${theme.colors.textOnPrimary};
      --c-accent-glow: ${theme.colors.accent}22;
      --c-primary-95: ${theme.colors.primary}f2;
      --f-heading: '${theme.fontHeading}', 'Inter', system-ui, -apple-system, sans-serif;
      --f-body: '${theme.fontBody}', 'Inter', system-ui, -apple-system, sans-serif;
      --slide-w: ${dims.width}px;
      --slide-h: ${dims.height}px;
    }

    /* ─── Reset & base ─── */
    @page { size: ${pageCss}; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #e2e5ea; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

    /* ─── Slide base ─── */
    .slide {
      width: var(--slide-w);
      height: var(--slide-h);
      position: relative;
      overflow: hidden;
      page-break-after: always;
      font-family: var(--f-body);
      color: var(--c-text);
    }

    /* ─── COVER ─── */
    .slide-cover {
      background: linear-gradient(160deg, var(--c-primary) 0%, color-mix(in srgb, var(--c-primary) 70%, var(--c-secondary)) 40%, var(--c-secondary) 100%);
      color: var(--c-on-primary);
      display: flex;
      flex-direction: column;
    }
    .cover-deco-1 {
      position: absolute; top: 0; right: 0;
      width: 480px; height: 480px;
      background: radial-gradient(ellipse at top right, var(--c-accent-glow) 0%, transparent 70%);
      pointer-events: none;
    }
    .cover-deco-2 {
      position: absolute; bottom: -120px; left: -80px;
      width: 400px; height: 400px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 50%;
      pointer-events: none;
    }
    .cover-deco-3 {
      position: absolute; top: 60px; right: 80px;
      width: 200px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--c-accent), transparent);
      opacity: 0.4;
      pointer-events: none;
    }
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px 100px 40px;
      position: relative;
      z-index: 1;
    }
    .cover-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
      margin-bottom: 40px;
      filter: brightness(0) invert(1);
    }
    .cover-kicker {
      display: inline-block;
      font-family: var(--f-body);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--c-accent);
      margin-bottom: 20px;
    }
    .cover-title {
      font-family: var(--f-heading);
      font-size: 60px;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -1px;
      max-width: 80%;
      margin-bottom: 16px;
    }
    .cover-client {
      font-family: var(--f-heading);
      font-size: 32px;
      font-weight: 600;
      color: var(--c-accent);
      margin-bottom: 20px;
    }
    .cover-desc {
      font-size: 19px;
      line-height: 1.65;
      max-width: 60%;
      opacity: 0.8;
      font-weight: 400;
    }
    .cover-sep {
      width: 64px;
      height: 3px;
      background: var(--c-accent);
      border-radius: 2px;
      margin-top: 36px;
    }
    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 100px;
      height: 56px;
      font-size: 13px;
      font-weight: 400;
      color: rgba(255,255,255,0.45);
      letter-spacing: 0.5px;
      border-top: 1px solid rgba(255,255,255,0.08);
      position: relative;
      z-index: 1;
    }
    .cover-footer-right { text-align: right; }

    /* ─── SECTION DIVIDER ─── */
    .slide-section {
      background: linear-gradient(160deg, var(--c-primary) 0%, var(--c-secondary) 100%);
      color: var(--c-on-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .section-deco {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 600px;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 50%;
      pointer-events: none;
    }
    .section-content {
      text-align: center;
      position: relative;
      z-index: 1;
    }
    .section-number {
      display: block;
      font-family: var(--f-heading);
      font-size: 80px;
      font-weight: 800;
      color: var(--c-accent);
      opacity: 0.15;
      line-height: 1;
      margin-bottom: -20px;
    }
    .section-title {
      font-family: var(--f-heading);
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      max-width: 800px;
      margin: 0 auto;
    }
    .section-desc {
      font-size: 20px;
      opacity: 0.7;
      margin-top: 16px;
      max-width: 500px;
    }
    .section-line {
      width: 48px;
      height: 3px;
      background: var(--c-accent);
      border-radius: 2px;
      margin: 32px auto 0;
    }

    /* ─── CONTENT / TITLE-CONTENT ─── */
    .slide-content {
      background: var(--c-bg);
      display: flex;
      flex-direction: column;
    }
    .content-accent-top {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--c-primary), var(--c-accent));
    }
    .content-sidebar {
      position: absolute;
      top: 4px; left: 0;
      width: 4px;
      height: 100px;
      background: var(--c-accent);
      border-radius: 0 2px 2px 0;
    }
    .slide-header {
      display: flex;
      align-items: center;
      padding: 28px 80px 0;
      height: 64px;
    }
    .header-logo {
      height: 28px;
      width: auto;
      object-fit: contain;
      opacity: 0.7;
    }
    .header-brand {
      font-family: var(--f-heading);
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--c-muted);
    }
    .content-area {
      flex: 1;
      padding: 8px 80px 0;
      display: flex;
      flex-direction: column;
    }
    .slide-heading {
      font-family: var(--f-heading);
      font-size: 36px;
      font-weight: 700;
      color: var(--c-text);
      line-height: 1.2;
      margin-bottom: 28px;
      position: relative;
      padding-bottom: 20px;
    }
    .slide-heading::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 40px;
      height: 3px;
      background: var(--c-accent);
      border-radius: 2px;
    }
    .slide-body {
      font-size: 18px;
      line-height: 1.75;
      color: var(--c-text);
      flex: 1;
    }
    .slide-body p { margin-bottom: 14px; }
    .slide-body p:last-child { margin-bottom: 0; }

    /* Content with image */
    .content-image {
      margin-top: 24px;
      border-radius: 12px;
      overflow: hidden;
      max-height: 320px;
    }
    .content-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ─── TWO COLUMNS ─── */
    .two-columns {
      display: flex;
      gap: 0;
      flex: 1;
    }
    .column {
      flex: 1;
      font-size: 17px;
      line-height: 1.75;
    }
    .column p { margin-bottom: 12px; }
    .column-divider {
      width: 1px;
      background: linear-gradient(to bottom, transparent, var(--c-accent), transparent);
      margin: 0 40px;
      flex-shrink: 0;
      opacity: 0.4;
    }

    /* ─── IMAGE SPLIT ─── */
    .slide-img-split {
      display: flex;
      flex-direction: row;
    }
    .slide-img-split.img-split-reverse {
      flex-direction: row;
    }
    .img-split-image {
      width: 45%;
      background-size: cover;
      background-position: center;
      background-color: var(--c-surface);
      flex-shrink: 0;
      position: relative;
    }
    .img-placeholder {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--c-surface) 0%, color-mix(in srgb, var(--c-surface) 80%, var(--c-accent)) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .img-split-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--c-bg);
    }
    .img-split-text {
      flex: 1;
      padding: 8px 64px 0;
      display: flex;
      flex-direction: column;
    }
    .img-split-text .slide-heading { font-size: 32px; }

    /* ─── FULL IMAGE ─── */
    .slide-full-image {
      background-size: cover;
      background-position: center;
      background-color: #0a0f1e;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .full-image-content {
      text-align: center;
      position: relative;
      z-index: 1;
    }
    .full-image-title {
      font-family: var(--f-heading);
      font-size: 52px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
      margin-bottom: 20px;
      text-shadow: 0 2px 24px rgba(0,0,0,0.3);
    }
    .full-image-desc {
      font-size: 20px;
      color: rgba(255,255,255,0.85);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* ─── STATS ─── */
    .slide-stats-bg { background: var(--c-surface); }
    .slide-stats-bg .content-accent-top { display: none; }
    .slide-stats-bg .content-sidebar { display: none; }
    .stats-intro { margin-bottom: 20px; }
    .stats-grid {
      display: flex;
      gap: 32px;
      flex: 1;
      align-items: stretch;
      padding-bottom: 20px;
    }
    .stat-card {
      flex: 1;
      background: var(--c-bg);
      border-radius: 16px;
      padding: 40px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      border: 1px solid color-mix(in srgb, var(--c-accent) 15%, transparent);
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--c-primary), var(--c-accent));
    }
    .stat-value {
      font-family: var(--f-heading);
      font-size: 52px;
      font-weight: 800;
      color: var(--c-accent);
      line-height: 1;
      margin-bottom: 12px;
    }
    .stat-label {
      font-size: 15px;
      font-weight: 500;
      color: var(--c-muted);
      line-height: 1.4;
      max-width: 200px;
    }

    /* ─── QUOTE ─── */
    .slide-quote {
      background: linear-gradient(160deg, var(--c-primary) 0%, var(--c-secondary) 100%);
      color: var(--c-on-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .quote-deco-mark {
      position: absolute;
      top: 100px;
      left: 100px;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 280px;
      line-height: 1;
      color: var(--c-accent);
      opacity: 0.08;
      pointer-events: none;
      user-select: none;
    }
    .quote-content {
      text-align: center;
      max-width: 900px;
      padding: 0 80px;
      position: relative;
      z-index: 1;
    }
    .quote-text {
      font-family: var(--f-heading);
      font-size: 30px;
      font-weight: 500;
      font-style: italic;
      line-height: 1.6;
      color: var(--c-on-primary);
    }
    .quote-sep {
      width: 40px;
      height: 2px;
      background: var(--c-accent);
      margin: 32px auto;
      border-radius: 1px;
    }
    .quote-attribution {
      font-family: var(--f-body);
      font-size: 16px;
      font-style: normal;
      font-weight: 400;
      color: rgba(255,255,255,0.6);
      display: block;
    }

    /* ─── CLOSING ─── */
    .slide-closing {
      background: linear-gradient(160deg, var(--c-primary) 0%, var(--c-secondary) 100%);
      color: var(--c-on-primary);
      display: flex;
      flex-direction: column;
    }
    .closing-deco-1 {
      position: absolute; bottom: 0; right: 0;
      width: 480px; height: 480px;
      background: radial-gradient(ellipse at bottom right, var(--c-accent-glow) 0%, transparent 70%);
      pointer-events: none;
    }
    .closing-deco-2 {
      position: absolute; top: -80px; right: 200px;
      width: 300px; height: 300px;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 50%;
      pointer-events: none;
    }
    .closing-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      text-align: center;
      position: relative;
      z-index: 1;
    }
    .closing-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
      margin-bottom: 36px;
      filter: brightness(0) invert(1);
    }
    .closing-title {
      font-family: var(--f-heading);
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 24px;
    }
    .closing-body {
      font-size: 18px;
      line-height: 1.7;
      opacity: 0.8;
      max-width: 600px;
    }
    .closing-body p { margin-bottom: 10px; }
    .closing-sep {
      width: 48px;
      height: 2px;
      background: var(--c-accent);
      border-radius: 1px;
      margin: 32px 0;
    }
    .closing-contact {
      display: flex;
      gap: 32px;
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.5px;
    }
    .closing-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 56px;
      font-size: 13px;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 3px;
      border-top: 1px solid rgba(255,255,255,0.08);
      position: relative;
      z-index: 1;
    }

    /* ─── FOOTER ─── */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 80px;
      height: 52px;
      border-top: 1px solid rgba(0,0,0,0.06);
      flex-shrink: 0;
    }
    .slide-footer-light {
      border-top-color: rgba(255,255,255,0.08);
    }
    .footer-brand {
      font-size: 12px;
      font-weight: 500;
      color: var(--c-muted);
      letter-spacing: 0.5px;
    }
    .slide-footer-light .footer-brand {
      color: rgba(255,255,255,0.4);
    }
    .footer-page {
      font-size: 12px;
      font-weight: 500;
      color: var(--c-muted);
      font-variant-numeric: tabular-nums;
    }
    .slide-footer-light .footer-page {
      color: rgba(255,255,255,0.35);
    }

    /* ─── STYLED LISTS ─── */
    .styled-list {
      list-style: none;
      padding: 0;
    }
    .styled-list li {
      position: relative;
      padding: 8px 0 8px 28px;
      border-bottom: 1px solid rgba(0,0,0,0.04);
      font-size: inherit;
      line-height: 1.6;
    }
    .styled-list li:last-child { border-bottom: none; }
    .styled-list li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 16px;
      width: 8px;
      height: 8px;
      background: var(--c-accent);
      border-radius: 2px;
      transform: rotate(45deg);
    }
    .styled-list li.item-check::before {
      content: '\\2713';
      background: none;
      color: #10b981;
      font-weight: 700;
      font-size: 16px;
      transform: none;
      top: 8px;
      width: auto;
      height: auto;
    }
    .styled-list li.item-cross::before {
      content: '\\2717';
      background: none;
      color: #ef4444;
      font-weight: 700;
      font-size: 16px;
      transform: none;
      top: 8px;
      width: auto;
      height: auto;
    }

    /* ─── STYLED TABLES ─── */
    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      margin: 16px 0;
    }
    .styled-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 15px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.08);
    }
    .styled-table thead th {
      background: var(--c-primary);
      color: var(--c-on-primary);
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 14px 20px;
      text-align: left;
    }
    .styled-table tbody td {
      padding: 12px 20px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      vertical-align: top;
      line-height: 1.5;
    }
    .styled-table tbody tr:last-child td { border-bottom: none; }
    .styled-table tbody tr.even td {
      background: var(--c-surface);
    }
    .styled-table tbody tr.odd td {
      background: var(--c-bg);
    }

    /* ─── SCREEN PREVIEW ─── */
    @media screen {
      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
        padding: 32px;
        background: #e2e5ea;
      }
      .slide {
        box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.12);
        border-radius: 8px;
        flex-shrink: 0;
      }
    }

    /* ─── PRINT ─── */
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
