// Test script for bed and breakfast template generation
function detectTemplate(sector) {
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

function getPromptForTemplate(template, prospect, reviews) {
  const baseInfo = `INFORMATIONS DE L'ENTREPRISE:
- Nom: ${prospect.company}
- Secteur: ${prospect.sector || "Commerce/Service"}
- Adresse: ${prospect.address || "Non renseignée"}
- Ville: ${prospect.city || ""}
- Téléphone: ${prospect.phone || "Non renseigné"}
- ${reviews}`;

  if (template === "bed_and_breakfast") {
    return `Génère un site web vitrine one-page COMPLET en HTML avec Tailwind CSS (via CDN) pour une CHAMBRE D'HÔTE.
Le site doit être professionnel, moderne, responsive et prêt à être déployé, inspiré du style élégant et chaleureux de La Châtaigneraie.

${baseInfo}

TEMPLATE DESIGN (INSPIRÉ DE LA CHÂTAIGNERAIE):
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

STRUCTURE DU SITE (UNE PAGE COMPLÈTE):
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
- Images: placeholders ou URLs génériques (pas de vraies images)
- Texte entièrement en français
- SEO optimisé (meta title, description, etc.)

RENVOIE UNIQUEMENT le code HTML complet, rien d'autre.`;
  }

  // Default business template
  return `Génère un site web vitrine one-page COMPLET en HTML avec Tailwind CSS (via CDN).
Le site doit être professionnel, moderne, responsive et prêt à être déployé.

${baseInfo}

TEMPLATE: ${template}

STRUCTURE DU SITE:
1. Header avec nom de l'entreprise et navigation simple
2. Hero section avec un titre accrocheur adapté au secteur, un sous-titre et un CTA "Nous contacter"
3. Section "À propos" avec texte descriptif adapté au secteur
4. Section "Nos services" / "Notre carte" (adapté au secteur) avec 4-6 items
5. Section "Avis clients" si des avis Google sont disponibles
6. Section "Contact" avec adresse, téléphone, et une Google Maps embed placeholder
7. Footer avec copyright et liens

CONTRAINTES:
- Utilise Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Palette de couleurs professionnelle adaptée au secteur
- Icônes via Lucide CDN ou emojis
- Texte en français
- HTML complet avec <!DOCTYPE html>, <head>, <body>
- Pas de JavaScript complexe, juste du HTML/CSS
- Le site doit être visuellement impressionnant et inspirer confiance
- Ajoute des transitions et hover effects Tailwind
- Font: Inter via Google Fonts

RENVOIE UNIQUEMENT le code HTML complet, rien d'autre. Pas de markdown, pas de backticks.`;
}

// Test the template detection
console.log('Testing template detection:');
console.log('chambre d\'hôte ->', detectTemplate("chambre d'hôte"));
console.log('bed and breakfast ->', detectTemplate("bed and breakfast"));
console.log('gîte rural ->', detectTemplate("gîte rural"));
console.log('restaurant ->', detectTemplate("restaurant"));
console.log('coiffeur ->', detectTemplate("coiffeur"));

// Test the prompt generation
const testProspect = {
  company: "Chambres d'Hôtes Les Roses",
  sector: "chambre d'hôte",
  address: "15 Rue des Fleurs",
  city: "Provence",
  phone: "04 90 12 34 56"
};

const reviews = "Note Google: 4.8/5 (45 avis)";

const template = detectTemplate(testProspect.sector);
const prompt = getPromptForTemplate(template, testProspect, reviews);

console.log('\nTemplate detected:', template);
console.log('\nPrompt length:', prompt.length);
console.log('\nPrompt preview:');
console.log(prompt.substring(0, 1000) + '...');