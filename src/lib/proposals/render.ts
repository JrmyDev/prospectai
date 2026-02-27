import { AspectRatio, Branding, SlideData, TemplateStyle } from "@/lib/carousel/types";

export function proposalSlidesToHtml(
  slides: SlideData[],
  branding?: Branding,
  template?: TemplateStyle,
  aspectRatio?: AspectRatio,
  title?: string
): string {
  const font = branding?.fontHeading || "Inter";
  const primary = branding?.primaryColor || "#0f172a";
  const secondary = branding?.secondaryColor || "#334155";
  const accent = branding?.secondaryColor || "#22c55e";
  const fontLink = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;600;700&display=swap`;
  const formatText = (value: string) => escapeHtml(value).replace(/\n/g, "<br/>");
  const pageSize = aspectRatio === AspectRatio.LANDSCAPE ? "A4 landscape" : "A4 portrait";

  if (template === TemplateStyle.PROPOSAL) {
    const sections = slides.map((s, i) => {
      const typeClass = s.type === "intro" ? "cover" : s.type === "outro" ? "outro" : "content";
      const body = s.content ? `<div class="body">${formatText(s.content)}</div>` : "";
      const highlight = s.highlight ? `<div class="pill">${escapeHtml(s.highlight)}</div>` : "";
      const client = branding?.website ? `<div class="client">Pour ${escapeHtml(branding.website)}</div>` : "";
      const image = s.imageUrl
        ? `<div class="image"><img src="${escapeHtml(s.imageUrl)}" alt="" /></div>`
        : "";
      return `
        <section class="slide ${typeClass}">
          <div class="slide-inner">
            ${typeClass === "cover" ? `<div class="kicker">Proposition commerciale</div>` : `<div class="kicker">${escapeHtml(branding?.name || "")}</div>`}
            <h1>${escapeHtml(s.title)}</h1>
            ${image}
            ${body}
            ${typeClass === "cover" ? client : highlight}
            <div class="page">${i + 1}/${slides.length}</div>
          </div>
        </section>
      `;
    }).join("");

    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title || "Presentation")}</title>
      <style>
        @import url('${fontLink}');
        @page { size: ${pageSize}; margin: 14mm; }
        :root { --primary:${primary}; --secondary:${secondary}; --accent:${accent}; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: '${font}', Arial, sans-serif; color:#0b1020; background:#ffffff; }
        .slide { page-break-after: always; min-height: 100vh; display:flex; }
        .slide-inner { width:100%; padding:48px; border-radius:20px; position:relative; }
        .slide.cover { background: var(--primary); color:#ffffff; }
        .slide.cover .slide-inner { border: none; }
        .slide.cover h1 { font-size: 40px; line-height: 1.05; margin: 24px 0 16px; color:#ffffff; }
        .slide.cover .kicker { text-transform: uppercase; letter-spacing: 2px; font-size: 12px; opacity: 0.8; }
        .slide.cover .body { font-size: 15px; max-width: 70%; opacity: 0.85; }
        .slide.cover .client { margin-top: 28px; text-transform: uppercase; letter-spacing: 1.5px; font-size: 11px; opacity: 0.8; }

        .slide.content { background: #ffffff; border: 1px solid #e5e7eb; }
        .slide.content .slide-inner { border: 1px solid #e5e7eb; }
        .slide.content h1 { font-size: 26px; color: var(--primary); margin: 16px 0; }
        .slide.content .kicker { text-transform: uppercase; letter-spacing: 2px; font-size: 11px; color: #64748b; }
        .slide.content .body { font-size: 14px; line-height: 1.6; color: #0b1020; }
        .slide.content .pill { margin-top: 24px; display:inline-block; background: var(--primary); color:#ffffff; padding:6px 12px; border-radius:999px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .slide .image { margin: 16px 0 12px; }
        .slide .image img { width: 100%; max-height: 260px; object-fit: cover; border-radius: 14px; display:block; }

        .slide.outro { background: #0b1020; color:#ffffff; }
        .slide.outro h1 { color:#ffffff; font-size: 32px; }
        .slide.outro .body { font-size: 15px; opacity: 0.85; }

        .page { position:absolute; bottom: 24px; right: 32px; font-size: 10px; color: rgba(255,255,255,0.7); }
        .slide.content .page { color: #94a3b8; }
        .slide.outro .page { color: rgba(255,255,255,0.6); }

        /* Screen preview should mimic PDF layout */
        @media screen {
          body { background: #e5e7eb; padding: 16px; }
          .slide {
            width: 210mm;
            min-height: 297mm;
            margin: 16px auto;
            box-shadow: 0 16px 48px rgba(15,23,42,0.12);
            border-radius: 18px;
            overflow: hidden;
          }
        }
        @media print {
          body { background: #ffffff; padding: 0; }
          .slide { margin: 0; box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      ${sections}
    </body>
    </html>`;
  }

  const sections = slides.map((s) => `
      <section class="slide">
        <div class="slide-inner">
          <div class="badge">${escapeHtml(branding?.name || "Brand")}</div>
          <h1>${escapeHtml(s.title)}</h1>
          <p>${formatText(s.content || "")}</p>
        </div>
      </section>
    `).join("");

  return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title || "Presentation")}</title>
      <style>
        @import url('${fontLink}');
        @page { size: ${pageSize}; margin: 14mm; }
        :root { --primary:${primary}; --secondary:${secondary}; --accent:${accent}; }
        body { font-family: '${font}', Arial, sans-serif; color:#0b1020; }
        .slide { page-break-after: always; min-height: 100vh; display:flex; }
        .slide-inner { width:100%; border:1px solid #e5e7eb; border-radius:16px; padding:32px; background: #ffffff; }
        h1 { font-size: 28px; margin: 8px 0 12px; color: var(--primary); }
        p { font-size: 14px; color: #1f2937; max-width: 80%; }
        .badge { display:inline-block; padding:6px 10px; border-radius:999px; background: rgba(15,23,42,0.08); color: var(--secondary); font-size: 11px; }
      </style>
    </head>
    <body>
      ${sections}
    </body>
    </html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
