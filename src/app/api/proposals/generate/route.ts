import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/gemini";
import { buildTheme } from "@/lib/presentations/theme";
import { populateSlideFromAI, updatePageNumbers } from "@/lib/presentations/layouts";
import { presentationToHtml } from "@/lib/presentations/render-html";
import { proposalToHtml } from "@/lib/presentations/render-proposal";
import type { AISlidePayload, SlideFormat, ThemePreset } from "@/lib/presentations/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    prospectId,
    brandProfileId,
    prompt,
    proposalId,
    targetSlides,
    format: rawFormat,
    themePreset: rawPreset,
  } = body;

  if (!brandProfileId || !prompt) {
    return NextResponse.json({ error: "brandProfileId and prompt required" }, { status: 400 });
  }

  const format: SlideFormat = rawFormat === "A4" ? "A4" : "16:9";
  const themePreset: ThemePreset = ["modern", "corporate", "creative", "minimal", "techvisor"].includes(rawPreset) ? rawPreset : "techvisor";

  const [brand, prospect] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { id: brandProfileId } }),
    prospectId ? prisma.prospect.findUnique({ where: { id: prospectId } }) : Promise.resolve(null),
  ]);

  if (!brand) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  const theme = buildTheme(
    {
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      logoUrl: brand.logoUrl,
      companyName: brand.name,
    },
    themePreset,
  );

  const clientBlock = prospect
    ? `CLIENT:\n- Nom: ${prospect.company}\n- Secteur: ${prospect.sector || ""}\n- Ville: ${prospect.city || ""}\n- Site: ${prospect.siteUrl || ""}`
    : "CLIENT: non fourni";

  const requestedSlides = Number.isFinite(Number(targetSlides)) ? Number(targetSlides) : null;
  const resolvedSlides = clampSlides(requestedSlides ?? extractSlideCount(prompt) ?? 14);

  const jsonPrompt = `Tu dois générer une présentation commerciale COMPLÈTE et PROFESSIONNELLE sous forme d'un tableau JSON.

${clientBlock}

BRAND:
- Nom: ${brand.name}

BRIEF DE L'UTILISATEUR:
${prompt}

NOMBRE DE SLIDES: EXACTEMENT ${resolvedSlides} slides.

STRUCTURE ATTENDUE — chaque slide est un objet JSON:
{
  "layout": string,
  "background": { "type": "solid"|"gradient", "color": "#hex", "gradientFrom": "#hex", "gradientTo": "#hex" },
  "elements": [
    { "type": "heading"|"subheading"|"body"|"bulletList"|"stat"|"quote"|"image", "content": "texte riche", "statValue": "95%", "statLabel": "Description du chiffre", "imageUrl": "" }
  ],
  "notes": "notes du présentateur"
}

LAYOUTS DISPONIBLES ET ÉLÉMENTS ATTENDUS PAR LAYOUT:

1. "cover" (couverture) → éléments: 1 subheading (surtitre), 1 heading (titre principal), 1 body (description)
2. "section" (page de séparation) → éléments: 1 heading (titre de section)
3. "titleContent" (titre + contenu) → éléments: 1 heading, 1 body (paragraphe de 3-5 phrases MINIMUM, ou 1 bulletList avec 4-6 points)
4. "twoColumns" (deux colonnes) → éléments: 1 heading, 2 body (chaque colonne doit avoir 3-5 phrases)
5. "imageLeft" (image + texte) → éléments: 1 image (imageUrl vide), 1 heading, 1 body (3-5 phrases)
6. "imageRight" (texte + image) → éléments: 1 heading, 1 body (3-5 phrases), 1 image (imageUrl vide)
7. "fullImage" (image plein écran) → éléments: 1 image, 1 heading, 1 body
8. "stats" (chiffres clés) → éléments: 1 heading, 3 stat (OBLIGATOIRE: statValue ET statLabel pour chaque stat)
9. "quote" (citation/témoignage) → éléments: 1 quote (citation entre guillemets), 1 body (attribution: nom, titre, entreprise)
10. "closing" (conclusion) → éléments: 1 heading, 1 body (coordonnées, appel à l'action)

IMPÉRATIF — QUALITÉ DU CONTENU:
- Chaque texte body DOIT contenir 3 à 5 phrases développées minimum, PAS de phrases courtes isolées
- Chaque bulletList DOIT avoir 4 à 6 points détaillés, séparés par des \\n, chaque point fait 1-2 phrases
- Les headings doivent être percutants et spécifiques au contexte du client (PAS de titres génériques comme "Notre offre")
- Les stats doivent être réalistes, chiffrés et pertinents pour le secteur du client
- Les citations/témoignages doivent sembler authentiques avec un nom, titre et entreprise crédibles
- Le contenu doit être CONCRET et SPÉCIFIQUE au brief, pas des placeholders

PLAN DE LA PRÉSENTATION (à adapter au brief):
Slide 1: cover (couverture personnalisée avec le nom du client)
Slide 2: titleContent ou section (sommaire / agenda de la présentation)
Slide 3: titleContent (contexte du marché / enjeux du client)
Slide 4: titleContent ou twoColumns (problématiques identifiées)
Slide 5: section (transition vers la solution)
Slide 6: titleContent ou imageRight (présentation de la solution / proposition de valeur)
Slide 7: twoColumns ou titleContent (détail de l'offre / méthodologie)
Slide 8: titleContent ou imageLeft (fonctionnalités / avantages clés)
Slide 9: stats (chiffres clés / résultats attendus)
Slide 10: twoColumns (avantages compétitifs / comparaison)
Slide 11: quote (témoignage client)
Slide 12: titleContent (planning / roadmap de mise en œuvre)
Slide 13: titleContent ou twoColumns (investissement / tarification)
Slide 14: closing (prochaine étape + coordonnées)

Tu peux ajuster ce plan selon le brief, mais garde cette richesse et cette exhaustivité.
Si le brief mentionne un secteur spécifique, adapte tout le vocabulaire et les exemples à ce secteur.

EXEMPLE de body riche:
"Notre approche repose sur une méthodologie éprouvée en trois phases. La première phase d'audit nous permet d'identifier précisément vos points de friction et vos opportunités de croissance. Nous analysons votre positionnement actuel, votre parcours client et vos indicateurs de performance. La deuxième phase consiste à concevoir une stratégie sur mesure, validée avec vos équipes. Enfin, la phase de déploiement s'accompagne d'un suivi hebdomadaire et d'ajustements continus pour garantir l'atteinte de vos objectifs."

EXEMPLE de bulletList riche:
"• Audit complet de votre positionnement digital et de vos canaux d'acquisition actuels\\n• Conception d'une stratégie omnicanale adaptée à votre cible et votre secteur d'activité\\n• Mise en place d'outils de tracking avancés pour mesurer le ROI de chaque action\\n• Formation de vos équipes aux meilleures pratiques et aux nouveaux outils\\n• Reporting mensuel détaillé avec recommandations d'optimisation\\n• Support dédié avec un interlocuteur unique disponible sous 24h"

Retourne UNIQUEMENT le tableau JSON, sans aucune explication.`;

  const systemInstruction =
    "Tu es un directeur artistique senior spécialisé dans les présentations commerciales haut de gamme. Tu produis du contenu riche, détaillé et professionnel. Chaque slide doit avoir un contenu développé et concret. Tu ne fais JAMAIS de contenu générique ou placeholder. Tu retournes du JSON structuré impeccable.";

  let aiSlides: AISlidePayload[];
  let modelUsed = "gemini-3-pro-preview";

  try {
    aiSlides = await generateJson<AISlidePayload[]>(jsonPrompt, systemInstruction, {
      maxOutputTokens: 32768,
      temperature: 0.5,
    });
  } catch {
    // Fallback: build a basic structure
    aiSlides = buildFallbackPayload(brand.name, prospect?.company || "Client", resolvedSlides);
    modelUsed = "fallback";
  }

  // Ensure array
  if (!Array.isArray(aiSlides)) {
    aiSlides = buildFallbackPayload(brand.name, prospect?.company || "Client", resolvedSlides);
    modelUsed = "fallback";
  }

  // Convert AI payloads to full PresentationSlide objects
  const slides = updatePageNumbers(
    aiSlides.map((payload) => populateSlideFromAI(payload, theme, format))
  );

  const slidesJson = JSON.stringify(slides);

  // Also generate HTML for PDF compatibility
  const title = `Proposition - ${prospect?.company || brand.name}`;
  const proposalMeta = {
    date: new Date().toLocaleDateString('fr-FR'),
    website: 'techvisor.fr',
    email: 'contact@techvisor.fr',
    clientName: prospect?.company || undefined,
  };
  const htmlContent = proposalToHtml(slides, theme, format, title, proposalMeta);

  if (proposalId) {
    const existing = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (existing) {
      await prisma.proposalVersion.create({
        data: {
          proposalId: existing.id,
          title: existing.title,
          prompt: existing.prompt,
          htmlContent: existing.htmlContent,
          modelUsed: existing.modelUsed || null,
        },
      });
    }
    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        title,
        prompt,
        htmlContent,
        slidesJson,
        prospectId: prospectId || null,
        brandProfileId: brand.id,
        modelUsed,
        status: "draft",
      },
    });
    return NextResponse.json({
      success: true,
      proposalId: updated.id,
      slides,
      theme,
      format,
      modelUsed,
    });
  }

  const proposal = await prisma.proposal.create({
    data: {
      title,
      prompt,
      htmlContent,
      slidesJson,
      prospectId: prospectId || null,
      brandProfileId: brand.id,
      modelUsed,
      status: "draft",
    },
  });

  return NextResponse.json({
    success: true,
    proposalId: proposal.id,
    slides,
    theme,
    format,
    modelUsed,
  });
}

