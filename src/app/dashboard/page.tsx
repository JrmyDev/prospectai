"use client";

import { useEffect, useState } from "react";
import { Users, Search, Mail, TrendingUp, Globe, Star, Phone, XCircle } from "lucide-react";

interface Stats {
  totalProspects: number;
  funnel: {
    scraped: number;
    analyzed: number;
    siteGenerated: number;
    emailSent: number;
    replied: number;
    converted: number;
  };
  status: {
    nonInteresse: number;
  };
  calls: {
    total: number;
  };
  bySource: { source: string; count: number }[];
  bySector: { sector: string; count: number }[];
  byCity: { city: string; count: number }[];
  emails: { draft: number; approved: number; sent: number; replied: number };
  recentJobs: { id: string; type: string; status: string; resultsCount: number; createdAt: string }[];
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  if (!stats) {
    return <div className="text-gray-400">Erreur de chargement</div>;
  }

  const cards = [
    { label: "Prospects", value: stats.totalProspects, icon: Users, color: "blue" },
    { label: "Analysés", value: stats.funnel.analyzed, icon: Search, color: "purple" },
    { label: "Sites générés", value: stats.funnel.siteGenerated, icon: Globe, color: "green" },
    { label: "Emails envoyés", value: stats.funnel.emailSent, icon: Mail, color: "orange" },
    { label: "Appels", value: stats.calls.total, icon: Phone, color: "cyan" },
    { label: "Réponses", value: stats.funnel.replied, icon: TrendingUp, color: "emerald" },
    { label: "Non intéressés", value: stats.status.nonInteresse, icon: XCircle, color: "red" },
    { label: "Convertis", value: stats.funnel.converted, icon: Star, color: "yellow" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Vue d&apos;ensemble</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 text-${card.color}-400`} />
              <span className="text-xs text-gray-400">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Funnel de conversion</h2>
        <div className="flex items-end gap-2 h-40">
          {Object.entries(stats.funnel).map(([key, value]) => {
            const maxVal = Math.max(...Object.values(stats.funnel), 1);
            const height = (value / maxVal) * 100;
            const labels: Record<string, string> = {
              scraped: "Scrapés",
              analyzed: "Analysés",
              siteGenerated: "Sites",
              emailSent: "Emails",
              replied: "Réponses",
              converted: "Convertis",
            };
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">{value}</span>
                <div
                  className="w-full bg-blue-600 rounded-t-md transition-all"
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className="text-xs text-gray-500">{labels[key]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Source */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Par source</h2>
          <div className="space-y-3">
            {stats.bySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{s.source.replace(/_/g, " ")}</span>
                <span className="text-sm font-medium text-white">{s.count}</span>
              </div>
            ))}
            {stats.bySource.length === 0 && <p className="text-sm text-gray-500">Aucun prospect</p>}
          </div>
        </div>

        {/* Top Sectors */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top secteurs</h2>
          <div className="space-y-3">
            {stats.bySector.slice(0, 8).map((s) => (
              <div key={s.sector} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{s.sector}</span>
                <span className="text-sm font-medium text-white">{s.count}</span>
              </div>
            ))}
            {stats.bySector.length === 0 && <p className="text-sm text-gray-500">Aucun prospect</p>}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top villes</h2>
          <div className="space-y-3">
            {stats.byCity.slice(0, 8).map((c) => (
              <div key={c.city} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{c.city}</span>
                <span className="text-sm font-medium text-white">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Jobs récents</h2>
          <div className="space-y-3">
            {stats.recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-300">{job.type.replace(/_/g, " ")}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    job.status === "completed" ? "bg-green-900/50 text-green-400" :
                    job.status === "running" ? "bg-blue-900/50 text-blue-400" :
                    job.status === "failed" ? "bg-red-900/50 text-red-400" :
                    "bg-gray-800 text-gray-400"
                  }`}>
                    {job.status}
                  </span>
                </div>
                <span className="text-sm text-gray-400">{job.resultsCount} résultats</span>
              </div>
            ))}
            {stats.recentJobs.length === 0 && <p className="text-sm text-gray-500">Aucun job</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
