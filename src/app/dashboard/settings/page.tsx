"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Eye, EyeOff, Key, Mail, Globe, Sliders } from "lucide-react";

interface SettingsGroup {
  title: string;
  icon: React.ElementType;
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: "Clés API",
    icon: Key,
    fields: [
      { key: "google_places_api_key", label: "Google Places API Key", type: "password", placeholder: "AIza..." },
      { key: "pappers_api_key", label: "Pappers API Key", type: "password", placeholder: "Votre clé Pappers" },
      { key: "serpapi_key", label: "SerpAPI Key", type: "password", placeholder: "Votre clé SerpAPI" },
      { key: "gemini_api_key", label: "Gemini API Key", type: "password", placeholder: "AIza..." },
      { key: "vercel_token", label: "Vercel Token", type: "password", placeholder: "Token de déploiement Vercel" },
    ],
  },
  {
    title: "Configuration SMTP",
    icon: Mail,
    fields: [
      { key: "smtp_host", label: "Serveur SMTP", type: "text", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "Port", type: "text", placeholder: "587" },
      { key: "smtp_user", label: "Utilisateur", type: "text", placeholder: "vous@gmail.com" },
      { key: "smtp_pass", label: "Mot de passe", type: "password", placeholder: "Mot de passe SMTP" },
      { key: "smtp_from", label: "Email expéditeur", type: "text", placeholder: "Jérémy <jeremy@techvisor.fr>" },
    ],
  },
  {
    title: "Déploiement",
    icon: Globe,
    fields: [
      { key: "vercel_team_id", label: "Vercel Team ID (optionnel)", type: "text", placeholder: "team_..." },
      { key: "site_domain", label: "Domaine personnalisé", type: "text", placeholder: "demos.techvisor.fr" },
    ],
  },
  {
    title: "Scoring",
    icon: Sliders,
    fields: [
      { key: "WEIGHT_WEBSITE", label: "Poids - Site web (%)", type: "number", placeholder: "30" },
      { key: "WEIGHT_GOOGLE", label: "Poids - Google Business (%)", type: "number", placeholder: "25" },
      { key: "WEIGHT_SEO", label: "Poids - SEO (%)", type: "number", placeholder: "25" },
      { key: "WEIGHT_SOCIAL", label: "Poids - Réseaux sociaux (%)", type: "number", placeholder: "20" },
    ],
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setValues(data);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</>
          ) : saved ? (
            <><Save className="w-4 h-4" /> Sauvegardé !</>
          ) : (
            <><Save className="w-4 h-4" /> Sauvegarder</>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-blue-400" /> {group.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.type === "password" && !visibleFields.has(field.key) ? "password" : "text"}
                        value={values[field.key] || ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                      />
                      {field.type === "password" && (
                        <button
                          type="button"
                          onClick={() => toggleVisibility(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {visibleFields.has(field.key) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Note</h3>
        <p className="text-xs text-gray-500">
          Les paramètres sauvegardés ici sont prioritaires sur les variables d&apos;environnement (.env).
          Les clés API sensibles sont stockées dans la base SQLite locale et ne quittent jamais votre machine.
        </p>
      </div>
    </div>
  );
}
