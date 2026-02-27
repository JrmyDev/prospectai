"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Play, Loader2, MapPin, CheckCircle2, XCircle, Globe, Navigation, ChevronDown } from "lucide-react";

interface ScrapingJob {
  id: string;
  type: string;
  params: string;
  status: string;
  resultsCount: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CitySuggestion {
  label: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  query: string;
  keywords: string[];
  type?: string;
}

interface CategoryGroup {
  label: string;
  categories: Category[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Restauration & Food",
    categories: [
      { id: "restaurant", label: "Restaurant", icon: "🍽️", query: "restaurant", keywords: [], type: "restaurant" },
      { id: "boulangerie", label: "Boulangerie", icon: "🥖", query: "boulangerie", keywords: ["pâtisserie"], type: "bakery" },
      { id: "traiteur", label: "Traiteur", icon: "🍱", query: "traiteur", keywords: ["catering"] },
      { id: "bar", label: "Bar / Pub", icon: "🍺", query: "bar", keywords: ["pub", "brasserie"], type: "bar" },
      { id: "cafe", label: "Café / Salon de thé", icon: "☕", query: "café salon de thé", keywords: [], type: "cafe" },
      { id: "pizzeria", label: "Pizzeria", icon: "🍕", query: "pizzeria", keywords: [] },
      { id: "boucherie", label: "Boucherie / Charcuterie", icon: "🥩", query: "boucherie charcuterie", keywords: [] },
    ],
  },
  {
    label: "Hébergement & Tourisme",
    categories: [
      { id: "hotel", label: "Hôtel", icon: "🏨", query: "hôtel", keywords: [], type: "lodging" },
      { id: "chambre_hote", label: "Chambre d'hôtes", icon: "🛏️", query: "chambre d'hôtes", keywords: ["bed and breakfast", "maison d'hôtes"] },
      { id: "gite", label: "Gîte / Location", icon: "🏡", query: "gîte", keywords: ["location vacances", "meublé de tourisme", "gîte rural"] },
      { id: "camping", label: "Camping", icon: "⛺", query: "camping", keywords: ["mobil-home", "emplacement"], type: "campground" },
      { id: "airbnb_like", label: "Hébergement indépendant", icon: "🏠", query: "hébergement touristique", keywords: ["location saisonnière", "airbnb", "gîte de charme", "lodge"] },
      { id: "agence_voyage", label: "Agence de voyage", icon: "✈️", query: "agence de voyage", keywords: [], type: "travel_agency" },
    ],
  },
  {
    label: "Artisans & BTP",
    categories: [
      { id: "plombier", label: "Plombier", icon: "🔧", query: "plombier", keywords: ["plomberie", "chauffagiste"] },
      { id: "electricien", label: "Électricien", icon: "⚡", query: "électricien", keywords: ["installation électrique"] },
      { id: "menuisier", label: "Menuisier", icon: "🪚", query: "menuisier", keywords: ["ébéniste", "charpentier"] },
      { id: "peintre", label: "Peintre", icon: "🎨", query: "peintre en bâtiment", keywords: ["décorateur"] },
      { id: "maçon", label: "Maçon", icon: "🧱", query: "maçon", keywords: ["entreprise de maçonnerie"] },
      { id: "couvreur", label: "Couvreur", icon: "🏗️", query: "couvreur", keywords: ["toiture", "zingueur"] },
      { id: "carreleur", label: "Carreleur", icon: "🔲", query: "carreleur", keywords: ["pose carrelage"] },
      { id: "serrurier", label: "Serrurier", icon: "🔑", query: "serrurier", keywords: [] },
      { id: "paysagiste", label: "Paysagiste", icon: "🌳", query: "paysagiste", keywords: ["jardinier", "entretien espace vert"] },
    ],
  },
  {
    label: "Beauté & Bien-être",
    categories: [
      { id: "coiffeur", label: "Coiffeur", icon: "💇", query: "coiffeur", keywords: ["salon de coiffure"], type: "hair_care" },
      { id: "esthetique", label: "Institut de beauté", icon: "💅", query: "institut de beauté", keywords: ["esthéticienne", "soins du visage"], type: "beauty_salon" },
      { id: "spa", label: "Spa / Massage", icon: "🧖", query: "spa massage", keywords: ["bien-être", "relaxation"], type: "spa" },
      { id: "barbier", label: "Barbier", icon: "✂️", query: "barbier", keywords: ["barber shop"] },
    ],
  },
  {
    label: "Santé",
    categories: [
      { id: "dentiste", label: "Dentiste", icon: "🦷", query: "dentiste", keywords: ["cabinet dentaire"], type: "dentist" },
      { id: "kine", label: "Kinésithérapeute", icon: "🏃", query: "kinésithérapeute", keywords: ["kiné", "rééducation"] },
      { id: "opticien", label: "Opticien", icon: "👓", query: "opticien", keywords: ["lunettes"] },
      { id: "veterinaire", label: "Vétérinaire", icon: "🐾", query: "vétérinaire", keywords: ["clinique vétérinaire"] },
      { id: "pharmacie", label: "Pharmacie", icon: "💊", query: "pharmacie", keywords: [] },
    ],
  },
  {
    label: "Commerce & Services",
    categories: [
      { id: "fleuriste", label: "Fleuriste", icon: "🌸", query: "fleuriste", keywords: [], type: "florist" },
      { id: "immobilier", label: "Agence immobilière", icon: "🏢", query: "agence immobilière", keywords: [], type: "real_estate_agency" },
      { id: "garage", label: "Garage auto", icon: "🔧", query: "garage automobile", keywords: ["réparation auto", "mécanique"], type: "car_repair" },
      { id: "photographe", label: "Photographe", icon: "📷", query: "photographe", keywords: ["studio photo"] },
      { id: "pressing", label: "Pressing / Laverie", icon: "👔", query: "pressing laverie", keywords: ["nettoyage à sec"] },
      { id: "demenageur", label: "Déménageur", icon: "📦", query: "déménageur", keywords: ["déménagement"] },
    ],
  },
  {
    label: "Professions libérales",
    categories: [
      { id: "avocat", label: "Avocat", icon: "⚖️", query: "avocat", keywords: ["cabinet d'avocats"], type: "lawyer" },
      { id: "comptable", label: "Comptable", icon: "📊", query: "expert-comptable", keywords: ["cabinet comptable"], type: "accounting" },
      { id: "architecte", label: "Architecte", icon: "📐", query: "architecte", keywords: ["cabinet d'architecture"] },
      { id: "notaire", label: "Notaire", icon: "📜", query: "notaire", keywords: ["office notarial"] },
    ],
  },
  {
    label: "Sport & Loisirs",
    categories: [
      { id: "salle_sport", label: "Salle de sport", icon: "🏋️", query: "salle de sport", keywords: ["fitness", "musculation"], type: "gym" },
      { id: "yoga", label: "Yoga / Pilates", icon: "🧘", query: "yoga pilates", keywords: ["studio yoga"] },
      { id: "danse", label: "École de danse", icon: "💃", query: "école de danse", keywords: ["cours de danse"] },
      { id: "auto_ecole", label: "Auto-école", icon: "🚗", query: "auto-école", keywords: ["permis de conduire"] },
    ],
  },
];

const SCOPE_OPTIONS = [
  { value: "nearby", label: "Autour de la ville", icon: Navigation, description: "Recherche locale par rayon" },
  { value: "text", label: "Ville + alentours larges", icon: MapPin, description: "Recherche texte centrée sur la ville" },
  { value: "france", label: "Toute la France", icon: Globe, description: "Recherche nationale (Text Search)" },
];

const SOURCE_OPTIONS = [
  { value: "google_places", label: "Google Maps", description: "Recherche locale par catégorie et zone" },
  { value: "pappers", label: "Pappers (SIRET)", description: "Données légales entreprises françaises" },
  { value: "google_search", label: "Google Search", description: "Recherche web ciblée via SerpAPI" },
];

export default function ScrapingPage() {
  const [sources, setSources] = useState<string[]>(["google_places"]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [customQuery, setCustomQuery] = useState("");
  const [city, setCity] = useState("Marches");
  const [cityInput, setCityInput] = useState("Marches, 26300");
  const [cityLocation, setCityLocation] = useState<{ lat: number; lng: number }>({ lat: 44.7218, lng: 5.3838 });
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [radius, setRadius] = useState(10000);
  const [scope, setScope] = useState("nearby");
  const [codePostal, setCodePostal] = useState("26300");
  const [departement, setDepartement] = useState("26");
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0, label: "" });
  const [result, setResult] = useState<Record<string, { success: boolean; newProspects?: number; error?: string }> | null>(null);
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Restauration & Food");
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    fetchJobs();
  }, []);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchJobs = async () => {
    const res = await fetch("/api/scraping/run");
    if (res.ok) setJobs(await res.json());
  };

  const searchCities = useCallback(async (input: string) => {
    if (input.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/scraping/autocomplete?q=${encodeURIComponent(input)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch { /* ignore */ }
  }, []);

  const handleCityInput = (value: string) => {
    setCityInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(value), 300);
  };

  const selectCity = (s: CitySuggestion) => {
    setCity(s.city);
    setCityInput(s.label);
    setCityLocation({ lat: s.lat, lng: s.lng });
    setCodePostal(s.postalCode);
    setShowSuggestions(false);
  };

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.id === cat.id);
      if (exists) return prev.filter((c) => c.id !== cat.id);
      return [...prev, cat];
    });
    setCustomQuery("");
  };

  const toggleGroup = (group: CategoryGroup) => {
    setSelectedCategories((prev) => {
      const groupIds = new Set(group.categories.map((c) => c.id));
      const allSelected = group.categories.every((c) => prev.some((p) => p.id === c.id));
      if (allSelected) return prev.filter((c) => !groupIds.has(c.id));
      const withoutGroup = prev.filter((c) => !groupIds.has(c.id));
      return [...withoutGroup, ...group.categories];
    });
    setCustomQuery("");
  };

  const isGroupFullySelected = (group: CategoryGroup) =>
    group.categories.every((c) => selectedCategories.some((s) => s.id === c.id));

  const isGroupPartiallySelected = (group: CategoryGroup) =>
    group.categories.some((c) => selectedCategories.some((s) => s.id === c.id)) && !isGroupFullySelected(group);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);

    const categoriesToRun = selectedCategories.length > 0 ? selectedCategories : (customQuery ? [{ id: "_custom", label: customQuery, icon: "", query: customQuery, keywords: [] }] : []);
    if (categoriesToRun.length === 0) { setRunning(false); return; }

    const allResults: Record<string, { success: boolean; newProspects?: number; error?: string }> = {};
    setRunProgress({ current: 0, total: categoriesToRun.length, label: "" });

    for (let i = 0; i < categoriesToRun.length; i++) {
      const cat = categoriesToRun[i];
      setRunProgress({ current: i + 1, total: categoriesToRun.length, label: cat.label });

      try {
        const res = await fetch("/api/scraping/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sources,
            query: cat.query,
            keywords: cat.keywords,
            city,
            location: cityLocation,
            radius,
            mode: scope,
            type: cat.type,
            codePostal,
            departement,
          }),
        });
        const data = await res.json();
        const key = cat.label || cat.query;
        const srcResults = data.results || {};
        const totalNew = Object.values(srcResults as Record<string, { newProspects?: number }>).reduce((s, r) => s + (r.newProspects || 0), 0);
        const anyFailed = Object.values(srcResults as Record<string, { success: boolean }>).some((r) => !r.success);
        allResults[key] = { success: !anyFailed, newProspects: totalNew };
      } catch (error) {
        allResults[cat.label || cat.query] = { success: false, error: String(error) };
      }
    }

    setResult(allResults);
    setRunProgress({ current: 0, total: 0, label: "" });
    await fetchJobs();
    setRunning(false);
  };

  const toggleSource = (source: string) => {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const hasQuery = selectedCategories.length > 0 || customQuery.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Scraping</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 max-h-[calc(100vh-160px)] overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Catégories</h2>

          {/* Custom query */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={customQuery}
                onChange={(e) => { setCustomQuery(e.target.value); setSelectedCategories([]); }}
                placeholder="Recherche libre..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Selection summary */}
          {selectedCategories.length > 0 && (
            <div className="mb-3 flex items-center justify-between px-2 py-1.5 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <span className="text-xs text-blue-300">{selectedCategories.length} catégorie{selectedCategories.length > 1 ? "s" : ""}</span>
              <button
                onClick={() => setSelectedCategories([])}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >Tout effacer</button>
            </div>
          )}

          {/* Category groups */}
          {CATEGORY_GROUPS.map((group) => {
            const fullySelected = isGroupFullySelected(group);
            const partiallySelected = isGroupPartiallySelected(group);
            return (
            <div key={group.label} className="mb-1">
              <div className="flex items-center">
                <button
                  onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                  className="flex-1 flex items-center justify-between px-2 py-2 text-sm text-gray-300 hover:text-white rounded transition-colors"
                >
                  <span className="font-medium">{group.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedGroup === group.label ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => toggleGroup(group)}
                  title={fullySelected ? "Tout désélectionner" : "Tout sélectionner"}
                  className={`shrink-0 ml-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    fullySelected
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : partiallySelected
                        ? "bg-blue-600/40 text-blue-300 hover:bg-blue-600"
                        : "bg-gray-800 text-gray-500 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {fullySelected ? "✓ Tout" : "Tout"}
                </button>
              </div>
              {expandedGroup === group.label && (
                <div className="grid grid-cols-2 gap-1 pb-2">
                  {group.categories.map((cat) => {
                    const isSelected = selectedCategories.some((c) => c.id === cat.id);
                    return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>

            {/* Active query display */}
            {hasQuery && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <span className="text-xs text-blue-400">
                  {selectedCategories.length > 0
                    ? `${selectedCategories.length} catégorie${selectedCategories.length > 1 ? "s" : ""} sélectionnée${selectedCategories.length > 1 ? "s" : ""}`
                    : "Recherche libre"}
                </span>
                {selectedCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedCategories.map((cat) => (
                      <span key={cat.id} className="inline-flex items-center gap-1 text-xs bg-blue-600/30 text-blue-200 px-1.5 py-0.5 rounded">
                        {cat.icon} {cat.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white font-medium mt-0.5">{customQuery}</p>
                )}
              </div>
            )}

            {/* Scope */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Périmètre</label>
              <div className="space-y-1.5">
                {SCOPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      scope === opt.value ? "bg-blue-900/20 border border-blue-500/30" : "bg-gray-800/50 border border-transparent hover:border-gray-700"
                    }`}>
                      <input
                        type="radio"
                        name="scope"
                        checked={scope === opt.value}
                        onChange={() => setScope(opt.value)}
                        className="sr-only"
                      />
                      <Icon className={`w-4 h-4 ${scope === opt.value ? "text-blue-400" : "text-gray-500"}`} />
                      <div>
                        <span className="text-sm font-medium text-white">{opt.label}</span>
                        <p className="text-xs text-gray-500">{opt.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* City (hidden for France-wide) */}
            {scope !== "france" && (
              <div className="mb-4 relative" ref={suggestionsRef}>
                <label className="block text-sm text-gray-400 mb-2">Ville</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => handleCityInput(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Tapez une ville..."
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.placeId}
                        onClick={() => selectCity(s)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                      >
                        <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Radius (only for nearby) */}
            {scope === "nearby" && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Rayon</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                  <option value={20000}>20 km</option>
                  <option value={50000}>50 km</option>
                </select>
              </div>
            )}

            {/* Sources */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Sources</label>
              <div className="space-y-1.5">
                {SOURCE_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    sources.includes(opt.value) ? "bg-gray-800 border border-gray-600" : "bg-gray-800/30 border border-transparent"
                  }`}>
                    <input
                      type="checkbox"
                      checked={sources.includes(opt.value)}
                      onChange={() => toggleSource(opt.value)}
                      className="rounded border-gray-600 text-blue-500"
                    />
                    <div>
                      <span className="text-sm text-white">{opt.label}</span>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Pappers specific */}
            {sources.includes("pappers") && (
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Code postal</label>
                  <input
                    type="text"
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Département</label>
                  <input
                    type="text"
                    value={departement}
                    onChange={(e) => setDepartement(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={running || sources.length === 0 || !hasQuery}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {runProgress.total > 1 ? `${runProgress.current}/${runProgress.total} — ${runProgress.label}` : "Scraping en cours..."}</>
              ) : (
                <><Play className="w-4 h-4" /> {selectedCategories.length > 1 ? `Scraper ${selectedCategories.length} catégories` : "Lancer le scraping"}</>
              )}
            </button>

            {/* Result */}
            {result && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h3 className="text-sm font-medium text-white mb-2">Résultats</h3>
                {Object.entries(result).map(([source, res]) => (
                  <div key={source} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-300">{source.replace(/_/g, " ")}</span>
                    <span className={`text-sm ${res.success ? "text-green-400" : "text-red-400"}`}>
                      {res.success ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {res.newProspects} nouveaux
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> {res.error}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job History */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-5 max-h-[calc(100vh-160px)] overflow-y-auto">
          <h2 className="text-lg font-semibold text-white mb-4">Historique</h2>
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun job exécuté</p>
            ) : (
              jobs.map((job) => {
                let parsedParams: Record<string, string> = {};
                try { parsedParams = JSON.parse(job.params); } catch { /* ignore */ }
                return (
                  <div key={job.id} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {parsedParams.query || job.type.replace(/_/g, " ")}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        job.status === "completed" ? "bg-green-900/50 text-green-400" :
                        job.status === "running" ? "bg-blue-900/50 text-blue-400" :
                        job.status === "failed" ? "bg-red-900/50 text-red-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{job.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{job.resultsCount} résultat{job.resultsCount > 1 ? "s" : ""}</span>
                      <span>{new Date(job.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {parsedParams.city && (
                      <p className="text-xs text-gray-500 mt-0.5">{parsedParams.mode === "france" ? "France entière" : parsedParams.city}</p>
                    )}
                    {job.error && <p className="text-xs text-red-400 mt-1">{job.error}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
