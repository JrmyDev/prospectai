import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/gemini";
import { generateTextOpenAI } from "@/lib/openai";
import { logProspectEvent } from "@/lib/prospect-events";

// Generate a vitrine website for a prospect
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { analysis: true },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  try {
    const template = detectTemplate(prospect.sector || "");
    const reviews = prospect.analysis?.googleRating
      ? `Note Google: ${prospect.analysis.googleRating}/5 (${prospect.analysis.googleReviewsCount} avis)`
      : "";
    const googlePhotos = extractGooglePhotos(prospect.analysis?.rawAnalysis);

    const prompt = getPromptForTemplate(template, prospect, reviews, googlePhotos);

    const systemInstruction =
      "Tu es un expert en web design. Tu génères du code HTML/Tailwind propre et professionnel. Renvoie UNIQUEMENT du HTML, sans balises markdown.";

    let html = "";
    let usedModel = "gemini-2.5-flash";
    try {
      html = await generateTextOpenAI(prompt, systemInstruction, {
        model: "gpt-5.2-codex",
        maxOutputTokens: 6144,
        temperature: 0.6,
      });
      usedModel = "gpt-5.2-codex";
    } catch {
      html = await generateText(prompt, systemInstruction, {
        maxOutputTokens: 4096,
        temperature: 0.7,
        model: "gemini-2.5-flash",
      });
      usedModel = "gemini-2.5-flash";
    }

    let cleanHtml = normalizeHtml(html);

    const needsFallback = !isValidHtml(cleanHtml) || !hasKeySections(cleanHtml);
    if (needsFallback) {
      cleanHtml = buildFallbackHtml(prospect, reviews, googlePhotos);
    }

    // Save generated site
    const site = await prisma.generatedSite.upsert({
      where: { prospectId },
      create: {
        prospectId,
        htmlContent: cleanHtml,
        templateUsed: template,
        status: "draft",
      },
      update: {
        htmlContent: cleanHtml,
        templateUsed: template,
        status: "draft",
      },
    });

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: "site_generated" },
    });

    await logProspectEvent(prospectId, "website_generated", "Site vitrine généré", {
      model: usedModel,
      template,
      htmlLength: cleanHtml.length,
      warning: needsFallback ? "fallback" : undefined,
    });

    return NextResponse.json({
      success: true,
      siteId: site.id,
      template,
      htmlLength: cleanHtml.length,
      model: usedModel,
      warning: needsFallback ? "HTML incomplet — fallback appliqué." : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site generation failed" },
      { status: 500 }
    );
  }
}

