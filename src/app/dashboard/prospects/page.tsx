"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Globe,
  MapPin,
  Star,
  Zap,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface Prospect {
  id: string;
  company: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  sector: string | null;
  source: string;
  siteUrl: string | null;
  status: string;
  callStatus: string | null;
  nextCallAt: string | null;
  lastCallAt: string | null;
  emailStatus: string | null;
  createdAt: string;
  analysis: {
    scoreGlobal: number;
    websiteScore: number | null;
    googleRating: number | null;
    googleReviewsCount: number | null;
    servicesRecommended: string | null;
    hasWebsite: boolean;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-gray-700 text-gray-300" },
  contacted: { label: "Contacté", color: "bg-slate-800 text-slate-300" },
  analyzed: { label: "Analysé", color: "bg-purple-900/50 text-purple-400" },
  site_generated: { label: "Site généré", color: "bg-blue-900/50 text-blue-400" },
  email_sent: { label: "Email envoyé", color: "bg-orange-900/50 text-orange-400" },
  replied: { label: "Répondu", color: "bg-emerald-900/50 text-emerald-400" },
  converted: { label: "Converti", color: "bg-yellow-900/50 text-yellow-400" },
  non_interesse: { label: "Non intéressé", color: "bg-red-900/50 text-red-400" },
  closed_definitive: { label: "Fermé définitivement", color: "bg-gray-800 text-gray-400" },
};

const callStatusLabels: Record<string, { label: string; color: string }> = {
  to_call: { label: "À appeler", color: "bg-blue-900/50 text-blue-300" },
  callback: { label: "À rappeler", color: "bg-amber-900/50 text-amber-300" },
  voicemail: { label: "Répondeur", color: "bg-gray-800 text-gray-300" },
  reached: { label: "Joint", color: "bg-emerald-900/50 text-emerald-300" },
  meeting_set: { label: "RDV pris", color: "bg-green-900/50 text-green-300" },
  not_interested: { label: "Non intéressé", color: "bg-red-900/50 text-red-300" },
};

const emailStatusLabels: Record<string, { label: string; color: string }> = {
  to_send: { label: "À envoyer", color: "bg-orange-900/50 text-orange-300" },
  sent: { label: "Envoyé", color: "bg-emerald-900/50 text-emerald-300" },
  replied: { label: "Répondu", color: "bg-blue-900/50 text-blue-300" },
  bounced: { label: "Bounce", color: "bg-red-900/50 text-red-300" },
  not_needed: { label: "Non nécessaire", color: "bg-gray-800 text-gray-300" },
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterHasWebsite, setFilterHasWebsite] = useState("false");
  const [includeNonInterested, setIncludeNonInterested] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [filterCallStatus, setFilterCallStatus] = useState("");
  const [filterCallbackDue, setFilterCallbackDue] = useState("");
  const [filterEmailStatus, setFilterEmailStatus] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());

  const fetchProspects = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "50" });
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterSource) params.set("source", filterSource);
    if (filterHasWebsite) params.set("hasWebsite", filterHasWebsite);
    if (!filterStatus) {
      const exclude: string[] = [];
      if (!includeNonInterested) exclude.push("non_interesse");
      if (!includeClosed) exclude.push("closed_definitive");
      if (exclude.length > 0) params.set("excludeStatus", exclude.join(","));
    }
    if (filterCallStatus) params.set("callStatus", filterCallStatus);
    if (filterCallbackDue) params.set("callbackDue", filterCallbackDue);
    if (filterEmailStatus) params.set("emailStatus", filterEmailStatus);

    const res = await fetch(`/api/prospects?${params}`);
    const data = await res.json();
    setProspects(data.prospects);
    setPagination(data.pagination);
    setLoading(false);
  }, [search, filterStatus, filterSource, filterHasWebsite, includeNonInterested, includeClosed, filterCallStatus, filterCallbackDue, filterEmailStatus]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const handleAnalyze = async (id: string) => {
    setAnalyzing((prev) => new Set(prev).add(id));
    try {
      await fetch("/api/analysis/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: id }),
      });
      await fetchProspects(pagination.page);
    } finally {
      setAnalyzing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBatchAnalyze = async () => {
    for (const id of selected) {
      await handleAnalyze(id);
    }
    setSelected(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    await fetch("/api/prospects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchProspects(pagination.page);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === prospects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map((p) => p.id)));
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Prospects</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBatchAnalyze}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Analyser ({selected.size})
            </button>
          )}
          <span className="text-sm text-gray-400">{pagination.total} prospects</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
        >
          <option value="">Toutes les sources</option>
          <option value="google_maps">Google Maps</option>
          <option value="pappers">Pappers</option>
          <option value="google_search">Google Search</option>
          <option value="linkedin">LinkedIn</option>
          <option value="pagejaunes">PagesJaunes</option>
        </select>
        <select
          value={filterHasWebsite}
          onChange={(e) => setFilterHasWebsite(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
        >
          <option value="">Site web ?</option>
          <option value="true">Avec site</option>
          <option value="false">Sans site</option>
        </select>
        <select
          value={filterCallStatus}
          onChange={(e) => setFilterCallStatus(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
        >
          <option value="">Statut appel</option>
          {Object.entries(callStatusLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select
          value={filterCallbackDue}
          onChange={(e) => setFilterCallbackDue(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
        >
          <option value="">Rappel</option>
          <option value="overdue">En retard</option>
          <option value="today">Aujourd'hui</option>
          <option value="tomorrow">Demain</option>
        </select>
        <select
          value={filterEmailStatus}
          onChange={(e) => setFilterEmailStatus(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
        >
          <option value="">Email</option>
          {Object.entries(emailStatusLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-300 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg">
          <input
            type="checkbox"
            checked={includeNonInterested}
            onChange={(e) => setIncludeNonInterested(e.target.checked)}
            className="rounded border-gray-600"
          />
          Inclure non intéressés
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
            className="rounded border-gray-600"
          />
          Inclure fermés
        </label>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === prospects.length && prospects.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-600"
                  />
                </th>
                <th className="p-3 text-left text-gray-400 font-medium">Entreprise</th>
                <th className="p-3 text-left text-gray-400 font-medium">Contact</th>
                <th className="p-3 text-left text-gray-400 font-medium">Ville</th>
                <th className="p-3 text-left text-gray-400 font-medium">Score</th>
                <th className="p-3 text-left text-gray-400 font-medium">Google</th>
                <th className="p-3 text-left text-gray-400 font-medium">Site</th>
                <th className="p-3 text-left text-gray-400 font-medium">Source</th>
                <th className="p-3 text-left text-gray-400 font-medium">Appel</th>
                <th className="p-3 text-left text-gray-400 font-medium">Email</th>
                <th className="p-3 text-left text-gray-400 font-medium">Action</th>
                <th className="p-3 text-left text-gray-400 font-medium">Statut</th>
                <th className="p-3 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="p-8 text-center text-gray-500">Chargement...</td></tr>
              ) : prospects.length === 0 ? (
                <tr><td colSpan={13} className="p-8 text-center text-gray-500">Aucun prospect. Lancez un scraping !</td></tr>
              ) : (
                prospects.map((p) => {
                  const services = p.analysis?.servicesRecommended
                    ? JSON.parse(p.analysis.servicesRecommended)
                    : [];
                  return (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-gray-600"
                        />
                      </td>
                      <td className="p-3">
                        <Link href={`/dashboard/prospects/${p.id}`} className="text-white font-medium hover:text-blue-400 transition-colors">
                          {p.company}
                        </Link>
                        {p.sector && <p className="text-xs text-gray-500">{p.sector}</p>}
                      </td>
                      <td className="p-3">
                        <div className="text-gray-300 text-xs">
                          {p.firstName && `${p.firstName} ${p.lastName || ""}`}
                          {p.phone && <div>{p.phone}</div>}
                          {p.email && <div className="text-blue-400">{p.email}</div>}
                        </div>
                      </td>
                      <td className="p-3">
                        {p.city && (
                          <span className="flex items-center gap-1 text-gray-300 text-xs">
                            <MapPin className="w-3 h-3" />{p.city}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.analysis ? (
                          <span className={`text-lg font-bold ${scoreColor(p.analysis.scoreGlobal)}`}>
                            {p.analysis.scoreGlobal}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.analysis?.googleRating ? (
                          <span className="flex items-center gap-1 text-xs text-gray-300">
                            <Star className="w-3 h-3 text-yellow-400" />
                            {p.analysis.googleRating} ({p.analysis.googleReviewsCount})
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.siteUrl ? (
                          <a href={p.siteUrl} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                            <Globe className="w-3 h-3" />
                            {p.analysis?.websiteScore != null && (
                              <span className={scoreColor(p.analysis.websiteScore)}>{p.analysis.websiteScore}</span>
                            )}
                          </a>
                        ) : (
                          <span className="text-xs text-red-400">Aucun</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-400">{p.source.replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-3">
                        {p.callStatus ? (
                          <div className="space-y-1">
                            <span className={`text-[10px] px-2 py-1 rounded-full ${callStatusLabels[p.callStatus]?.color || "bg-gray-700 text-gray-300"}`}>
                              {callStatusLabels[p.callStatus]?.label || p.callStatus}
                            </span>
                            {p.nextCallAt && (
                              <div className="text-[10px] text-gray-500">
                                {new Date(p.nextCallAt).toLocaleString("fr-FR")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.emailStatus ? (
                          <span className={`text-[10px] px-2 py-1 rounded-full ${emailStatusLabels[p.emailStatus]?.color || "bg-gray-700 text-gray-300"}`}>
                            {emailStatusLabels[p.emailStatus]?.label || p.emailStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.callStatus === "callback" ? (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-900/50 text-amber-300">Rappeler</span>
                        ) : p.callStatus === "to_call" ? (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-900/50 text-blue-300">Appeler</span>
                        ) : p.emailStatus === "to_send" ? (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-orange-900/50 text-orange-300">Envoyer email</span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[p.status]?.color || "bg-gray-700 text-gray-300"}`}>
                          {statusLabels[p.status]?.label || p.status}
                        </span>
                        {services.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {services.slice(0, 2).map((s: { name: string }, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/dashboard/prospects/${p.id}`}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            title="Voir détail"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleAnalyze(p.id)}
                            disabled={analyzing.has(p.id)}
                            className="p-1.5 rounded hover:bg-purple-900/50 text-gray-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                            title="Analyser"
                          >
                            <Zap className={`w-3.5 h-3.5 ${analyzing.has(p.id) ? "animate-pulse" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-800">
            <span className="text-sm text-gray-400">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchProspects(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchProspects(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