function extractSlideCount(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*(slides?|pages?)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 3 || n > 60) return null;
  return n;
}

function clampSlides(n: number): number {
  if (!Number.isFinite(n)) return 10;
  if (n < 3) return 3;
  if (n > 60) return 60;
  return Math.round(n);
}

function buildFallbackPayload(brandName: string, clientName: string, count: number): AISlidePayload[] {
  const base: AISlidePayload[] = [
    {
      layout: "cover",
      elements: [
        { type: "subheading", content: "Proposition commerciale" },
        { type: "heading", content: `${clientName} × ${brandName}` },
        { type: "body", content: "Une proposition sur mesure pour accélérer votre croissance et transformer vos ambitions en résultats concrets. Découvrez notre approche et nos solutions adaptées à vos enjeux." },
      ],
    },
    {
      layout: "titleContent",
      elements: [
        { type: "heading", content: "Agenda de la présentation" },
        { type: "body", content: "• Contexte et enjeux de votre marché\n• Problématiques identifiées et opportunités\n• Notre proposition de valeur et notre approche\n• Détail de l'offre et méthodologie\n• Résultats attendus et chiffres clés\n• Témoignage client\n• Planning de mise en œuvre\n• Investissement et prochaines étapes" },
      ],
    },
    {
      layout: "titleContent",
      elements: [
        { type: "heading", content: "Contexte et enjeux du marché" },
        { type: "body", content: `Le marché sur lequel évolue ${clientName} connaît des transformations profondes. La digitalisation des usages, l'évolution des attentes des consommateurs et l'intensification de la concurrence créent un environnement qui exige agilité et innovation. Les entreprises qui réussissent sont celles qui anticipent ces mutations et investissent dans des solutions adaptées à leur réalité opérationnelle. Dans ce contexte, il est essentiel d'adopter une approche structurée pour identifier les leviers de croissance les plus pertinents et les actionner efficacement.` },
      ],
    },
    {
      layout: "twoColumns",
      elements: [
        { type: "heading", content: "Problématiques identifiées" },
        { type: "body", content: "La visibilité digitale actuelle ne reflète pas la qualité de vos services. Votre présence en ligne manque de cohérence et ne génère pas suffisamment de leads qualifiés. Les canaux d'acquisition ne sont pas optimisés, ce qui entraîne un coût d'acquisition client élevé par rapport au potentiel du marché." },
        { type: "body", content: "Les processus commerciaux en place ne permettent pas de convertir efficacement les prospects en clients fidèles. L'absence d'outils de suivi et d'automatisation limite la capacité de vos équipes à se concentrer sur les actions à forte valeur ajoutée et à personnaliser l'approche commerciale." },
      ],
    },
    {
      layout: "section",
      elements: [
        { type: "heading", content: "Notre solution" },
      ],
    },
    {
      layout: "titleContent",
      elements: [
        { type: "heading", content: "Une approche sur mesure pour des résultats durables" },
        { type: "body", content: `Notre proposition repose sur une méthodologie éprouvée en trois phases, adaptée aux spécificités de ${clientName}. La première phase d'audit approfondi nous permet d'identifier précisément vos points de friction, vos forces et vos opportunités de croissance inexploitées. Nous analysons votre positionnement actuel, votre parcours client et vos indicateurs de performance avec des outils de diagnostic avancés. La deuxième phase consiste à concevoir une stratégie sur mesure, co-construite avec vos équipes pour garantir l'adhésion et la pertinence des solutions proposées. Enfin, la troisième phase de déploiement s'accompagne d'un suivi hebdomadaire, de reporting régulier et d'ajustements continus pour garantir l'atteinte de vos objectifs.` },
      ],
    },
    {
      layout: "twoColumns",
      elements: [
        { type: "heading", content: "Détail de l'offre" },
        { type: "body", content: "Notre accompagnement stratégique inclut un audit complet de votre écosystème digital, la refonte de votre stratégie d'acquisition et la mise en place d'outils de pilotage performants. Nous intervenons sur l'ensemble de votre chaîne de valeur commerciale : de la génération de leads à la fidélisation client." },
        { type: "body", content: "Côté opérationnel, nous déployons les outils nécessaires : CRM optimisé, automatisation marketing, tableaux de bord en temps réel et formation de vos équipes. Chaque action est mesurée et optimisée en continu pour maximiser votre retour sur investissement et garantir des résultats pérennes." },
      ],
    },
    {
      layout: "titleContent",
      elements: [
        { type: "heading", content: "Nos avantages compétitifs" },
        { type: "body", content: "• Expertise sectorielle approfondie avec plus de 150 projets réalisés dans des contextes similaires\n• Méthodologie data-driven : chaque décision est appuyée par des données mesurables et des KPIs clairs\n• Équipe dédiée avec un interlocuteur unique qui connaît votre dossier en profondeur\n• Flexibilité totale : notre approche modulaire s'adapte à votre rythme et à vos priorités\n• Garantie de résultats : engagement contractuel sur les indicateurs de performance convenus\n• Technologies de pointe : nous utilisons les meilleurs outils du marché, constamment mis à jour" },
      ],
    },
    {
      layout: "stats",
      elements: [
        { type: "heading", content: "Résultats attendus" },
        { type: "stat", statValue: "+45%", statLabel: "Croissance du chiffre d'affaires sur 12 mois" },
        { type: "stat", statValue: "3 mois", statLabel: "Délai pour les premiers résultats visibles" },
        { type: "stat", statValue: "95%", statLabel: "Taux de satisfaction de nos clients" },
      ],
    },
    {
      layout: "quote",
      elements: [
        { type: "quote", content: "« Grâce à leur accompagnement, nous avons doublé notre nombre de leads qualifiés en seulement 4 mois. Leur approche méthodique et leur réactivité ont fait toute la différence dans notre transformation commerciale. »" },
        { type: "body", content: "— Marie Dupont, Directrice Commerciale, TechInnovation SAS" },
      ],
    },
    {
      layout: "titleContent",
      elements: [
        { type: "heading", content: "Planning de mise en œuvre" },
        { type: "body", content: "Phase 1 — Audit & Diagnostic (Semaines 1-3) : Analyse complète de votre écosystème, entretiens parties prenantes, benchmark concurrentiel et restitution des recommandations stratégiques.\n\nPhase 2 — Conception & Validation (Semaines 4-6) : Co-construction de la stratégie avec vos équipes, définition des KPIs, choix des outils et validation du plan d'action détaillé.\n\nPhase 3 — Déploiement & Optimisation (Semaines 7-16) : Mise en place progressive des solutions, formation des équipes, lancement des campagnes et optimisation continue basée sur les premiers résultats.\n\nPhase 4 — Suivi & Pérennisation (Ongoing) : Reporting mensuel, comités de pilotage, ajustements stratégiques et accompagnement vers l'autonomie." },
      ],
    },
    {
      layout: "titleContent",
      elements: [
        { type: "heading", content: "Investissement" },
        { type: "body", content: "Notre proposition d'accompagnement est structurée en modules complémentaires pour s'adapter à votre budget et vos priorités. L'investissement total couvre l'ensemble des prestations détaillées précédemment : audit stratégique, conception, déploiement opérationnel, formation et suivi.\n\nNous proposons un modèle de tarification transparent avec un forfait mensuel qui inclut l'ensemble des prestations. Un engagement de performance est intégré au contrat : si les objectifs convenus ne sont pas atteints, nous prolongeons notre accompagnement sans surcoût.\n\nLe détail chiffré vous sera communiqué lors de notre prochain échange, après ajustement aux spécificités de votre projet." },
      ],
    },
    {
      layout: "closing",
      elements: [
        { type: "heading", content: "Prochaine étape" },
        { type: "body", content: `Planifions un échange de 30 minutes pour affiner cette proposition ensemble et répondre à toutes vos questions.\n\n${brandName}\ncontact@${brandName.toLowerCase().replace(/\s+/g, '')}.fr · +33 1 23 45 67 89` },
      ],
    },
  ];

  // Trim or extend to match target count
  while (base.length > count) base.splice(base.length - 2, 1);
  while (base.length < count) {
    base.splice(base.length - 1, 0, {
      layout: "titleContent",
      elements: [
        { type: "heading", content: `Approfondissement — Point ${base.length - 1}` },
        { type: "body", content: `Ce volet complémentaire permet d'approfondir un aspect spécifique de notre proposition. Nous adaptons systématiquement nos recommandations au contexte opérationnel de ${clientName}, en tenant compte des contraintes budgétaires, organisationnelles et temporelles. Notre objectif est de vous fournir une vision claire et actionnable des étapes à suivre pour atteindre vos objectifs de croissance.` },
      ],
    });
  }

  return base;
}
