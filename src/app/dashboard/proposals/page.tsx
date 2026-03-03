"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Sparkles } from "lucide-react";

interface BrandProfile {
  id: string;
  name: string;
}

interface Prospect {
  id: string;
  company: string;
  city: string | null;
  sector: string | null;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  pdfPath: string | null;
  createdAt: string;
  brandProfile: { name: string };
  prospect: { company: string } | null;
}

type SlideFormat = "16:9" | "A4";
type ThemePreset = "modern" | "corporate" | "creative" | "minimal";

export default function ProposalsPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
      <ProposalsPageContent />
    </Suspense>
  );
}

function ProposalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProspectId = searchParams.get("prospectId") || "";

  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [brandProfileId, setBrandProfileId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [prospectQuery, setProspectQuery] = useState("");
  const [prospectResults, setProspectResults] = useState<Prospect[]>([]);
  const [prospectId, setProspectId] = useState(presetProspectId);
  const [format, setFormat] = useState<SlideFormat>("16:9");
  const [themePreset, setThemePreset] = useState<ThemePreset>("modern");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    const [brandsRes, proposalsRes] = await Promise.all([
      fetch("/api/brand-profiles"),
      fetch("/api/proposals"),
    ]);
    setBrandProfiles(await brandsRes.json());
    setProposals(await proposalsRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (brandProfiles.length > 0 && !brandProfileId) {
      setBrandProfileId(brandProfiles[0].id);
    }
  }, [brandProfiles, brandProfileId]);

  const searchProspects = async () => {
    if (!prospectQuery.trim()) return;
    const res = await fetch(`/api/prospects?search=${encodeURIComponent(prospectQuery)}&limit=10`);
    const data = await res.json();
    setProspectResults(data.prospects || []);
  };

  const createProposal = async () => {
    if (!brandProfileId || !prompt.trim()) return;
    setCreating(true);
    const res = await fetch("/api/proposals/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prospectId: prospectId || null,
        brandProfileId,
        prompt,
        format,
        themePreset,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      router.push(`/dashboard/proposals/${data.proposalId}`);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Propositions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 flex items-center gap-2">
            <Plus size={14} /> Nouvelle proposition
          </h2>
          <div className="space-y-3">
            <select
              value={brandProfileId}
              onChange={(e) => setBrandProfileId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
            >
              <option value="">Choisir un branding</option>
              {brandProfiles.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={prospectQuery}
                onChange={(e) => setProspectQuery(e.target.value)}
                placeholder="Rechercher un prospect"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              />
              <button
                onClick={searchProspects}
                className="px-3 py-2 bg-gray-700 text-gray-200 text-sm rounded-lg"
              >
                Chercher
              </button>
            </div>

            {prospectResults.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 max-h-40 overflow-auto">
                {prospectResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProspectId(p.id); setProspectResults([]); }}
                    className="block w-full text-left px-2 py-1.5 text-sm text-gray-200 hover:bg-gray-700 rounded"
                  >
                    {p.company} {p.city ? `- ${p.city}` : ""}
                  </button>
                ))}
              </div>
            )}

            <input
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              placeholder="Prospect ID (optionnel)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300"
            />

            {/* Format & Theme */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Format</label>
                <div className="flex gap-1">
                  {(["16:9", "A4"] as SlideFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                        format === f
                          ? "bg-blue-600/20 border-blue-500 text-blue-400"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Style</label>
                <select
                  value={themePreset}
                  onChange={(e) => setThemePreset(e.target.value as ThemePreset)}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white"
                >
                  <option value="modern">Moderne</option>
                  <option value="corporate">Corporate</option>
                  <option value="creative">Créatif</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder="Brief: objectif, offre, budget, timeline, garanties..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
            />

            <button
              onClick={createProposal}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <Sparkles size={16} />
              {creating ? "Génération IA en cours..." : "Générer la présentation"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 flex items-center gap-2">
            <FileText size={14} /> Historique
          </h2>
          {loading ? (
            <p className="text-gray-500">Chargement...</p>
          ) : proposals.length === 0 ? (
            <p className="text-gray-500">Aucune proposition</p>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <Link key={p.id} href={`/dashboard/proposals/${p.id}`}
                  className="block p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{p.title}</div>
                      <div className="text-xs text-gray-400">
                        {p.prospect ? p.prospect.company : "Prospect: —"} · {p.brandProfile.name}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {p.status} {p.pdfPath ? "· PDF" : ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
