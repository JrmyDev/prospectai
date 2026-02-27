"use client";

import { useEffect, useState } from "react";

interface BrandProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontGoogle: string | null;
  createdAt: string;
}

const emptyForm = {
  id: "",
  name: "",
  logoUrl: "",
  primaryColor: "",
  secondaryColor: "",
  accentColor: "",
  fontGoogle: "",
};

export default function BrandingPage() {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchProfiles = async () => {
    const res = await fetch("/api/brand-profiles");
    const data = await res.json();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      logoUrl: form.logoUrl.trim() || null,
      primaryColor: form.primaryColor.trim() || null,
      secondaryColor: form.secondaryColor.trim() || null,
      accentColor: form.accentColor.trim() || null,
      fontGoogle: form.fontGoogle.trim() || null,
    };

    if (form.id) {
      await fetch(`/api/brand-profiles/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/brand-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setForm({ ...emptyForm });
    await fetchProfiles();
    setSaving(false);
  };

  const edit = (p: BrandProfile) => {
    setForm({
      id: p.id,
      name: p.name || "",
      logoUrl: p.logoUrl || "",
      primaryColor: p.primaryColor || "",
      secondaryColor: p.secondaryColor || "",
      accentColor: p.accentColor || "",
      fontGoogle: p.fontGoogle || "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce branding ?")) return;
    await fetch(`/api/brand-profiles/${id}`, { method: "DELETE" });
    await fetchProfiles();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Branding</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">
            {form.id ? "Modifier un profil" : "Nouveau profil"}
          </h2>
          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom de marque"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
            />
            <input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="URL logo"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                placeholder="#0f172a"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              />
              <input
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                placeholder="#334155"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              />
              <input
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                placeholder="#22c55e"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              />
            </div>
            <input
              value={form.fontGoogle}
              onChange={(e) => setForm({ ...form, fontGoogle: e.target.value })}
              placeholder="Google Font (ex: Inter)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {form.id ? "Enregistrer" : "Créer"}
              </button>
              {form.id && (
                <button
                  onClick={() => setForm({ ...emptyForm })}
                  className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Profils</h2>
          {loading ? (
            <p className="text-gray-500">Chargement...</p>
          ) : profiles.length === 0 ? (
            <p className="text-gray-500">Aucun profil</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="p-4 bg-gray-800/50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{p.name}</div>
                    <div className="text-xs text-gray-400">
                      {p.fontGoogle ? `Font: ${p.fontGoogle}` : "Font: —"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {p.primaryColor && (
                        <span className="text-[10px] px-2 py-1 rounded bg-gray-700">
                          {p.primaryColor}
                        </span>
                      )}
                      {p.secondaryColor && (
                        <span className="text-[10px] px-2 py-1 rounded bg-gray-700">
                          {p.secondaryColor}
                        </span>
                      )}
                      {p.accentColor && (
                        <span className="text-[10px] px-2 py-1 rounded bg-gray-700">
                          {p.accentColor}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => edit(p)}
                      className="px-3 py-1.5 bg-gray-700 text-gray-200 text-xs rounded-lg"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="px-3 py-1.5 bg-red-900/50 text-red-300 text-xs rounded-lg"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