// GET — preview HTML for a generated site
export async function GET(request: NextRequest) {
  const prospectId = request.nextUrl.searchParams.get("prospectId");
  if (!prospectId) {
    return NextResponse.json({ error: "prospectId required" }, { status: 400 });
  }

  const site = await prisma.generatedSite.findUnique({ where: { prospectId } });
  if (!site) {
    return NextResponse.json({ error: "No generated site found" }, { status: 404 });
  }

  // Return raw HTML for iframe preview
  return new NextResponse(site.htmlContent, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function detectTemplate(sector: string): string {
  const s = sector.toLowerCase();
  if (s.includes("chambre d'hôte") || s.includes("bed and breakfast") || s.includes("gîte") || s.includes("hébergement")) {
    return "bed_and_breakfast";
  }
  if (s.includes("restaurant") || s.includes("boulang") || s.includes("café") || s.includes("bar") || s.includes("traiteur")) {
    return "restaurant";
  }
  if (s.includes("coiffur") || s.includes("beauté") || s.includes("esth")) {
    return "beauty";
  }
  if (s.includes("santé") || s.includes("médic") || s.includes("dent") || s.includes("kiné")) {
    return "healthcare";
  }
  if (s.includes("immobil")) {
    return "realestate";
  }
  if (s.includes("artisan") || s.includes("plomb") || s.includes("électric") || s.includes("bâtiment")) {
    return "artisan";
  }
  return "business";
}

function getPromptForTemplate(
  template: string,
  prospect: any,
  reviews: string,
  googlePhotos: { url: string; attributions: string[] }[]
): string {
  const photosBlock = googlePhotos.length
    ? `PHOTOS GOOGLE DISPONIBLES (à utiliser pour la galerie/sections visuelles):
${googlePhotos
  .map((p, i) => `- Photo ${i + 1}: ${p.url}${p.attributions.length ? ` | Crédits: ${p.attributions.join(" ")}` : ""}`)
  .join("\n")}
`
    : "";
  const baseInfo = `INFORMATIONS DE L'ENTREPRISE:
- Nom: ${prospect.company}
- Secteur: ${prospect.sector || "Commerce/Service"}
- Adresse: ${prospect.address || "Non renseignée"}
- Ville: ${prospect.city || ""}
- Téléphone: ${prospect.phone || "Non renseigné"}
- ${reviews}
${photosBlock}`;

  const globalQualityBar = `EXIGENCES QUALITÉ (obligatoires):
- Design haut de gamme, crédible et "premium", avec une direction artistique claire
- Mise en page soignée: grilles, alignements, rythme vertical, espacement généreux
- Typo moderne (2 polices Google Fonts complémentaires), hiérarchie nette
- Palette cohérente (2-3 couleurs principales + neutres) définie en CSS vars
- Sections structurées, pas de blocs génériques ou répétitifs
- Textes concrets, pertinents, sans "lorem ipsum"
- Boutons/CTA travaillés (microcopy, états hover/focus)
- Détails visuels: badges, séparateurs, gradients subtils, cartes, ombres soft
- Mobile-first, mais beau aussi en desktop
- Pas de JavaScript complexe (juste HTML/CSS/Tailwind)

CONTRAINTES TECHNIQUES:
- HTML5 complet avec <!DOCTYPE html>, <head>, <body>
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Configuration Tailwind personnalisée (colors, fontFamily, boxShadow, borderRadius)
- Icônes via Lucide CDN ou emojis
- Texte entièrement en français
- SEO: meta title/description + JSON-LD LocalBusiness
- Images: placeholders ou URLs génériques, sauf photos Google fournies
- Si des crédits photos sont fournis, affiche une section "Crédits photo"

RENVOIE UNIQUEMENT le code HTML complet, rien d'autre. Pas de markdown, pas de backticks.`;

  if (template === "bed_and_breakfast") {
    return `Génère un site web vitrine one-page COMPLET en HTML avec Tailwind CSS (via CDN) pour une CHAMBRE D'HÔTE.
Le site doit être professionnel, moderne, responsive et prêt à être déployé, inspiré du style élégant et chaleureux de La Châtaigneraie.

${baseInfo}
${globalQualityBar}

TEMPLATE DESIGN (INSPIRÉ DE LA CHÂTAIGNERAIE):
- Reprends une esthétique "luxe rustique" et chaleureuse avec une mise en page soignée et des visuels immersifs
- POLICES: Montserrat (titres) et Playfair Display (corps) via Google Fonts
- COULEURS PERSONNALISÉES:
  --nature-50: #f7f6f4; --nature-100: #f0ede8; --nature-200: #e1d9cf; --nature-300: #d2c5b6;
  --nature-400: #b8a999; --nature-500: #9e8d7c; --nature-600: #8a7a6a; --nature-700: #766758;
  --nature-800: #63564a; --nature-900: #52463c; --nature-950: #2a241f;
  --chestnut-50: #fdf8f5; --chestnut-100: #f9f0ea; --chestnut-200: #f2ddd0; --chestnut-300: #e8c4ad;
  --chestnut-400: #d9a785; --chestnut-500: #c98b5d; --chestnut-600: #b87a4f; --chestnut-700: #9e6742;
  --chestnut-800: #825538; --chestnut-900: #6b462e;
- ANIMATIONS: fade-in-up (opacity 0, translateY 20px, animation 0.6s ease-out forwards), slow-zoom (scale 1.05, transition 20s ease-out)
- STYLE: Élégant, chaleureux, nature, avec dégradés subtils et effets de survol

STRUCTURE DU SITE (UNE PAGE COMPLÈTE) — OBLIGATOIRE, aucune section ne doit être omise:
1. HERO SECTION (min-h-screen):
   - Image de fond immersive de la chambre/hébergement (brightness 0.85, blur 1px)
   - Overlay dégradé (from-nature-950/60 via-nature-950/30 to-nature-950/90)
   - Titre principal accrocheur avec le nom de l'établissement
   - Sous-titre descriptif (49m², climatisation, petit-déjeuner inclus, etc.)
   - Widget de réservation intégré avec prix, capacité, CTA "Réserver"

2. SECTION INTRODUCTION:
   - Présentation de l'établissement et de ses hôtes
   - Équipements et services (Wi-Fi, petit-déjeuner, parking, etc.)
   - Localisation et accès

3. SECTION CHAMBRE/HÉBERGEMENT:
   - Présentation détaillée de l'hébergement (superficie, capacité, équipements)
   - Galerie photos avec lightbox (au moins 6-8 images)
   - Liste des équipements et commodités

4. SECTION GALERIE PHOTOS:
   - Grille masonry avec hover effects
   - Lightbox modal pour visionnage en plein écran

5. SECTION HÔTES:
   - Photos et présentation des propriétaires
   - Leurs motivations et valeurs

6. SECTION AVIS CLIENTS:
   - Affichage des avis Google si disponibles
   - Design élégant avec étoiles et témoignages

7. SECTION GUIDE LOCAL:
   - Recommandations restaurants, activités, lieux d'intérêt
   - Présentation sous forme d'images avec descriptions

8. SECTION CONTACT/LOCALISATION:
   - Adresse complète, téléphone, email
   - Carte Google Maps intégrée
   - Formulaire de contact simple

9. FOOTER CTA:
   - Appel à l'action final pour réserver
   - Liens vers réseaux sociaux si disponibles

CONTRAINTES TECHNIQUES:
- HTML5 complet avec <!DOCTYPE html>, <head>, <body>
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Configuration Tailwind personnalisée pour les couleurs nature-* et chestnut-*
- Icônes Lucide React (via CDN) ou emojis
- Responsive design (mobile-first)
- Animations CSS et transitions fluides
- Pas de JavaScript complexe (juste HTML/CSS/Tailwind)
- Images: placeholders ou URLs génériques, sauf photos Google fournies
- Texte entièrement en français
- SEO optimisé (meta title, description, etc.)

RENVOIE UNIQUEMENT le code HTML complet, rien d'autre.`;
  }

  // Default business template
  return `Génère un site web vitrine one-page COMPLET en HTML avec Tailwind CSS (via CDN).
Le site doit être professionnel, moderne, responsive et prêt à être déployé.

${baseInfo}

${globalQualityBar}

DIRECTION ARTISTIQUE (à adapter au secteur ${template}):
- Utilise une esthétique claire et contemporaine avec une identité visuelle forte
- Propose un ton éditorial crédible et rassurant
- Ajoute un motif de fond subtil (grain léger, dégradé doux, formes abstraites)
- Prévois une section "preuves sociales" (avis, badges, stats)

STRUCTURE DU SITE:
1. Header élégant avec navigation et CTA secondaire
2. Hero visuel (split layout ou full-bleed), titre impactant, sous-titre précis, 2 CTAs
3. Bandeau de confiance (avis, note, badges, stats)
4. Section "À propos" avec valeur ajoutée, mission, différenciation
5. Section "Services/Offres" (4-6 cartes) avec icônes et bénéfices
6. Section "Processus" ou "Notre approche" (3-5 étapes)
7. Section "Réalisations/Portfolio" ou "Sélection" (grille visuelle)
8. Section "Avis clients" si des avis Google sont disponibles
9. Section "FAQ" (4-6 questions pertinentes)
10. Section "Contact" avec adresse, téléphone, horaires, et Google Maps embed placeholder
11. Footer avec rappel CTA, liens, microcopy de confiance`;
}

function normalizeHtml(rawHtml: string): string {
  const trimmed = rawHtml
    .replace(/^```html?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  const match = trimmed.match(/<!doctype[\s\S]*<\/html>/i) || trimmed.match(/<html[\s\S]*<\/html>/i);
  return match ? match[0].trim() : trimmed;
}

function isValidHtml(html: string): boolean {
  return html.length > 200 && /<html[\s>]/i.test(html) && /<body[\s>]/i.test(html);
}

function hasKeySections(html: string): boolean {
  const text = html.replace(/\s+/g, " ").toLowerCase();
  const hasAbout = /à propos|a propos|notre histoire|qui sommes-nous/.test(text);
  const hasServices = /services|prestations|offres|carte/.test(text);
  const hasContact = /contact|nous contacter|adresse|téléphone|telephone/.test(text);
  return hasAbout && hasServices && hasContact;
}

function extractGooglePhotos(
  rawAnalysis?: string | null
): { url: string; attributions: string[] }[] {
  if (!rawAnalysis) return [];
  try {
    const parsed = JSON.parse(rawAnalysis);
    const photos = parsed?.googleBusiness?.photos;
    if (!Array.isArray(photos)) return [];
    return photos
      .filter((p) => p?.ref)
      .map((p) => ({
        url: `/api/google/photo?ref=${encodeURIComponent(p.ref)}&maxwidth=1600`,
        attributions: Array.isArray(p.attributions) ? p.attributions : [],
      }));
  } catch {
    return [];
  }
}

function buildFallbackHtml(
  prospect: any,
  reviews: string,
  googlePhotos: { url: string; attributions: string[] }[]
): string {
  const company = prospect.company || "Entreprise";
  const sector = prospect.sector || "Commerce/Service";
  const address = prospect.address || "Adresse non renseignée";
  const city = prospect.city || "";
  const phone = prospect.phone || "Téléphone non renseigné";
  const heroImage = googlePhotos[0]?.url || "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop";
  const gallery = googlePhotos.slice(0, 6);
  const credits = googlePhotos.flatMap((p) => p.attributions || []);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${company} — ${sector}</title>
  <meta name="description" content="${company} — ${sector}. ${city}".trim() />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { --brand:#0f172a; --accent:#22c55e; --bg:#f8fafc; }
  </style>
</head>
<body class="bg-[var(--bg)] text-slate-900">
  <header class="px-6 py-5 border-b border-slate-200 bg-white/80 backdrop-blur">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="font-semibold text-lg">${company}</div>
      <nav class="hidden md:flex gap-6 text-sm text-slate-600">
        <a href="#about" class="hover:text-slate-900">À propos</a>
        <a href="#services" class="hover:text-slate-900">Services</a>
        <a href="#contact" class="hover:text-slate-900">Contact</a>
      </nav>
      <a href="#contact" class="px-4 py-2 rounded-full bg-[var(--brand)] text-white text-sm">Nous contacter</a>
    </div>
  </header>

  <section class="relative overflow-hidden">
    <img src="${heroImage}" alt="${company}" class="absolute inset-0 w-full h-full object-cover opacity-80"/>
    <div class="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-slate-900/20"></div>
    <div class="relative max-w-6xl mx-auto px-6 py-24 text-white">
      <span class="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-xs">Professionnel & fiable</span>
      <h1 class="mt-4 text-4xl md:text-5xl font-semibold">${company}</h1>
      <p class="mt-4 max-w-2xl text-white/90">${sector} — ${city}</p>
      <div class="mt-6 flex gap-3">
        <a href="#contact" class="px-5 py-3 rounded-full bg-[var(--accent)] text-slate-900 font-medium">Demander un devis</a>
        <a href="#services" class="px-5 py-3 rounded-full border border-white/50">Voir les services</a>
      </div>
    </div>
  </section>

  <section id="about" class="max-w-6xl mx-auto px-6 py-16">
    <h2 class="text-2xl font-semibold">À propos</h2>
    <p class="mt-3 text-slate-700">${company} est spécialisé dans ${sector.toLowerCase()}. Nous mettons l'accent sur la qualité, la transparence et un service client irréprochable.</p>
  </section>

  <section id="services" class="bg-white">
    <div class="max-w-6xl mx-auto px-6 py-16">
      <h2 class="text-2xl font-semibold">Nos services</h2>
      <div class="mt-8 grid md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 class="font-medium">Conseil</h3>
          <p class="mt-2 text-sm text-slate-600">Analyse de vos besoins et recommandations sur-mesure.</p>
        </div>
        <div class="p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 class="font-medium">Réalisation</h3>
          <p class="mt-2 text-sm text-slate-600">Mise en oeuvre soignée avec un haut niveau d'exigence.</p>
        </div>
        <div class="p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 class="font-medium">Suivi</h3>
          <p class="mt-2 text-sm text-slate-600">Accompagnement et optimisation continue.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="max-w-6xl mx-auto px-6 py-16">
    <h2 class="text-2xl font-semibold">Galerie</h2>
    <div class="mt-6 grid md:grid-cols-3 gap-4">
      ${gallery
        .map(
          (p) =>
            `<img src="${p.url}" alt="${company}" class="w-full h-56 object-cover rounded-xl border border-slate-200"/>`
        )
        .join("")}
    </div>
  </section>

  <section id="contact" class="bg-slate-900 text-white">
    <div class="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
      <div>
        <h2 class="text-2xl font-semibold">Contact</h2>
        <p class="mt-3 text-white/80">${address} ${city}</p>
        <p class="mt-1 text-white/80">${phone}</p>
        ${reviews ? `<p class="mt-4 text-white/80">${reviews}</p>` : ""}
      </div>
      <div class="bg-white/10 rounded-2xl h-56 flex items-center justify-center text-white/60">
        Google Maps
      </div>
    </div>
  </section>

  ${
    credits.length
      ? `<section class="max-w-6xl mx-auto px-6 py-10 text-xs text-slate-500">
          <h2 class="font-medium">Crédits photo</h2>
          <div class="mt-2 space-y-1">
            ${credits.map((c) => `<div>${c}</div>`).join("")}
          </div>
        </section>`
      : ""
  }

  <footer class="px-6 py-8 text-center text-sm text-slate-500">© ${new Date().getFullYear()} ${company}. Tous droits réservés.</footer>
</body>
</html>`;
}
